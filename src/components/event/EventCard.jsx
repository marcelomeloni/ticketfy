import { Link } from 'react-router-dom';
import { useMemo, useState, useEffect } from 'react';
import { ClockIcon, MapPinIcon, TicketIcon } from '@heroicons/react/24/outline';
import { web3 } from '@coral-xyz/anchor';

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
const EventCardSkeleton = () => (
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
export function EventCard({ event }) {
    const [metadata, setMetadata] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    const { tiers, metadataUri, canceled } = event.account;
    const eventAddress = event.publicKey.toString();

    useEffect(() => {
        const fetchMetadata = async () => {
            try {
                if (!metadataUri) throw new Error("Metadata URI is missing");
                setIsLoading(true);
                const response = await fetch(metadataUri);
                if (!response.ok) throw new Error('Network response was not ok');
                const data = await response.json();
                setMetadata(data);
            } catch (error) {
                console.error("Failed to fetch metadata:", error);
                setMetadata({ name: "Evento Inválido", image: '' });
            } finally {
                setIsLoading(false);
            }
        };
        fetchMetadata();
    }, [metadataUri]);


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
    
    // Lógica para preço inicial e barra de progresso
    const { startingPriceLamports, totalSold, totalSupply, progress } = useMemo(() => {
        if (!Array.isArray(tiers) || tiers.length === 0) {
            return { startingPriceLamports: 0, totalSold: 0, totalSupply: 0, progress: 0 };
        }
        const startingPrice = Math.min(...tiers.map(tier => tier.priceLamports.toNumber()));
        const sold = event.account.totalTicketsSold || 0;
        const supply = tiers.reduce((sum, tier) => sum + tier.maxTicketsSupply, 0);
        const prog = supply > 0 ? (sold / supply) * 100 : 0;
        return { startingPriceLamports: startingPrice, totalSold: sold, totalSupply: supply, progress: prog };
    }, [tiers, event.account.totalTicketsSold]);


    if (isLoading) {
        return <EventCardSkeleton />;
    }

    const eventDate = metadata?.properties?.dateTime?.start 
        ? new Date(metadata.properties.dateTime.start).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
        : 'Data a definir';

    return (
        <Link to={`/event/${eventAddress}`} className="group block">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden transform transition-all duration-300 hover:shadow-lg hover:-translate-y-1 h-full flex flex-col">
                <div className="relative h-48 w-full overflow-hidden">
                    <img src={metadata.image} alt={metadata.name} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                    <div className="absolute top-3 right-3">
                        <StatusBadge status={status} />
                    </div>
                </div>
                
                <div className="p-5 flex-grow flex flex-col">
                    <h3 className="text-lg font-bold text-slate-900 truncate group-hover:text-indigo-600 transition-colors">{metadata.name}</h3>
                    
                    <div className="mt-3 space-y-2 text-sm text-slate-600">
                        <div className="flex items-center">
                            <ClockIcon className="h-4 w-4 mr-2 text-slate-400 flex-shrink-0" />
                           
                            <span>{eventDate}</span>
                        </div>
                        <div className="flex items-center">
                            <MapPinIcon className="h-4 w-4 mr-2 text-slate-400 flex-shrink-0" />
                            <span className="truncate">{metadata.properties?.location?.address?.city || 'Online'}</span>
                        </div>
                    </div>

                  
                    <div className="mt-4 pt-4 border-t border-slate-100 flex-grow flex flex-col justify-end">
                        {status !== 'finished' && status !== 'canceled' && totalSupply > 0 && (
                            <div className="mb-3">
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-xs font-medium text-slate-500 flex items-center gap-1"><TicketIcon className="h-4 w-4"/> Ingressos</span>
                                    <span className="text-xs font-bold text-slate-600">{totalSold} / {totalSupply}</span>
                                </div>
                                <div className="w-full bg-slate-200 rounded-full h-2">
                                    <div className="bg-indigo-500 h-2 rounded-full" style={{ width: `${progress}%` }}></div>
                                </div>
                            </div>
                        )}
                        
                        {startingPriceLamports > 0 ? (
                            <div className="text-right">
                                <p className="text-xs text-slate-500">A partir de</p>
                                <p className="text-lg font-bold text-indigo-600">
                                    {(startingPriceLamports / web3.LAMPORTS_PER_SOL).toFixed(2)} SOL
                                </p>
                            </div>
                        ) : (
                             <p className="text-lg text-right font-bold text-green-600">Gratuito</p>
                        )}
                    </div>
                </div>
            </div>
        </Link>
    );
}