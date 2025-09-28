import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { EventCard } from '@/components/event/EventCard';

// ✨ 1. Importamos a API_URL e removemos as importações do Anchor/Solana.
import { API_URL } from '@/lib/constants';

export function Home() {
    // Os estados de controle da UI permanecem os mesmos.
    const [events, setEvents] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    // ✨ 2. Removemos a necessidade de instanciar o `program` do Anchor.
    // O componente não fala mais com a blockchain diretamente.

    // ✨ 3. O useEffect foi simplificado para fazer uma única chamada à API.
    useEffect(() => {
        const fetchUpcomingEvents = async () => {
            setIsLoading(true);
            try {
                // Fazemos a chamada para o nosso endpoint que já retorna os eventos ativos.
                const response = await fetch(`${API_URL}/events/active`);
                if (!response.ok) {
                    throw new Error('Falha ao buscar eventos da API');
                }
                const data = await response.json();

                // A API já retorna os eventos ordenados, então só precisamos pegar os 4 primeiros.
                setEvents(data.slice(0, 4));

            } catch (error) {
                console.error("Erro ao buscar eventos para a home via API:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchUpcomingEvents();
    }, []); // O array de dependências vazio `[]` garante que a busca ocorra apenas uma vez.

    return (
        <>
            {/* --- Hero Section (sem alterações) --- */}
            <div className="relative text-center py-24 md:py-32 bg-slate-900 text-white overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/80 to-transparent z-10"></div>
                {/* Você pode querer mudar a imagem de fundo para algo real */}
                <div className="absolute inset-0 bg-[url('/img/hero-background.jpg')] bg-cover bg-center opacity-20"></div>
                
                <div className="container mx-auto px-4 relative z-20">
                    <h1 className="text-4xl md:text-6xl font-bold mb-4 leading-tight">
                        O Futuro dos Eventos é
                        <span className="block text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-500 to-cyan-400">
                            Descentralizado
                        </span>
                    </h1>
                    <p className="text-lg md:text-xl max-w-3xl mx-auto text-slate-300 leading-relaxed">
                        Bem-vindo à Ticketfy. Compre, venda e valide seus ingressos NFT com segurança e transparência na blockchain Solana.
                    </p>
                    <div className="mt-8">
                        <Link to="/events" className="bg-fuchsia-600 hover:bg-fuchsia-700 text-white font-bold py-3 px-8 rounded-lg shadow-lg shadow-fuchsia-500/50 transition-all transform hover:scale-105 inline-block">
                            Explorar Eventos
                        </Link>
                    </div>
                </div>
            </div>

            {/* --- Seção de Próximos Eventos --- */}
            <div className="container mx-auto px-4 py-16 md:py-24">
                <div className="text-center mb-12">
                    <h2 className="text-4xl font-bold text-slate-900">Próximos Eventos</h2>
                    <p className="mt-2 text-slate-600">Garanta seu lugar nos eventos mais aguardados.</p>
                </div>

                {/* ✨ 4. O JSX de renderização não muda, mas melhorei o estado de loading com um Skeleton. */}
                {isLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                        {/* Skeleton Loader para uma melhor experiência de usuário */}
                        {Array.from({ length: 4 }).map((_, i) => (
                            <div key={i} className="bg-slate-200 h-96 rounded-lg animate-pulse"></div>
                        ))}
                    </div>
                ) : events.length > 0 ? (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                            {events.map(event => (
                                <EventCard key={event.publicKey} event={event} />
                            ))}
                        </div>
                        <div className="text-center mt-12">
                            <Link to="/events" className="text-indigo-600 font-semibold hover:underline">
                                Ver todos os eventos &rarr;
                            </Link>
                        </div>
                    </>
                ) : (
                    <div className="text-center text-slate-500">Nenhum evento próximo encontrado.</div>
                )}
            </div>
        </>
    );
}