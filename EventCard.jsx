import { Link } from 'react-router-dom';
import { useMemo } from 'react';
import { CalendarDaysIcon, MapPinIcon } from '@heroicons/react/24/outline';

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
        <span className={`px-2 py-1 text-xs font-bold rounded-full ${styles[status]} backdrop-blur-sm`}>
            {text[status]}
        </span>
    );
};

// --- COMPONENTE DE ESQUELETO (LOADING STATE) ---
export const EventCardSkeleton = () => (
    <div className="bg-white rounded-lg border border-slate-200 shadow-md overflow-hidden animate-pulse">
        <div className="h-48 w-full bg-slate-200"></div>
        <div className="p-5">
            <div className="h-6 bg-slate-200 rounded w-4/5 mb-4"></div>
            <div className="h-5 bg-slate-200 rounded w-3/4 mb-3"></div>
            <div className="h-5 bg-slate-200 rounded w-2/3"></div>
        </div>
    </div>
);

// Função auxiliar para obter valor numérico (mantida para lógica interna)
const getTierValue = (value) => {
    if (!value) return 0;
    if (typeof value === 'object' && value.toNumber) {
        return value.toNumber();
    }
    if (typeof value === 'string' && value.startsWith('0x')) {
        return parseInt(value, 16);
    }
    return Number(value) || 0;
};

// --- COMPONENTE PRINCIPAL DO CARD ---
export function EventCard({ event, isLoading = false }) {
    if (isLoading) {
        return <EventCardSkeleton />;
    }

    if (!event || !event.publicKey || !event.metadata || !event.account) {
        console.error('EventCard: Dados do evento inválidos ou incompletos.', event);
        return (
            <div className="bg-white rounded-lg border border-slate-200 shadow-md overflow-hidden p-6 text-center">
                <p className="text-slate-500">Dados do evento indisponíveis</p>
            </div>
        );
    }

    // --- LÓGICA DE DADOS (SEM ALTERAÇÕES) ---
    const { canceled } = event.account;
    const { metadata, imageUrl } = event;
    const eventAddress = event.publicKey.toString();

    const formatDateTime = (dateString) => {
        if (!dateString) return 'Data a definir';
        const date = new Date(dateString);
        return date.toLocaleDateString('pt-BR', {
            day: '2-digit', month: 'long', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        }).replace(' de', ' de').replace(',', ' às');
    };

    const formatLocation = () => {
        const location = metadata.properties?.location;
        if (!location) return 'Local a definir';
        const { address, venueName } = location;
        if (venueName && address?.city) return `${venueName} - ${address.city}`;
        return venueName || address?.city || 'Local a definir';
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
    
    const eventDate = formatDateTime(metadata?.properties?.dateTime?.start);
    const location = formatLocation();
    const displayImage = imageUrl || metadata.image;
    
    // Suporte para overlay opcional (como no card da corrida)
    const overlay = metadata?.properties?.overlay;

    return (
        <Link to={`/event/${eventAddress}`} className="group block h-full">
            <div className="bg-white rounded-lg border border-slate-200 shadow-md overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 h-full flex flex-col">
                
                {/* ÁREA DA IMAGEM */}
                <div className="relative h-48 w-full overflow-hidden">
                    <img 
                        src={displayImage || 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3'} 
                        alt={metadata.name || 'Imagem do Evento'}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
                        onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3'; }}
                    />
                    
                    <div className="absolute top-3 right-3">
                        <StatusBadge status={status} />
                    </div>

                    {/* OVERLAY OPCIONAL (Slogan e Banner) */}
                    {overlay && (
                        <div className="absolute inset-0 p-4 flex flex-col justify-end bg-gradient-to-t from-black/60 to-transparent">
                           {overlay.slogan && (
                                <h3 className="text-white text-lg font-bold tracking-wide uppercase">
                                    {overlay.slogan}
                                </h3>
                           )}
                           {overlay.bannerText && (
                                <div 
                                    className="mt-1 px-3 py-1 text-white text-xs font-bold self-start rounded" 
                                    style={{ backgroundColor: overlay.accentColor || '#000000' }}
                                >
                                    {overlay.bannerText}
                                </div>
                           )}
                        </div>
                    )}
                </div>

                {/* ÁREA DE CONTEÚDO (CONFORME O PADRÃO SOLICITADO) */}
                <div className="p-5 flex-grow">
                    <h2 className="text-lg font-bold text-slate-800 mb-4 leading-tight truncate">
                        {metadata.name || 'Evento sem Título'}
                    </h2>

                    <div className="space-y-3 text-sm text-slate-600">
                        <div className="flex items-center">
                            <CalendarDaysIcon className="h-5 w-5 mr-3 flex-shrink-0 text-slate-400" />
                            <span>{eventDate}</span>
                        </div>
                        <div className="flex items-center">
                            <MapPinIcon className="h-5 w-5 mr-3 flex-shrink-0 text-slate-400" />
                            <span className="truncate">{location}</span>
                        </div>
                    </div>
                </div>
            </div>
        </Link>
    );
}