import { useState, useMemo, useEffect } from 'react';
import { EventCard } from '@/components/event/EventCard';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';

// ✨ 1. Importe a API_URL do seu arquivo de constantes.
// Removemos as importações desnecessárias do Anchor e da connection.
import { API_URL } from '@/lib/constants';

export function Events() {
    // Os estados permanecem os mesmos, pois a UI ainda precisa deles.
    const [allEvents, setAllEvents] = useState([]); // Guarda a lista mestra de eventos da API.
    const [filteredEvents, setFilteredEvents] = useState([]); // Eventos exibidos após filtragem.
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [category, setCategory] = useState('all');
    const [eventType, setEventType] = useState('all');
    const [isFree, setIsFree] = useState('all');

    // ✨ 2. Removemos toda a lógica de `useConnection`, `provider` e `program`.
    // O frontend não precisa mais saber como falar com a blockchain diretamente.

    // ✨ 3. O useEffect de busca de dados foi drasticamente simplificado.
    useEffect(() => {
        const fetchEventsFromApi = async () => {
            setIsLoading(true);
            try {
                // Fazemos uma ÚNICA chamada para o nosso backend.
                const response = await fetch(`${API_URL}/api/events/active`);
                if (!response.ok) {
                    throw new Error(`Erro na API: ${response.statusText}`);
                }
                const data = await response.json();

                // A API já nos entrega os dados prontos (on-chain + metadata).
                setAllEvents(data);
                setFilteredEvents(data); // Inicialmente, mostramos todos os eventos ativos.
            } catch (error) {
                console.error("Falha ao buscar eventos da API:", error);
                // Opcional: Adicionar um estado de erro para mostrar na UI.
            } finally {
                setIsLoading(false);
            }
        };

        fetchEventsFromApi();
    }, []); // O array de dependências vazio `[]` garante que isso rode apenas uma vez.

    // ✨ 4. O useEffect de filtragem funciona EXATAMENTE como antes.
    // Ele não se importa de onde os dados vieram (blockchain ou API),
    // apenas que `allEvents` seja um array com a estrutura esperada.
    useEffect(() => {
        let eventsToFilter = [...allEvents];

        // Filtro por termo de busca (nome ou descrição)
        if (searchTerm) {
            eventsToFilter = eventsToFilter.filter(event => 
                event.metadata.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                event.metadata.description.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        // Filtro por categoria
        if (category !== 'all') {
            eventsToFilter = eventsToFilter.filter(event => event.metadata.category === category);
        }
        
        // Filtro por tipo de evento (Físico/Online)
        if (eventType !== 'all') {
            eventsToFilter = eventsToFilter.filter(event => event.metadata.properties.location.type === eventType);
        }
        
        // Filtro por gratuidade
        if (isFree !== 'all') {
            const isEventFree = event => Math.min(...event.account.tiers.map(t => t.priceLamports.toNumber())) === 0;
            eventsToFilter = eventsToFilter.filter(event => (isFree === 'yes') ? isEventFree(event) : !isEventFree(event));
        }

        setFilteredEvents(eventsToFilter);
    }, [searchTerm, category, eventType, isFree, allEvents]);
    
    // O `useMemo` para categorias únicas também continua funcionando perfeitamente.
    const uniqueCategories = useMemo(() => {
        const categories = new Set(allEvents.map(event => event.metadata.category));
        return ['all', ...Array.from(categories)];
    }, [allEvents]);

    // ✨ 5. O JSX para renderização não precisa de NENHUMA alteração.
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
                // Sugestão: Usar um skeleton loader para uma melhor experiência
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 mt-12">
                     {Array.from({ length: 8 }).map((_, i) => (
                        <div key={i} className="bg-slate-200 h-80 rounded-lg animate-pulse"></div>
                    ))}
                </div>
            ) : filteredEvents.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 mt-12">
                    {filteredEvents.map(event => (
                        <EventCard key={event.publicKey} event={event} />
                    ))}
                </div>
            ) : (
                <div className="text-center text-slate-500 mt-12">Nenhum evento encontrado com os filtros selecionados.</div>
            )}
        </div>
    );
}

// O componente de filtros permanece exatamente o mesmo.
function EventFilters({ searchTerm, setSearchTerm, category, setCategory, eventType, setEventType, isFree, setIsFree, categories }) {
    return (
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm sticky top-20 z-30"> {/* Aumentei o z-index por segurança */}
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