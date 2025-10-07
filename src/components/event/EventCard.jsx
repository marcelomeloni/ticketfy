import { Link } from 'react-router-dom';
import { useMemo } from 'react';
import { ClockIcon, MapPinIcon, TicketIcon } from '@heroicons/react/24/outline';

// --- COMPONENTE DE STATUS ---
const StatusBadge = ({ status }) => {
    const styles = {
        upcoming: 'bg-blue-500/90 text-white',
        active: 'bg-green-500/90 text-white animate-pulse',
        finished: 'bg-slate-500/90 text-white',
        canceled: 'bg-red-500/90 text-white',
    };
    const text = {
        upcoming: 'Em breve',
        active: 'Ao Vivo',
        finished: 'Encerrado',
        canceled: 'Cancelado',
    };
    if (!status || !styles[status]) return null;

    return (
        <span className={`px-3 py-1.5 text-sm font-bold rounded-full ${styles[status]} backdrop-blur-sm`}>
            {text[status]}
        </span>
    );
};

// --- COMPONENTE DE ESQUELETO (LOADING STATE) ---
export const EventCardSkeleton = () => (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-lg overflow-hidden animate-pulse">
        <div className="h-64 w-full bg-gradient-to-r from-slate-200 via-slate-300 to-slate-200"></div>
        <div className="p-6">
            <div className="h-7 bg-slate-200 rounded w-4/5 mb-4"></div>
            <div className="h-5 bg-slate-200 rounded w-3/4 mb-3"></div>
            <div className="h-5 bg-slate-200 rounded w-2/3"></div>
        </div>
    </div>
);

// --- COMPONENTE PRINCIPAL DO CARD ---
export function EventCard({ event, isLoading = false }) {
    // Se estiver carregando, retorna o skeleton
    if (isLoading) {
        return <EventCardSkeleton />;
    }

    // Se não há evento ou metadados, retorna null ou um card de erro
    if (!event || !event.metadata) {
        return (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-lg overflow-hidden p-8 text-center">
                <p className="text-slate-500">Evento não disponível</p>
            </div>
        );
    }

    const { tiers, canceled } = event.account;
    const { metadata, imageUrl } = event;
    const eventAddress = event.publicKey.toString();

    // Função auxiliar para formatar BRL
    const formatBRL = (amount) => {
        return new Intl.NumberFormat('pt-BR', { 
            style: 'currency', 
            currency: 'BRL',
            minimumFractionDigits: 2
        }).format(amount);
    };

    // Formatação da data e hora
    const formatDateTime = (dateString) => {
        if (!dateString) return 'Data a definir';
        
        const date = new Date(dateString);
        const options = { 
            day: '2-digit', 
            month: 'long', 
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        };
        
        return date.toLocaleDateString('pt-BR', options).replace(' às', ' às').replace(' de', ' de');
    };

    // Formatação da localização
    const formatLocation = () => {
        const location = metadata.properties?.location;
        if (!location) return 'Local a definir';

        const { address, venueName } = location;
        if (address) {
            const parts = [];
            if (address.neighborhood) parts.push(address.neighborhood);
            if (address.city) parts.push(address.city);
            if (address.state) parts.push(address.state);
            if (address.country && address.country !== 'Brasil') parts.push(address.country);
            
            return parts.join(', ') || venueName || 'Local a definir';
        }
        
        return venueName || 'Online';
    };

    const status = useMemo(() => {
        if (canceled) return 'canceled';
        if (!metadata?.properties?.dateTime) return 'upcoming';

        const now = new Date();
        const startDate = new Date(metadata.properties.dateTime.start);
        const endDate = new Date(metadata.properties.dateTime.end);

        if (now > endDate) return 'finished';
        if (now >= startDate && now <= endDate) return 'active';
        return 'upcoming';
    }, [metadata, canceled]);
    
    // ✅ Lógica para preço inicial e métricas
    const { startingPriceBRLCents, totalSold, totalSupply, progress, availableTiers } = useMemo(() => {
        if (!Array.isArray(tiers) || tiers.length === 0) {
            return { startingPriceBRLCents: 0, totalSold: 0, totalSupply: 0, progress: 0, availableTiers: 0 };
        }

        // Processamento robusto dos tiers
        const processedTiers = tiers.map(tier => {
            const processValue = (value) => {
                if (!value && value !== 0) return 0;
                if (typeof value === 'object' && value.toNumber) return value.toNumber();
                if (typeof value === 'string' && value.startsWith('0x')) return parseInt(value, 16);
                return Number(value) || 0;
            };

            return {
                priceBrlCents: processValue(tier.priceBrlCents),
                maxTicketsSupply: processValue(tier.maxTicketsSupply),
                ticketsSold: processValue(tier.ticketsSold),
                name: tier.name || 'Ingresso'
            };
        });

        const validTiers = processedTiers.filter(tier => tier.maxTicketsSupply > 0);
        const startingPrice = validTiers.length > 0 
            ? Math.min(...validTiers.map(tier => tier.priceBrlCents))
            : 0;

        const sold = validTiers.reduce((sum, tier) => sum + tier.ticketsSold, 0);
        const supply = validTiers.reduce((sum, tier) => sum + tier.maxTicketsSupply, 0);
        const prog = supply > 0 ? (sold / supply) * 100 : 0;
        
        return { 
            startingPriceBRLCents: startingPrice, 
            totalSold: sold, 
            totalSupply: supply, 
            progress: prog,
            availableTiers: validTiers.length
        };
    }, [tiers]);

    const eventDate = formatDateTime(metadata?.properties?.dateTime?.start);
    const location = formatLocation();
    const startingPriceInBRL = startingPriceBRLCents / 100;
    const isFree = startingPriceInBRL === 0;
    const hasTickets = totalSupply > 0 && availableTiers > 0;

    // Usa imageUrl do evento OU metadata.image (prioridade para imageUrl)
    const displayImage = imageUrl || metadata.image;

    return (
        <Link to={`/event/${eventAddress}`} className="group block">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-lg overflow-hidden transform transition-all duration-500 hover:shadow-2xl hover:-translate-y-2 h-full flex flex-col">
                {/* IMAGEM PRINCIPAL COM OVERLAY */}
                <div className="relative h-64 w-full overflow-hidden">
                    {displayImage ? (
                        <>
                            <img 
                                src={displayImage} 
                                alt={metadata.name} 
                                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                                onError={(e) => {
                                    e.target.src = 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80';
                                }}
                            />
                            {/* Overlay gradiente para melhor legibilidade do texto */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent"></div>
                        </>
                    ) : (
                        <div className="w-full h-full bg-gradient-to-br from-cyan-500 to-fuchsia-600 flex items-center justify-center relative">
                            <div className="absolute inset-0 bg-black/40"></div>
                            <span className="text-white font-bold text-xl relative z-10">EVENTO</span>
                        </div>
                    )}
                    
                    {/* BADGE DE STATUS */}
                    <div className="absolute top-4 right-4">
                        <StatusBadge status={status} />
                    </div>

                    {/* TEXTO SOBRE A IMAGEM */}
                    <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                        <h3 className="text-2xl font-bold mb-2 leading-tight group-hover:text-cyan-300 transition-colors">
                            {metadata.name || 'Evento sem nome'}
                        </h3>
                        
                        {/* DATA E HORA */}
                        <div className="flex items-center mb-2 text-white/90">
                            <ClockIcon className="h-5 w-5 mr-3 flex-shrink-0" />
                            <span className="text-lg font-semibold">{eventDate}</span>
                        </div>
                        
                        {/* LOCALIZAÇÃO */}
                        <div className="flex items-center text-white/80">
                            <MapPinIcon className="h-5 w-5 mr-3 flex-shrink-0" />
                            <span className="text-lg font-medium truncate">{location}</span>
                        </div>
                    </div>
                </div>
                
                {/* INFORMAÇÕES ADICIONAIS ABAIXO DA IMAGEM */}
                <div className="p-6 bg-white">
                    {/* MÉTRICAS DE INGRESSOS */}
                    {hasTickets && status !== 'finished' && status !== 'canceled' && (
                        <div className="mb-4">
                            <div className="flex justify-between items-center mb-2">
                                <div className="flex items-center gap-2">
                                    <TicketIcon className="h-5 w-5 text-slate-600"/>
                                    <span className="text-sm font-semibold text-slate-700">
                                        {availableTiers} {availableTiers === 1 ? 'tipo' : 'tipos'} de ingresso
                                    </span>
                                </div>
                                <span className="text-sm font-bold text-slate-900">
                                    {totalSold} / {totalSupply}
                                </span>
                            </div>
                            <div className="w-full bg-slate-200 rounded-full h-2.5">
                                <div 
                                    className="bg-gradient-to-r from-cyan-500 to-fuchsia-600 h-2.5 rounded-full transition-all duration-1000" 
                                    style={{ width: `${Math.min(progress, 100)}%` }}
                                ></div>
                            </div>
                        </div>
                    )}

                    {/* PREÇO E CALL TO ACTION */}
                    <div className="flex justify-between items-center pt-4 border-t border-slate-100">
                        <div>
                            {isFree ? (
                                <div className="text-left">
                                    <p className="text-xs text-slate-500 font-medium">Valor do ingresso</p>
                                    <p className="text-xl font-bold text-green-600">Gratuito</p>
                                </div>
                            ) : (
                                <div className="text-left">
                                    <p className="text-xs text-slate-500 font-medium">A partir de</p>
                                    <p className="text-xl font-bold text-cyan-600">
                                        {formatBRL(startingPriceInBRL)}
                                    </p>
                                </div>
                            )}
                        </div>
                        
                        <div className="text-right">
                            <span className="inline-block px-4 py-2 bg-gradient-to-r from-cyan-500 to-fuchsia-600 text-white font-bold rounded-full text-sm transition-all duration-300 group-hover:shadow-lg group-hover:scale-105">
                                Ver Evento →
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </Link>
    );
}