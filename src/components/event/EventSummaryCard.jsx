import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ActionButton } from '../ui/ActionButton';
import { CalendarIcon, MapPinIcon, TicketIcon } from '@heroicons/react/24/outline';

// --- COMPONENTE DE ESQUELETO (LOADING STATE) ---
const CardSkeleton = () => (
    <div className="bg-white p-6 rounded-xl border animate-pulse">
        <div className="flex flex-col sm:flex-row justify-between gap-4">
            <div className="flex-grow space-y-4">
                <div className="flex items-center gap-4">
                    <div className="h-8 bg-slate-200 rounded w-1/2"></div>
                    <div className="h-6 bg-slate-200 rounded-full w-24"></div>
                </div>
                <div className="flex items-center text-sm gap-6">
                    <div className="h-4 bg-slate-200 rounded w-1/4"></div>
                    <div className="h-4 bg-slate-200 rounded w-1/3"></div>
                </div>
                <div>
                    <div className="flex justify-between items-center mb-1">
                        <div className="h-4 bg-slate-200 rounded w-1/3"></div>
                        <div className="h-4 bg-slate-200 rounded w-1/4"></div>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2.5"></div>
                </div>
            </div>
            <div className="flex-shrink-0 flex items-center">
                <div className="h-10 bg-slate-200 rounded-lg w-40"></div>
            </div>
        </div>
    </div>
);

// --- COMPONENTE DE STATUS ---
const StatusBadge = ({ status }) => {
    const styles = {
        active: 'bg-green-100 text-green-800',
        upcoming: 'bg-blue-100 text-blue-800',
        finished: 'bg-slate-100 text-slate-800',
        canceled: 'bg-red-100 text-red-800',
    };
    const text = {
        active: 'Vendas Ativas',
        upcoming: 'Em Breve',
        finished: 'Finalizado',
        canceled: 'Cancelado',
    };
    return <span className={`px-3 py-1 text-xs font-medium rounded-full ${styles[status]}`}>{text[status]}</span>;
};

export function EventSummaryCard({ event, publicKey }) {
    // Estado para os metadados (off-chain) e carregamento
    const [metadata, setMetadata] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchMetadata = async () => {
            try {
                // Previne o fetch se a URI não existir
                if (!event.metadataUri) throw new Error("Metadata URI is missing");
                
                setIsLoading(true);
                const response = await fetch(event.metadataUri);
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                const data = await response.json();
                setMetadata(data);
            } catch (error) {
                console.error("Failed to fetch event summary metadata:", error);
                // Define um fallback caso o metadado falhe
                setMetadata({ name: "Erro ao carregar evento", properties: {} }); 
            } finally {
                setIsLoading(false);
            }
        };
        fetchMetadata();
    }, [event.metadataUri]);

   
    const status = useMemo(() => {
        const now = Math.floor(Date.now() / 1000);
        if (event.canceled) return 'canceled';
        // A data do evento real está off-chain, então usamos o fim das vendas como referência
        if (now > event.salesEndDate.toNumber()) return 'finished'; 
        if (now < event.salesStartDate.toNumber()) return 'upcoming';
        return 'active';
    }, [event.canceled, event.salesStartDate, event.salesEndDate]);

    // Lógica para a barra de progresso (on-chain)
    const totalSupply = useMemo(() => Array.isArray(event.tiers) ? event.tiers.reduce((sum, tier) => sum + tier.maxTicketsSupply, 0) : 0, [event.tiers]);
    const totalSold = event.totalTicketsSold || 0;
    const progress = totalSupply > 0 ? (totalSold / totalSupply) * 100 : 0;
    
    // Renderiza o esqueleto enquanto os metadados carregam
    if (isLoading) {
        return <CardSkeleton />;
    }

    return (
        <div className={`bg-white p-6 rounded-xl border transition-all ${status === 'canceled' ? 'opacity-60 bg-slate-50' : 'shadow-sm hover:shadow-md'}`}>
            <div className="flex flex-col sm:flex-row justify-between gap-4">
                {/* Coluna de Informações */}
                <div className="flex-grow space-y-4">
                    <div className="flex items-center gap-4">
                        <h3 className="text-2xl font-bold text-slate-900">{metadata.name}</h3>
                        <StatusBadge status={status} />
                    </div>
                    <div className="flex items-center text-sm text-slate-500 gap-6">
                        <span className="flex items-center gap-2"><MapPinIcon className="h-4 w-4" /> {metadata.properties?.location?.address?.city || 'Online'}</span>
                        <span className="flex items-center gap-2"><CalendarIcon className="h-4 w-4" /> 
                            {new Date(metadata.properties?.dateTime?.start || Date.now()).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                        </span>
                    </div>

                    {/* Barra de Progresso das Vendas */}
                    {status !== 'canceled' && totalSupply > 0 && (
                        <div>
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-sm font-medium text-slate-700">Ingressos Vendidos</span>
                                <span className="text-sm font-bold text-slate-700">{totalSold} / {totalSupply}</span>
                            </div>
                            <div className="w-full bg-slate-200 rounded-full h-2.5">
                                <div className="bg-indigo-600 h-2.5 rounded-full" style={{ width: `${progress}%` }}></div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Coluna de Ação */}
                <div className="flex-shrink-0 flex items-center">
                    <Link to={`/manage-event/${publicKey.toString()}`}>
                        <ActionButton>
                            <TicketIcon className="h-5 w-5 mr-2"/>
                            Gerenciar Evento
                        </ActionButton>
                    </Link>
                </div>
            </div>
        </div>
    );
}