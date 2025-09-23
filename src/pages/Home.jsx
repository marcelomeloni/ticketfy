import { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useConnection } from '@solana/wallet-adapter-react';
import { Program } from '@coral-xyz/anchor';
import idl from '@/idl/ticketing_system.json';
import { createReadOnlyProgram } from '@/lib/program';

// Importe seu componente de card de evento
import { EventCard } from '@/components/event/EventCard';

const PROGRAM_ADDRESS = "6BpG2uYeLSgHEynoT7VrNb6BpHSiwXPyayvECgCaizL5";

export function Home() {
    const { connection } = useConnection();
    const [events, setEvents] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    const program = useMemo(() => createReadOnlyProgram(connection), [connection]);

    useEffect(() => {
        const fetchUpcomingEvents = async () => {
            if (!program) return;
            try {
                const allEvents = await program.account.event.all();
                const nowInSeconds = Math.floor(Date.now() / 1000);

                const activeEvents = allEvents.filter(event => {
                    const acc = event.account;
                    const isActiveState = acc.state === 1;
                    const isNotCanceled = !acc.canceled;
                    const salesHaveNotEnded = nowInSeconds <= acc.salesEndDate.toNumber();
                    return isActiveState && isNotCanceled && salesHaveNotEnded;
                });

                activeEvents.sort((a, b) => a.account.salesStartDate.toNumber() - b.account.salesStartDate.toNumber());

                // Pega apenas os próximos 4 eventos para exibir na home
                setEvents(activeEvents.slice(0, 4));

            } catch (error) {
                console.error("Erro ao buscar eventos para a home:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchUpcomingEvents();
    }, [program]);

    return (
        <>
            {/* --- Hero Section --- */}
       <div className="relative text-center py-24 md:py-32 bg-slate-900 text-white overflow-hidden">
    {/* Background e Overlays (sem alteração) */}
    <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/80 to-transparent z-10"></div>
    <div className="absolute inset-0 bg-[url('/path-to-your/hero-background.jpg')] bg-cover bg-center opacity-20"></div>
    
    <div className="container mx-auto px-4 relative z-20">
        
        <h1 className="text-4xl md:text-6xl font-bold mb-4 leading-tight">
            O Futuro dos Eventos é
            {/* A classe agora é apenas "block", forçando a quebra de linha sempre */}
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

                {isLoading ? (
                    <div className="text-center text-slate-500">Carregando...</div>
                ) : events.length > 0 ? (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                            {events.map(event => (
                                <EventCard key={event.publicKey.toString()} event={event} />
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

