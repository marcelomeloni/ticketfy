import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { EventCard } from '@/components/event/EventCard';
import { API_URL } from '@/lib/constants';
import { 
  SparklesIcon, 
  TicketIcon, 
  ShieldCheckIcon, 
  BoltIcon,
  CalendarDaysIcon,
  MapPinIcon,
  UserGroupIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline';

export function Home() {
    const [nextEvents, setNextEvents] = useState([]);
    const [featuredEvent, setFeaturedEvent] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [hasEvents, setHasEvents] = useState(false);

    useEffect(() => {
        const fetchHomeData = async () => {
            setIsLoading(true);
            try {
                console.log('🎯 Buscando 4 próximos eventos (API otimizada)...');
                
                // ✨ NOVA API SUPER RÁPIDA
                const eventsResponse = await fetch(`${API_URL}/api/events/active/next-four`);
                if (!eventsResponse.ok) throw new Error('Falha ao buscar eventos');
                const eventsData = await eventsResponse.json();
                
                console.log(`✅ ${eventsData.length} eventos carregados instantaneamente`);
                
                setNextEvents(eventsData);
                setHasEvents(eventsData.length > 0);
                
     
                if (eventsData.length > 0) {
                    setFeaturedEvent(eventsData[0]);
                }

            } catch (error) {
                console.error("Erro ao buscar dados para a home:", error);
                setHasEvents(false);
            } finally {
                setIsLoading(false);
            }
        };

        fetchHomeData();
    }, []);

    

    // Eventos para a grade (exclui o evento em destaque)
    const gridEvents = featuredEvent 
        ? nextEvents.filter(event => event.publicKey !== featuredEvent.publicKey)
        : nextEvents;

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
            {/* === HERO SECTION === */}
            <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
                {/* Background Elements */}
                <div className="absolute inset-0 bg-black/40 z-0"></div>
                <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-transparent via-slate-900/50 to-slate-900"></div>
                
                {/* Animated Orbs */}
                <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
                
                <div className="container mx-auto px-4 relative z-10">
                    <div className="text-center max-w-6xl mx-auto">
                        {/* Badge */}
                        <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-6 py-3 mb-8">
                            <SparklesIcon className="h-5 w-5 text-cyan-400" />
                            <span className="text-sm font-semibold text-white">
                                Viva experiências inesquecíveis!
                            </span>
                        </div>

                        {/* Main Heading */}
                        <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold mb-8 leading-tight">
                            <span className="text-white">O Futuro dos Eventos é</span>
                            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-fuchsia-500 to-purple-600 animate-gradient-x">
                                Descentralizado
                            </span>
                        </h1>

                        {/* Subheading */}
                        <p className="text-xl md:text-2xl text-slate-300 max-w-4xl mx-auto leading-relaxed mb-12">
                            Descubra eventos incríveis e garanta seus ingressos NFT com segurança total na blockchain. 
                            <span className="text-cyan-400 font-semibold"> Possua seus ingressos de verdade.</span>
                        </p>

                        {/* CTA Buttons */}
                        <div className="flex flex-col sm:flex-row gap-6 justify-center items-center mb-16">
                            <Link 
                                to="/events" 
                                className="group relative bg-gradient-to-r from-cyan-500 to-fuchsia-600 text-white font-bold py-4 px-12 rounded-2xl shadow-2xl shadow-cyan-500/25 hover:shadow-fuchsia-500/40 transition-all duration-300 transform hover:scale-105 hover:-translate-y-1"
                            >
                                <span className="relative z-10 flex items-center gap-3">
                                    Explorar Eventos 
                                    <ArrowRightIcon className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                                </span>
                            </Link>
                        </div>

                    </div>
                </div>
            </section>

            {/* === EVENTO EM DESTAQUE === */}
            {featuredEvent && (
                <section className="py-20 bg-gradient-to-br from-white via-slate-50 to-cyan-50/30">
                    <div className="container mx-auto px-4">
                        <div className="text-center mb-16">
                            <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">
                                Evento em <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-600 to-fuchsia-600">Destaque</span>
                            </h2>
                            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
                                Não perca o evento mais aguardado da temporada
                            </p>
                        </div>

                        <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden max-w-6xl mx-auto">
                            <div className="grid grid-cols-1 lg:grid-cols-2">
                                {/* Imagem do Evento */}
                                <div className="relative h-96 lg:h-full">
                                    <img 
                                        src={featuredEvent.metadata?.image} 
                                        alt={featuredEvent.metadata?.name}
                                        className="w-full h-full object-cover"
                                    />
                                    <div className="absolute top-4 left-4">
                                        <span className="bg-cyan-500 text-white px-4 py-2 rounded-full text-sm font-bold">
                                            Em Destaque
                                        </span>
                                    </div>
                                </div>
                                
                                {/* Informações do Evento */}
                                <div className="p-8 lg:p-12 flex flex-col justify-center">
                                    <div className="flex items-center gap-4 mb-4">
                                        <span className="bg-slate-100 text-slate-700 px-3 py-1 rounded-full text-sm font-medium">
                                            {featuredEvent.metadata?.category || 'Evento'}
                                        </span>
                                        <div className="flex items-center gap-1 text-slate-500">
                                            <UserGroupIcon className="h-4 w-4" />
                                            <span className="text-sm">
                                                {featuredEvent.account?.totalTicketsSold || 0} ingressos vendidos
                                            </span>
                                        </div>
                                    </div>
                                    
                                    <h3 className="text-3xl lg:text-4xl font-bold text-slate-900 mb-4">
                                        {featuredEvent.metadata?.name}
                                    </h3>
                                    
                                    <p className="text-slate-600 text-lg leading-relaxed mb-6">
                                        {featuredEvent.metadata?.description}
                                    </p>
                                    
                                    <div className="space-y-4 mb-8">
                                        <div className="flex items-center gap-3 text-slate-700">
                                            <CalendarDaysIcon className="h-5 w-5 text-cyan-500" />
                                            <span className="font-medium">
                                                {new Date(featuredEvent.metadata?.properties?.dateTime?.start || featuredEvent.account.salesStartDate.toNumber() * 1000).toLocaleDateString('pt-BR', {
                                                    weekday: 'long',
                                                    day: 'numeric',
                                                    month: 'long',
                                                    year: 'numeric'
                                                })}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-3 text-slate-700">
                                            <MapPinIcon className="h-5 w-5 text-cyan-500" />
                                            <span className="font-medium">
                                                {featuredEvent.metadata?.properties?.location?.venueName || 'Online'}
                                            </span>
                                        </div>
                                    </div>
                                    
                                    <Link 
                                        to={`/event/${featuredEvent.publicKey}`}
                                        className="bg-gradient-to-r from-cyan-500 to-fuchsia-600 text-white font-bold py-4 px-8 rounded-2xl text-center hover:shadow-lg hover:shadow-cyan-500/25 transition-all duration-300 transform hover:scale-105"
                                    >
                                        Garantir Meu Ingresso NFT
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            )}

            {/* === PRÓXIMOS EVENTOS === */}
            <section className="py-20 bg-slate-900">
                <div className="container mx-auto px-4">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
                            Próximos <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-500">Eventos</span>
                        </h2>
                        <p className="text-xl text-slate-400 max-w-2xl mx-auto">
                            Descubra experiências incríveis que vão transformar sua rotina
                        </p>
                    </div>

                    {isLoading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {Array.from({ length: 3 }).map((_, i) => (
                                <div key={i} className="bg-slate-800 rounded-3xl h-96 animate-pulse"></div>
                            ))}
                        </div>
                    ) : (
                        <>
                            {/* Grade de Eventos */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                {gridEvents.map(event => (
                                    <EventCard key={event.publicKey} event={event} />
                                ))}
                            </div>

                            {/* Mensagem quando não há eventos */}
                            {!hasEvents && (
                                <div className="text-center text-slate-400 py-12">
                                    <p className="text-lg">Nenhum evento próximo encontrado.</p>
                                    <Link to="/create-event" className="text-cyan-400 hover:text-cyan-300 mt-4 inline-block">
                                        Seja o primeiro a criar um evento!
                                    </Link>
                                </div>
                            )}

                            {/* Link para ver todos os eventos (só mostra se temos eventos) */}
                            {hasEvents && (
                                <div className="text-center mt-12">
                                    <Link 
                                        to="/events" 
                                        className="inline-flex items-center gap-2 text-cyan-400 font-bold text-lg hover:text-cyan-300 transition-colors group"
                                    >
                                        Ver todos os eventos
                                        <ArrowRightIcon className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                                    </Link>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </section>

           
        </div>
    );
}