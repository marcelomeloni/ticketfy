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

// Função para extrair valores numéricos de tiers (igual ao código anterior)
const getTierValue = (value) => {
    if (!value) return 0;
    
    // Se for objeto Anchor/BigNumber
    if (typeof value === 'object' && value.toNumber) {
        return value.toNumber();
    }
    
    // Se for string
    if (typeof value === 'string') {
        // Remove zeros à esquerda para análise
        const cleanValue = value.replace(/^0+/, '') || '0';
        
        // ✅ CORREÇÃO: Detecta se é hexadecimal (apenas caracteres 0-9, A-F)
        if (/^[0-9A-Fa-f]+$/.test(cleanValue)) {
            const decimalValue = parseInt(cleanValue, 16);
            console.log(`🔢 Conversão hexadecimal: "${value}" -> "${cleanValue}" -> ${decimalValue}`);
            return decimalValue;
        }
        
        // Se não for hexadecimal, tenta como número decimal
        const numericValue = Number(value);
        return isNaN(numericValue) ? 0 : numericValue;
    }
    
    // Valor numérico direto
    return Number(value) || 0;
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
                
                console.log(`🎯 Buscando dados do evento: ${publicKey.toString()}`);
                
   
                const activeEventsResponse = await fetch(`${API_URL}/api/events/active/fast`);
                if (activeEventsResponse.ok) {
                    const activeEvents = await activeEventsResponse.json();
                    const existingEvent = activeEvents.find(e => e.publicKey === publicKey.toString());
                    
                    if (existingEvent) {
                        console.log('✅ Evento encontrado na lista de ativos');
                        setEventData(existingEvent);
                        setIsLoading(false);
                        return;
                    }
                }

                // ✅ SEGUNDO: Se não encontrou nos ativos, tenta a API de detalhes
                console.log(`🔍 Buscando detalhes específicos do evento: ${publicKey.toString()}`);
                const detailsResponse = await fetch(`${API_URL}/api/events/details/${publicKey.toString()}`);
                
                if (detailsResponse.ok) {
                    const data = await detailsResponse.json();
                    
                    if (data.success && data.event) {
                        console.log('✅ Dados do evento carregados via API de detalhes');
                        setEventData(data.event);
                    } else {
                        throw new Error('Evento não encontrado na API');
                    }
                } else {
                    throw new Error(`HTTP error! status: ${detailsResponse.status}`);
                }
            } catch (error) {
                console.error("❌ Falha ao buscar dados do evento:", error);
                setError(error.message);
                
                // ✅ FALLBACK: Usa os dados básicos do evento (igual ao código anterior)
                console.log('🔄 Usando fallback com dados básicos...');
                setEventData({
                    metadata: event.metadata || { 
                        name: "Evento", 
                        properties: {
                            location: { venueName: 'Online' },
                            dateTime: { start: new Date().toISOString() }
                        }
                    },
                    account: event,
                    imageUrl: event.imageUrl || ''
                });
            } finally {
                setIsLoading(false);
            }
        };
        
        fetchEventData();
    }, [publicKey, event]);

    const status = useMemo(() => {
        if (!eventData) return 'upcoming';
        
        const now = Math.floor(Date.now() / 1000);
        const salesEndDate = eventData.account?.salesEndDate?.toNumber?.() || eventData.account?.sales_end_date;
        const salesStartDate = eventData.account?.salesStartDate?.toNumber?.() || eventData.account?.sales_start_date;
        const isCanceled = eventData.account?.canceled || eventData.account?.isCanceled;
        
        if (isCanceled) return 'canceled';
        if (salesEndDate && now > salesEndDate) return 'finished';
        if (salesStartDate && now < salesStartDate) return 'upcoming';
        return 'active';
    }, [eventData]);

    // ✅ LÓGICA CORRIGIDA: Cálculo de ingressos (igual ao código anterior)
    const totalSupply = useMemo(() => {
        if (!eventData) return 0;
        
        const tiers = eventData.account?.tiers || [];
        if (!Array.isArray(tiers)) return 0;
        
        return tiers.reduce((sum, tier) => {
            const maxSupply = getTierValue(tier.maxTicketsSupply);
            return sum + maxSupply;
        }, 0);
    }, [eventData]);

    const totalSold = useMemo(() => {
        if (!eventData) return 0;
        
        // ✅ PRIMEIRO: Tenta usar totalTicketsSold direto (igual ao código anterior)
        if (eventData.account?.totalTicketsSold !== undefined) {
            return getTierValue(eventData.account.totalTicketsSold);
        }
        
        // ✅ SEGUNDO: Se não tiver totalTicketsSold, calcula somando os tiers
        const tiers = eventData.account?.tiers || [];
        if (!Array.isArray(tiers)) return 0;
        
        return tiers.reduce((sum, tier) => {
            const sold = getTierValue(tier.ticketsSold);
            return sum + sold;
        }, 0);
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

            {/* Debug info (apenas em desenvolvimento) */}
            {process.env.NODE_ENV === 'development' && eventData && (
                <div className="mt-2 text-xs text-gray-500">
                    <strong>Debug:</strong> Tiers: {eventData.account?.tiers?.length || 0}, 
                    TotalSold: {totalSold}, 
                    TotalSupply: {totalSupply}
                </div>
            )}
        </div>
    );
}