import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { EventCard } from '@/components/event/EventCard';
import { API_URL } from '@/lib/constants';
import { 
  MagnifyingGlassIcon,
  FunnelIcon,
  MapPinIcon,
  CalendarDaysIcon,
  TagIcon,
  XMarkIcon,
  AdjustmentsHorizontalIcon,
  SparklesIcon,
  FireIcon,
  StarIcon,
  ClockIcon,
  UsersIcon
} from '@heroicons/react/24/outline';

// Função auxiliar para extrair timestamp de salesStartDate
const getSalesStartTimestamp = (event) => {
  const salesStartDate = event.account.salesStartDate;
  
  // Se for um objeto Anchor BN (tem método toNumber)
  if (salesStartDate && typeof salesStartDate.toNumber === 'function') {
    return salesStartDate.toNumber();
  }
  
  // Se já for um número (vindo da API rápida)
  if (typeof salesStartDate === 'number') {
    return salesStartDate;
  }
  
  // Se for string ou outro formato, tenta converter
  return Number(salesStartDate) || 0;
};

// Função auxiliar para obter data do evento
const getEventDate = (event) => {
  // Prioriza a data dos metadados
  if (event.metadata?.properties?.dateTime?.start) {
    return new Date(event.metadata.properties.dateTime.start);
  }
  
  // Fallback para salesStartDate (convertendo de segundos para milissegundos)
  const salesStartTimestamp = getSalesStartTimestamp(event);
  return new Date(salesStartTimestamp * 1000);
};

export function Events() {
    const [events, setEvents] = useState([]);
    const [filteredEvents, setFilteredEvents] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [selectedDate, setSelectedDate] = useState('all');
    const [selectedLocation, setSelectedLocation] = useState('all');
    const [sortBy, setSortBy] = useState('date');
    const [showFilters, setShowFilters] = useState(false);

    // Buscar eventos
    useEffect(() => {
        const fetchEvents = async () => {
            setIsLoading(true);
            try {
                console.log('🎯 Buscando eventos (API otimizada)...');
                const eventsResponse = await fetch(`${API_URL}/api/events/active/fast`);
                if (!eventsResponse.ok) throw new Error('Falha ao buscar eventos');
                const eventsData = await eventsResponse.json();
                
                console.log(`✅ ${eventsData.length} eventos carregados`);
                setEvents(eventsData);
                setFilteredEvents(eventsData);

            } catch (error) {
                console.error("Erro ao buscar eventos:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchEvents();
    }, []);

    // Extrair categorias únicas
    const categories = useMemo(() => {
        const cats = events
            .map(event => event.metadata?.category)
            .filter(Boolean)
            .filter((cat, index, self) => self.indexOf(cat) === index);
        return ['all', ...cats];
    }, [events]);

    // Extrair localizações únicas
    const locations = useMemo(() => {
        const locs = events
            .map(event => event.metadata?.properties?.location?.venueName || 'Online')
            .filter((loc, index, self) => self.indexOf(loc) === index);
        return ['all', ...locs];
    }, [events]);

    // Aplicar filtros e busca
    useEffect(() => {
        let results = events;

        // Filtro de busca
        if (searchTerm) {
            results = results.filter(event => 
                event.metadata?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                event.metadata?.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                event.metadata?.category?.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        // Filtro de categoria
        if (selectedCategory !== 'all') {
            results = results.filter(event => 
                event.metadata?.category === selectedCategory
            );
        }

        // Filtro de localização
        if (selectedLocation !== 'all') {
            results = results.filter(event => 
                (event.metadata?.properties?.location?.venueName || 'Online') === selectedLocation
            );
        }

        // Filtro de data - CORRIGIDO
        if (selectedDate !== 'all') {
            const now = new Date();
            const tomorrow = new Date(now);
            tomorrow.setDate(tomorrow.getDate() + 1);
            
            const nextWeek = new Date(now);
            nextWeek.setDate(nextWeek.getDate() + 7);

            results = results.filter(event => {
                const eventDate = getEventDate(event);
                
                switch (selectedDate) {
                    case 'today':
                        return eventDate.toDateString() === now.toDateString();
                    case 'tomorrow':
                        return eventDate.toDateString() === tomorrow.toDateString();
                    case 'week':
                        return eventDate >= now && eventDate <= nextWeek;
                    case 'month':
                        const nextMonth = new Date(now);
                        nextMonth.setMonth(nextMonth.getMonth() + 1);
                        return eventDate >= now && eventDate <= nextMonth;
                    default:
                        return true;
                }
            });
        }

        // Ordenação - CORRIGIDO
        results.sort((a, b) => {
            switch (sortBy) {
                case 'date':
                    const aTimestamp = getSalesStartTimestamp(a);
                    const bTimestamp = getSalesStartTimestamp(b);
                    return aTimestamp - bTimestamp;
                case 'name':
                    return (a.metadata?.name || '').localeCompare(b.metadata?.name || '');
                case 'popular':
                    return (b.account.totalTicketsSold || 0) - (a.account.totalTicketsSold || 0);
                default:
                    return 0;
            }
        });

        setFilteredEvents(results);
    }, [events, searchTerm, selectedCategory, selectedLocation, selectedDate, sortBy]);

    // Limpar filtros
    const clearFilters = () => {
        setSearchTerm('');
        setSelectedCategory('all');
        setSelectedLocation('all');
        setSelectedDate('all');
        setSortBy('date');
    };

    // Estatísticas rápidas - CORRIGIDO
    const stats = {
        total: events.length,
        online: events.filter(e => (e.metadata?.properties?.location?.venueName || 'Online') === 'Online').length,
        thisWeek: events.filter(e => {
            const eventDate = getEventDate(e);
            const nextWeek = new Date();
            nextWeek.setDate(nextWeek.getDate() + 7);
            return eventDate <= nextWeek;
        }).length
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-cyan-50">
            {/* === HEADER === */}
            <div className="bg-slate-900 text-white py-16">
                <div className="container mx-auto px-4">
                    <div className="text-center max-w-4xl mx-auto">
                        <h1 className="text-4xl md:text-6xl font-bold mb-6">
                            Descubra Eventos <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-500">Exclusivos</span>
                        </h1>
                        <p className="text-xl text-slate-300 mb-8">
                            Encontre os melhores eventos e garanta seus ingressos NFT com segurança e facilidade
                        </p>
                        
                        {/* Barra de Pesquisa Principal */}
                        <div className="relative max-w-2xl mx-auto">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <MagnifyingGlassIcon className="h-5 w-5 text-slate-400" />
                            </div>
                            <input
                                type="text"
                                placeholder="Buscar eventos, categorias, artistas..."
                                className="w-full pl-12 pr-4 py-4 bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl text-white placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                            {searchTerm && (
                                <button
                                    onClick={() => setSearchTerm('')}
                                    className="absolute inset-y-0 right-3 flex items-center"
                                >
                                    <XMarkIcon className="h-5 w-5 text-slate-400 hover:text-white" />
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* === FILTROS E CONTROLES === */}
            <div className="container mx-auto px-4 -mt-8">
                <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-6 mb-8">
                    <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
                        {/* Estatísticas Rápidas */}
                        <div className="flex items-center gap-6 text-sm text-slate-600">
                            <span className="flex items-center gap-2">
                                <UsersIcon className="h-4 w-4" />
                                {stats.total} eventos
                            </span>
                            <span className="flex items-center gap-2">
                                <SparklesIcon className="h-4 w-4" />
                                {stats.thisWeek} esta semana
                            </span>
                            <span className="flex items-center gap-2">
                                <MapPinIcon className="h-4 w-4" />
                                {stats.online} online
                            </span>
                        </div>

                        {/* Controles */}
                        <div className="flex flex-wrap gap-3 items-center">
                            {/* Botão Filtros */}
                            <button
                                onClick={() => setShowFilters(!showFilters)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-colors ${
                                    showFilters 
                                        ? 'bg-cyan-500 text-white border-cyan-500' 
                                        : 'bg-white text-slate-700 border-slate-300 hover:border-cyan-400'
                                }`}
                            >
                                <AdjustmentsHorizontalIcon className="h-4 w-4" />
                                Filtros
                                {(selectedCategory !== 'all' || selectedLocation !== 'all' || selectedDate !== 'all') && (
                                    <span className="bg-cyan-500 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center">
                                        !
                                    </span>
                                )}
                            </button>

                            {/* Ordenação */}
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value)}
                                className="px-4 py-2 rounded-xl border border-slate-300 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                            >
                                <option value="date">Ordenar por Data</option>
                                <option value="name">Ordenar por Nome</option>
                                <option value="popular">Mais Populares</option>
                            </select>

                            {/* Limpar Filtros */}
                            {(searchTerm || selectedCategory !== 'all' || selectedLocation !== 'all' || selectedDate !== 'all') && (
                                <button
                                    onClick={clearFilters}
                                    className="flex items-center gap-2 px-4 py-2 text-red-600 hover:text-red-700 transition-colors"
                                >
                                    <XMarkIcon className="h-4 w-4" />
                                    Limpar
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Filtros Expandidos */}
                    {showFilters && (
                        <div className="mt-6 pt-6 border-t border-slate-200">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {/* Filtro de Categoria */}
                                <div>
                                    <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-3">
                                        <TagIcon className="h-4 w-4" />
                                        Categoria
                                    </label>
                                    <select
                                        value={selectedCategory}
                                        onChange={(e) => setSelectedCategory(e.target.value)}
                                        className="w-full border border-slate-300 rounded-xl p-3 bg-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
                                    >
                                        <option value="all">Todas as categorias</option>
                                        {categories.filter(cat => cat !== 'all').map(category => (
                                            <option key={category} value={category}>
                                                {category}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Filtro de Localização */}
                                <div>
                                    <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-3">
                                        <MapPinIcon className="h-4 w-4" />
                                        Localização
                                    </label>
                                    <select
                                        value={selectedLocation}
                                        onChange={(e) => setSelectedLocation(e.target.value)}
                                        className="w-full border border-slate-300 rounded-xl p-3 bg-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
                                    >
                                        <option value="all">Todas as localizações</option>
                                        {locations.filter(loc => loc !== 'all').map(location => (
                                            <option key={location} value={location}>
                                                {location}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Filtro de Data */}
                                <div>
                                    <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-3">
                                        <CalendarDaysIcon className="h-4 w-4" />
                                        Data
                                    </label>
                                    <select
                                        value={selectedDate}
                                        onChange={(e) => setSelectedDate(e.target.value)}
                                        className="w-full border border-slate-300 rounded-xl p-3 bg-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
                                    >
                                        <option value="all">Qualquer data</option>
                                        <option value="today">Hoje</option>
                                        <option value="tomorrow">Amanhã</option>
                                        <option value="week">Esta semana</option>
                                        <option value="month">Este mês</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* === RESULTADOS === */}
                <div className="mb-6 flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-slate-900">
                        {filteredEvents.length} {filteredEvents.length === 1 ? 'evento encontrado' : 'eventos encontrados'}
                    </h2>
                    
                    {/* Tags de Filtros Ativos */}
                    <div className="flex flex-wrap gap-2">
                        {searchTerm && (
                            <span className="inline-flex items-center gap-1 bg-cyan-100 text-cyan-800 px-3 py-1 rounded-full text-sm">
                                "{searchTerm}"
                                <button onClick={() => setSearchTerm('')}>
                                    <XMarkIcon className="h-3 w-3" />
                                </button>
                            </span>
                        )}
                        {selectedCategory !== 'all' && (
                            <span className="inline-flex items-center gap-1 bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm">
                                {selectedCategory}
                                <button onClick={() => setSelectedCategory('all')}>
                                    <XMarkIcon className="h-3 w-3" />
                                </button>
                            </span>
                        )}
                        {selectedLocation !== 'all' && (
                            <span className="inline-flex items-center gap-1 bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm">
                                {selectedLocation}
                                <button onClick={() => setSelectedLocation('all')}>
                                    <XMarkIcon className="h-3 w-3" />
                                </button>
                            </span>
                        )}
                        {selectedDate !== 'all' && (
                            <span className="inline-flex items-center gap-1 bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-sm">
                                {selectedDate === 'today' ? 'Hoje' : 
                                 selectedDate === 'tomorrow' ? 'Amanhã' : 
                                 selectedDate === 'week' ? 'Esta semana' : 'Este mês'}
                                <button onClick={() => setSelectedDate('all')}>
                                    <XMarkIcon className="h-3 w-3" />
                                </button>
                            </span>
                        )}
                    </div>
                </div>

                {/* === GRADE DE EVENTOS === */}
                {isLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {Array.from({ length: 8 }).map((_, i) => (
                            <div key={i} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 animate-pulse">
                                <div className="bg-slate-200 rounded-xl h-48 mb-4"></div>
                                <div className="space-y-3">
                                    <div className="bg-slate-200 rounded h-4"></div>
                                    <div className="bg-slate-200 rounded h-3 w-2/3"></div>
                                    <div className="bg-slate-200 rounded h-3 w-1/2"></div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : filteredEvents.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {filteredEvents.map(event => (
                            <EventCard key={event.publicKey} event={event} />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-16">
                        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-12 max-w-md mx-auto">
                            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <MagnifyingGlassIcon className="h-8 w-8 text-slate-400" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-2">Nenhum evento encontrado</h3>
                            <p className="text-slate-600 mb-6">
                                Tente ajustar os filtros ou buscar por outros termos.
                            </p>
                            <button
                                onClick={clearFilters}
                                className="bg-gradient-to-r from-cyan-500 to-fuchsia-600 text-white font-bold py-3 px-6 rounded-2xl hover:shadow-lg transition-all duration-300"
                            >
                                Limpar Filtros
                            </button>
                        </div>
                    </div>
                )}

                {/* === CTA FINAL === */}
                {!isLoading && filteredEvents.length > 0 && (
                    <div className="text-center mt-16 mb-8">
                        <div className="bg-gradient-to-r from-cyan-500 to-fuchsia-600 rounded-3xl p-8 text-white">
                            <h3 className="text-2xl font-bold mb-4">
                                Não encontrou o que procurava?
                            </h3>
                            <p className="text-cyan-100 mb-6 max-w-md mx-auto">
                                Crie seu próprio evento e compartilhe experiências incríveis com a comunidade.
                            </p>
                            <Link 
                                to="/create-event"
                                className="inline-flex items-center gap-2 bg-white text-cyan-600 font-bold py-3 px-6 rounded-2xl hover:shadow-lg transition-all duration-300"
                            >
                                <SparklesIcon className="h-5 w-5" />
                                Criar Evento
                            </Link>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
