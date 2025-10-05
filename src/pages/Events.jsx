import { useState, useMemo, useEffect } from 'react';
import { EventCard } from '@/components/event/EventCard';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { API_URL } from '@/lib/constants';

export function Events() {
    const [allEvents, setAllEvents] = useState([]);
    const [visibleEvents, setVisibleEvents] = useState([]); // Eventos visíveis (carregados)
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [category, setCategory] = useState('all');
    const [eventType, setEventType] = useState('all');
    const [isFree, setIsFree] = useState('all');

    // ✨ NOVO: Estado para controlar eventos pendentes de carregamento
    const [pendingEvents, setPendingEvents] = useState([]);

    useEffect(() => {
        const fetchEventsFromApi = async () => {
            setIsLoading(true);
            try {
                const response = await fetch(`${API_URL}/api/events/active`);
                if (!response.ok) {
                    throw new Error(`Erro na API: ${response.statusText}`);
                }
                const data = await response.json();

                setAllEvents(data);
                
                // ✨ ESTRATÉGIA DE CARREGAMENTO PROGRESSIVO:
                // 1. Mostrar os primeiros 2-4 eventos imediatamente
                const immediateEvents = data.slice(0, 3);
                setVisibleEvents(immediateEvents);
                
                // 2. Colocar o resto em "pending" para carregar depois
                const remainingEvents = data.slice(3);
                setPendingEvents(remainingEvents);
                
            } catch (error) {
                console.error("Falha ao buscar eventos da API:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchEventsFromApi();
    }, []);

    // ✨ NOVO: Efeito para carregar eventos pendentes em background
    useEffect(() => {
        if (pendingEvents.length === 0) return;

        const loadPendingEvents = async () => {
            setIsLoadingMore(true);
            
            // Carregar em lotes de 2-3 eventos por vez
            const batchSize = 2;
            const batch = pendingEvents.slice(0, batchSize);
            const remaining = pendingEvents.slice(batchSize);
            
            // Simular um pequeno delay para UX melhor (opcional)
            await new Promise(resolve => setTimeout(resolve, 300));
            
            setVisibleEvents(prev => [...prev, ...batch]);
            setPendingEvents(remaining);
            setIsLoadingMore(false);
        };

        loadPendingEvents();
    }, [pendingEvents.length]); // Executa quando pendingEvents muda

    // Filtragem - agora funciona apenas nos eventos visíveis
    useEffect(() => {
        let eventsToFilter = [...allEvents];

        if (searchTerm) {
            eventsToFilter = eventsToFilter.filter(event => 
                event.metadata.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                event.metadata.description.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        if (category !== 'all') {
            eventsToFilter = eventsToFilter.filter(event => event.metadata.category === category);
        }
        
        if (eventType !== 'all') {
            eventsToFilter = eventsToFilter.filter(event => event.metadata.properties.location.type === eventType);
        }
        
        if (isFree !== 'all') {
            const isEventFree = event => Math.min(...event.account.tiers.map(t => t.priceLamports.toNumber())) === 0;
            eventsToFilter = eventsToFilter.filter(event => (isFree === 'yes') ? isEventFree(event) : !isEventFree(event));
        }

        // ✨ ATUALIZADO: Aplicar a mesma lógica de carregamento progressivo aos eventos filtrados
        if (eventsToFilter.length !== allEvents.length || searchTerm || category !== 'all' || eventType !== 'all' || isFree !== 'all') {
            // Se há filtros ativos, mostrar todos os eventos filtrados de uma vez
            setVisibleEvents(eventsToFilter);
            setPendingEvents([]);
        } else {
            // Sem filtros, aplicar carregamento progressivo
            const immediateEvents = eventsToFilter.slice(0, 3);
            const remainingEvents = eventsToFilter.slice(3);
            setVisibleEvents(immediateEvents);
            setPendingEvents(remainingEvents);
        }
    }, [searchTerm, category, eventType, isFree, allEvents]);

    const uniqueCategories = useMemo(() => {
        const categories = new Set(allEvents.map(event => event.metadata.category));
        return ['all', ...Array.from(categories)];
    }, [allEvents]);

   
    const loadMoreEvents = () => {
        if (pendingEvents.length === 0) return;
        
        const nextBatch = pendingEvents.slice(0, 3);
        setVisibleEvents(prev => [...prev, ...nextBatch]);
        setPendingEvents(prev => prev.slice(3));
    };

    return (
        <div className="container mx-auto px-4 py-12">
            <header className="text-center mb-12">
                <h1 className="text-4xl font-bold text-slate-900">Próximos Eventos</h1>
                <p className="mt-2 text-slate-600">Descubra shows, festivais e conferências.</p>
            </header>

            <EventFilters
                searchTerm={searchTerm} setSearchTerm={setSearchTerm}
                category={category} setCategory={setCategory}
                eventType={eventType} setEventType={setEventType}
                isFree={isFree} setIsFree={setIsFree}
                categories={uniqueCategories}
            />

            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 mt-12">
                    {Array.from({ length: 8 }).map((_, i) => (
                        <div key={i} className="bg-slate-200 h-80 rounded-lg animate-pulse"></div>
                    ))}
                </div>
            ) : (
                <>
                    {/* Eventos visíveis */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 mt-12">
                        {visibleEvents.map(event => (
                            <EventCard key={event.publicKey} event={event} />
                        ))}
                        
                        {/* ✨ NOVO: Skeleton loading para eventos que estão sendo carregados */}
                        {isLoadingMore && Array.from({ length: 2 }).map((_, i) => (
                            <div key={`loading-${i}`} className="bg-slate-200 h-80 rounded-lg animate-pulse"></div>
                        ))}
                    </div>

                    {/* ✨ NOVO: Botão "Carregar mais" ou mensagem */}
                    {pendingEvents.length > 0 && !isLoadingMore && (
                        <div className="text-center mt-8">
                            <button
                                onClick={loadMoreEvents}
                                className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition-colors"
                            >
                                Carregar mais eventos ({pendingEvents.length} restantes)
                            </button>
                        </div>
                    )}

                    {visibleEvents.length === 0 && !isLoading && (
                        <div className="text-center text-slate-500 mt-12">
                            Nenhum evento encontrado com os filtros selecionados.
                        </div>
                    )}

                    {/* ✨ NOVO: Indicador de carregamento automático em background */}
                    {pendingEvents.length > 0 && isLoadingMore && (
                        <div className="text-center text-slate-500 mt-4">
                            Carregando mais eventos...
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

// Componente de filtros permanece o mesmo
function EventFilters({ searchTerm, setSearchTerm, category, setCategory, eventType, setEventType, isFree, setIsFree, categories }) {
    return (
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm sticky top-20 z-30">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="relative">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                    <input 
                        type="text"
                        placeholder="Buscar por nome ou palavra-chave..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                    />
                </div>
                <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500">
                    {categories.map(cat => (
                        <option key={cat} value={cat}>{cat === 'all' ? 'Todas as Categorias' : cat}</option>
                    ))}
                </select>
                <select value={eventType} onChange={(e) => setEventType(e.target.value)} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500">
                    <option value="all">Todos os Tipos</option>
                    <option value="Physical">Presencial</option>
                    <option value="Online">Online</option>
                </select>
                <select value={isFree} onChange={(e) => setIsFree(e.target.value)} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500">
                    <option value="all">Todos os Preços</option>
                    <option value="yes">Apenas Gratuitos</option>
                    <option value="no">Apenas Pagos</option>
                </select>
            </div>
        </div>
    );
}