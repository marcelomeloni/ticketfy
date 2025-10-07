import { Link } from 'react-router-dom';
import { useMemo } from 'react';
import { ClockIcon, MapPinIcon, TicketIcon } from '@heroicons/react/24/outline';

// --- COMPONENTE DE STATUS ---
const StatusBadge = ({ status }) => {
    const styles = {
        upcoming: 'bg-blue-100 text-blue-800',
        active: 'bg-green-100 text-green-800 animate-pulse',
        finished: 'bg-slate-100 text-slate-800',
        canceled: 'bg-red-100 text-red-800',
    };
    const text = {
        upcoming: 'Em breve',
        active: 'Acontecendo Agora',
        finished: 'Encerrado',
        canceled: 'Cancelado',
    };
    if (!status || !styles[status]) return null;

    return <span className={`px-3 py-1 text-xs font-medium rounded-full ${styles[status]}`}>{text[status]}</span>;
};

// --- COMPONENTE DE ESQUELETO (LOADING STATE) ---
export const EventCardSkeleton = () => (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden animate-pulse">
        <div className="h-48 w-full bg-slate-200"></div>
        <div className="p-5">
            <div className="h-6 bg-slate-200 rounded w-3/4 mb-3"></div>
            <div className="h-4 bg-slate-200 rounded w-1/2 mb-4"></div>
            <div className="h-4 bg-slate-200 rounded w-1/3 mb-5"></div>
            <div className="w-full bg-slate-200 rounded-full h-2.5 mb-2"></div>
            <div className="h-4 bg-slate-200 rounded w-1/4"></div>
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
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden p-6 text-center">
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

    const status = useMemo(() => {
        if (canceled) return 'canceled';
        if (!metadata?.properties?.dateTime) return null;

        const now = new Date();
        const startDate = new Date(metadata.properties.dateTime.start);
        const endDate = new Date(metadata.properties.dateTime.end);

        if (now > endDate) return 'finished';
        if (now >= startDate && now <= endDate) return 'active';
        return 'upcoming';
    }, [metadata, canceled]);
    
    // ✅ CORRIGIDO: Lógica para preço inicial e barra de progresso
    const { startingPriceBRLCents, totalSold, totalSupply, progress } = useMemo(() => {
        if (!Array.isArray(tiers) || tiers.length === 0) {
            return { startingPriceBRLCents: 0, totalSold: 0, totalSupply: 0, progress: 0 };
        }

        // 1. Encontra o menor preço em centavos (convertendo de hexadecimal se necessário)
        const allPricesInCents = tiers
            .map(tier => {
                let price = tier.priceBrlCents;
                // Se for string hexadecimal, converte para número
                if (typeof price === 'string' && price.startsWith('0x')) {
                    return parseInt(price, 16);
                }
                // Se for objeto Anchor BN, usa toNumber()
                if (price && typeof price === 'object' && price.toNumber) {
                    return price.toNumber();
                }
                // Se já for número, usa diretamente
                return Number(price) || 0;
            })
            .filter(price => price >= 0); // Filtra por preços válidos

        const startingPrice = allPricesInCents.length > 0 ? Math.min(...allPricesInCents) : 0;

        const sold = event.account.totalTicketsSold || 0;
        const supply = tiers.reduce((sum, tier) => {
            let maxSupply = tier.maxTicketsSupply;
            // Converte de hexadecimal se necessário
            if (typeof maxSupply === 'string' && maxSupply.startsWith('0x')) {
                return sum + parseInt(maxSupply, 16);
            }
            // Se for objeto Anchor BN, usa toNumber()
            if (maxSupply && typeof maxSupply === 'object' && maxSupply.toNumber) {
                return sum + maxSupply.toNumber();
            }
            return sum + Number(maxSupply);
        }, 0);
        
        const prog = supply > 0 ? (sold / supply) * 100 : 0;
        
        return { 
            startingPriceBRLCents: startingPrice, 
            totalSold: sold, 
            totalSupply: supply, 
            progress: prog 
        };
    }, [tiers, event.account.totalTicketsSold]);

    const eventDate = metadata?.properties?.dateTime?.start 
        ? new Date(metadata.properties.dateTime.start).toLocaleDateString('pt-BR', { 
            day: '2-digit', 
            month: 'long', 
            year: 'numeric' 
        })
        : 'Data a definir';

    // 2. Calcula o preço final em R$
    const startingPriceInBRL = startingPriceBRLCents / 100;
    const isFree = startingPriceInBRL === 0;

    // Usa imageUrl do evento OU metadata.image (prioridade para imageUrl)
    const displayImage = imageUrl || metadata.image;

    return (
        <Link to={`/event/${eventAddress}`} className="group block">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden transform transition-all duration-300 hover:shadow-lg hover:-translate-y-1 h-full flex flex-col">
                <div className="relative h-48 w-full overflow-hidden">
                    {displayImage ? (
                        <img 
                            src={displayImage} 
                            alt={metadata.name} 
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" 
                            onError={(e) => {
                                // Fallback para imagem quebrada
                                e.target.src = 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80';
                            }}
                        />
                    ) : (
                        <div className="w-full h-full bg-gradient-to-br from-cyan-500 to-fuchsia-600 flex items-center justify-center">
                            <span className="text-white font-bold text-lg">Evento</span>
                        </div>
                    )}
                    <div className="absolute top-3 right-3">
                        <StatusBadge status={status} />
                    </div>
                </div>
                
                <div className="p-5 flex-grow flex flex-col">
                    <h3 className="text-lg font-bold text-slate-900 truncate group-hover:text-indigo-600 transition-colors">
                        {metadata.name || 'Evento sem nome'}
                    </h3>
                    
                    <div className="mt-3 space-y-2 text-sm text-slate-600">
                        <div className="flex items-center">
                            <ClockIcon className="h-4 w-4 mr-2 text-slate-400 flex-shrink-0" />
                            <span>{eventDate}</span>
                        </div>
                        <div className="flex items-center">
                            <MapPinIcon className="h-4 w-4 mr-2 text-slate-400 flex-shrink-0" />
                            <span className="truncate">
                                {metadata.properties?.location?.address?.city || 
                                 metadata.properties?.location?.venueName || 
                                 'Online'}
                            </span>
                        </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-slate-100 flex-grow flex flex-col justify-end">
                        {status !== 'finished' && status !== 'canceled' && totalSupply > 0 && (
                            <div className="mb-3">
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-xs font-medium text-slate-500 flex items-center gap-1">
                                        <TicketIcon className="h-4 w-4"/> Ingressos
                                    </span>
                                    <span className="text-xs font-bold text-slate-600">
                                        {totalSold} / {totalSupply}
                                    </span>
                                </div>
                                <div className="w-full bg-slate-200 rounded-full h-2">
                                    <div 
                                        className="bg-indigo-500 h-2 rounded-full" 
                                        style={{ width: `${Math.min(progress, 100)}%` }}
                                    ></div>
                                </div>
                            </div>
                        )}
                        
                        {isFree ? (
                            <p className="text-lg text-right font-bold text-green-600">Gratuito</p>
                        ) : (
                            <div className="text-right">
                                <p className="text-xs text-slate-500">A partir de</p>
                                <p className="text-lg font-bold text-indigo-600">
                                    {formatBRL(startingPriceInBRL)}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </Link>
    );
}