import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ActionButton } from '../ui/ActionButton';
import { CalendarIcon, MapPinIcon, TicketIcon } from '@heroicons/react/24/outline';
import { API_URL } from '@/lib/constants';

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
    // Estado para os metadados (do Supabase) e carregamento
    const [eventData, setEventData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchEventData = async () => {
            try {
                setIsLoading(true);
                setError(null);
                
                console.log(`🎯 Buscando dados do evento via API rápida: ${publicKey.toString()}`);
                
                // ✅ BUSCA DIRETA DO SUPABASE VIA API RÁPIDA
                const response = await fetch(`${API_URL}/api/events/fast/${publicKey.toString()}`);
                
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                
                const data = await response.json();
                
                if (data.success && data.event) {
                    console.log('✅ Dados do evento carregados via API rápida');
                    setEventData(data.event);
                } else {
                    throw new Error('Evento não encontrado na API');
                }
            } catch (error) {
                console.error("❌ Falha ao buscar dados do evento via API:", error);
                setError(error.message);
                
                // ✅ FALLBACK: Tenta usar os dados on-chain básicos
                if (event.metadataUri) {
                    console.log('🔄 Tentando fallback para metadata URI...');
                    try {
                        const fallbackResponse = await fetch(event.metadataUri);
                        if (fallbackResponse.ok) {
                            const metadata = await fallbackResponse.json();
                            setEventData({
                                metadata: metadata,
                                account: event,
                                imageUrl: metadata.image
                            });
                        }
                    } catch (fallbackError) {
                        console.error('❌ Fallback também falhou:', fallbackError);
                        // Define um fallback mínimo
                        setEventData({
                            metadata: { 
                                name: "Evento", 
                                properties: {
                                    location: { venueName: 'Online' },
                                    dateTime: { start: new Date().toISOString() }
                                }
                            },
                            account: event,
                            imageUrl: ''
                        });
                    }
                } else {
                    // Fallback mínimo
                    setEventData({
                        metadata: { 
                            name: "Evento", 
                            properties: {
                                location: { venueName: 'Online' },
                                dateTime: { start: new Date().toISOString() }
                            }
                        },
                        account: event,
                        imageUrl: ''
                    });
                }
            } finally {
                setIsLoading(false);
            }
        };
        
        fetchEventData();
    }, [publicKey, event.metadataUri]);

    const status = useMemo(() => {
        if (!eventData) return 'upcoming';
        
        const now = Math.floor(Date.now() / 1000);
        if (eventData.account.canceled) return 'canceled';
        if (now > eventData.account.salesEndDate.toNumber()) return 'finished';
        if (now < eventData.account.salesStartDate.toNumber()) return 'upcoming';
        return 'active';
    }, [eventData]);

    // Lógica para a barra de progresso (on-chain)
    const totalSupply = useMemo(() => {
        if (!eventData) return 0;
        return Array.isArray(eventData.account.tiers) 
            ? eventData.account.tiers.reduce((sum, tier) => sum + (tier.maxTicketsSupply || 0), 0) 
            : 0;
    }, [eventData]);

    const totalSold = useMemo(() => {
        if (!eventData) return 0;
        return eventData.account.totalTicketsSold || 0;
    }, [eventData]);

    const progress = totalSupply > 0 ? (totalSold / totalSupply) * 100 : 0;
    
    // Renderiza o esqueleto enquanto os dados carregam
    if (isLoading) {
        return <CardSkeleton />;
    }

    // Se há erro mas temos dados mínimos, ainda renderiza
    if (error && !eventData) {
        return (
            <div className="bg-white p-6 rounded-xl border border-red-200">
                <div className="text-center text-red-600">
                    <p>Erro ao carregar evento</p>
                    <p className="text-sm text-red-400">{error}</p>
                </div>
            </div>
        );
    }

    return (
        <div className={`bg-white p-6 rounded-xl border transition-all ${status === 'canceled' ? 'opacity-60 bg-slate-50' : 'shadow-sm hover:shadow-md'}`}>
            <div className="flex flex-col sm:flex-row justify-between gap-4">
                {/* Coluna de Informações */}
                <div className="flex-grow space-y-4">
                    <div className="flex items-center gap-4">
                        <h3 className="text-2xl font-bold text-slate-900">
                            {eventData.metadata?.name || 'Evento sem nome'}
                        </h3>
                        <StatusBadge status={status} />
                    </div>
                    <div className="flex items-center text-sm text-slate-500 gap-6">
                        <span className="flex items-center gap-2">
                            <MapPinIcon className="h-4 w-4" /> 
                            {eventData.metadata?.properties?.location?.venueName || 'Online'}
                        </span>
                        <span className="flex items-center gap-2">
                            <CalendarIcon className="h-4 w-4" /> 
                            {eventData.metadata?.properties?.dateTime?.start 
                                ? new Date(eventData.metadata.properties.dateTime.start).toLocaleDateString('pt-BR', { 
                                    day: '2-digit', 
                                    month: 'short' 
                                })
                                : 'Data não definida'
                            }
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
                                <div 
                                    className="bg-indigo-600 h-2.5 rounded-full transition-all duration-300" 
                                    style={{ width: `${progress}%` }}
                                ></div>
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
            
            {/* Aviso de erro se houver, mas com dados */}
            {error && (
                <div className="mt-4 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
                    <strong>Aviso:</strong> Alguns dados podem estar incompletos devido a problemas de conexão.
                </div>
            )}
        </div>
    );
}
