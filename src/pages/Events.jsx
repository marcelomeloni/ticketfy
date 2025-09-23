import { useState, useMemo, useEffect } from 'react';
import { useConnection } from '@solana/wallet-adapter-react';
import { Program, AnchorProvider } from '@coral-xyz/anchor';
import idl from '@/idl/ticketing_system.json';
import { EventCard } from '@/components/event/EventCard';
import { MagnifyingGlassIcon, FunnelIcon } from '@heroicons/react/24/outline';

import { PROGRAM_ID } from '@/lib/constants';

export function Events() {
    const { connection } = useConnection();
    const [allEvents, setAllEvents] = useState([]); // Guarda todos os eventos com metadados
    const [filteredEvents, setFilteredEvents] = useState([]); // Eventos exibidos após filtragem
    const [isLoading, setIsLoading] = useState(true);

    // Estados para os filtros
    const [searchTerm, setSearchTerm] = useState('');
    const [category, setCategory] = useState('all');
    const [eventType, setEventType] = useState('all');
    const [isFree, setIsFree] = useState('all'); // 'all', 'yes', 'no'

    const provider = useMemo(() => new AnchorProvider(connection, {}, AnchorProvider.defaultOptions()), [connection]);
    const program = useMemo(() => new Program(idl, PROGRAM_ID, provider), [provider]);

    // Efeito para buscar todos os eventos on-chain e seus metadados off-chain
    useEffect(() => {
        const fetchAllEventsAndMetadata = async () => {
            if (!program) return;
            setIsLoading(true);
            try {
                // 1. Busca todos os eventos on-chain
                const onChainEvents = await program.account.event.all();
                
                // 2. Filtra preliminarmente por eventos ativos
                const nowInSeconds = Math.floor(Date.now() / 1000);
                const activeOnChainEvents = onChainEvents.filter(event => {
                    const acc = event.account;
                    return acc.state === 1 && !acc.canceled && nowInSeconds <= acc.salesEndDate.toNumber();
                });

                // 3. Busca os metadados para cada evento ativo
                const eventsWithMetadata = await Promise.all(
                    activeOnChainEvents.map(async (event) => {
                        try {
                            const metadataUrl = event.account.metadataUri.startsWith('http') ? event.account.metadataUri : `https://${event.account.metadataUri}`;
                            const response = await fetch(metadataUrl);
                            if (!response.ok) return null; // Ignora se não conseguir buscar
                            const metadata = await response.json();
                            return { ...event, metadata }; // Combina dados on-chain e off-chain
                        } catch {
                            return null; // Ignora em caso de erro
                        }
                    })
                );

                const validEvents = eventsWithMetadata
                    .filter(e => e !== null) // Remove os que falharam
                    .sort((a, b) => a.account.salesStartDate.toNumber() - b.account.salesStartDate.toNumber());

                setAllEvents(validEvents);
                setFilteredEvents(validEvents); // Inicialmente, todos os eventos são exibidos

            } catch (error) {
                console.error("Erro ao buscar eventos:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchAllEventsAndMetadata();
    }, [program]);

    // Efeito para aplicar os filtros sempre que um filtro mudar
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
    
    // Extrai categorias únicas para o seletor de filtro
    const uniqueCategories = useMemo(() => {
        const categories = new Set(allEvents.map(event => event.metadata.category));
        return ['all', ...Array.from(categories)];
    }, [allEvents]);


    return (
        <div className="container mx-auto px-4 py-12">
            <header className="text-center mb-12">
                <h1 className="text-4xl font-bold text-slate-900">Próximos Eventos</h1>
                <p className="mt-2 text-slate-600">Descubra shows, festivais e conferências.</p>
            </header>

            <EventFilters
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                category={category}
                setCategory={setCategory}
                eventType={eventType}
                setEventType={setEventType}
                isFree={isFree}
                setIsFree={setIsFree}
                categories={uniqueCategories}
            />

            {isLoading ? (
                <div className="text-center text-slate-500 mt-12">Carregando eventos...</div>
            ) : filteredEvents.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 mt-12">
                    {filteredEvents.map(event => (
                        <EventCard key={event.publicKey.toString()} event={event} />
                    ))}
                </div>
            ) : (
                <div className="text-center text-slate-500 mt-12">Nenhum evento encontrado com os filtros selecionados.</div>
            )}
        </div>
    );
}

// --- Componente da Barra de Filtros ---
function EventFilters({ searchTerm, setSearchTerm, category, setCategory, eventType, setEventType, isFree, setIsFree, categories }) {
    return (
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm sticky top-4 z-10">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Campo de Busca */}
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

                {/* Filtro de Categoria */}
                <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500">
                    {categories.map(cat => (
                        <option key={cat} value={cat}>{cat === 'all' ? 'Todas as Categorias' : cat}</option>
                    ))}
                </select>

                {/* Filtro de Tipo */}
                <select value={eventType} onChange={(e) => setEventType(e.target.value)} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500">
                    <option value="all">Todos os Tipos</option>
                    <option value="Physical">Presencial</option>
                    <option value="Online">Online</option>
                </select>

                {/* Filtro de Preço */}
                <select value={isFree} onChange={(e) => setIsFree(e.target.value)} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500">
                    <option value="all">Todos os Preços</option>
                    <option value="yes">Apenas Gratuitos</option>
                    <option value="no">Apenas Pagos</option>
                </select>
            </div>
        </div>
    );
}