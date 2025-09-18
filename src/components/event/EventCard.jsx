// Em: src/components/event/EventCard.jsx

import { Link } from 'react-router-dom';
import { useMemo, useState, useEffect } from 'react'; // Adicionados useState e useEffect
import { ClockIcon, MapPinIcon } from '@heroicons/react/24/outline';
import { web3 } from '@coral-xyz/anchor';

const formatDate = (timestamp) => {
    return new Date(timestamp * 1000).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
};

// Componente de esqueleto para o estado de carregamento
const EventCardSkeleton = () => (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden animate-pulse">
        <div className="h-48 w-full bg-slate-200"></div>
        <div className="p-5">
            <div className="h-6 bg-slate-200 rounded w-3/4 mb-3"></div>
            <div className="h-4 bg-slate-200 rounded w-1/2 mb-2"></div>
            <div className="h-4 bg-slate-200 rounded w-1/3"></div>
            <div className="mt-4 pt-4 border-t border-slate-200 flex justify-between items-center">
                <div className="h-4 bg-slate-200 rounded w-1/4"></div>
                <div className="h-6 bg-slate-200 rounded w-1/3"></div>
            </div>
        </div>
    </div>
);

export function EventCard({ event }) {
    const [metadata, setMetadata] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    const { tiers, salesStartDate, metadataUri } = event.account;
    const eventAddress = event.publicKey.toString();

    useEffect(() => {
        const fetchMetadata = async () => {
            try {
                setIsLoading(true);
                const response = await fetch(metadataUri);
                if (!response.ok) throw new Error('Network response was not ok');
                const data = await response.json();
                setMetadata(data);
            } catch (error) {
                console.error("Failed to fetch metadata:", error);
                setMetadata({ name: "Evento Inválido", image: '' }); // Dados de fallback
            } finally {
                setIsLoading(false);
            }
        };
        fetchMetadata();
    }, [metadataUri]);

    const startingPriceLamports = useMemo(() => {
        if (!Array.isArray(tiers) || tiers.length === 0) return 0;
        return Math.min(...tiers.map(tier => tier.priceLamports.toNumber()));
    }, [tiers]);
    
    if (isLoading) {
        return <EventCardSkeleton />;
    }

    return (
        <Link to={`/event/${eventAddress}`} className="group">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden transform transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
                <div className="h-48 w-full overflow-hidden">
                    <img src={metadata.image} alt={metadata.name} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                </div>
                <div className="p-5">
                    <h3 className="text-lg font-bold text-slate-900 truncate">{metadata.name}</h3>
                    <div className="mt-3 space-y-2 text-sm text-slate-600">
                        <div className="flex items-center">
                            <ClockIcon className="h-4 w-4 mr-2 text-slate-400" />
                            {/* Usamos a data de início das vendas como referência on-chain */}
                            <span>Inicia vendas em {formatDate(salesStartDate.toNumber())}</span>
                        </div>
                        <div className="flex items-center">
                            <MapPinIcon className="h-4 w-4 mr-2 text-slate-400" />
                            <span className="truncate">{metadata.properties?.location?.address?.city || 'Local não definido'}</span>
                        </div>
                    </div>
                    <div className="mt-4 pt-4 border-t border-slate-200 flex justify-between items-center">
                        {startingPriceLamports > 0 ? (
                            <>
                                <p className="text-sm text-slate-500">A partir de</p>
                                <p className="font-bold text-indigo-600">
                                    {(startingPriceLamports / web3.LAMPORTS_PER_SOL).toFixed(2)} SOL
                                </p>
                            </>
                        ) : (
                            <p className="text-sm text-slate-500">Evento Gratuito</p>
                        )}
                    </div>
                </div>
            </div>
        </Link>
    );
}