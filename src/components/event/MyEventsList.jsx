// Em: src/components/event/MyEventsList.js

import { useState, useEffect, useMemo } from 'react';
import { EventSummaryCard } from './EventSummaryCard';
import { InfoBox } from '../ui/InfoBox';
import { Spinner } from '../ui/Spinner';



export function MyEventsList({ program, wallet }) {
    const [myEvents, setMyEvents] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [filter, setFilter] = useState('active');

    useEffect(() => {
       
        const fetchMyEvents = async () => {
            if (!program || !wallet) {
                setIsLoading(false);
                return;
            }
            try {
                setIsLoading(true);
                setError(null);

             
                // Filtramos diretamente na blockchain por eventos criados pela carteira do usuário.
                const userEvents = await program.account.event.all([
                    {
                        memcmp: {
                            offset: 8, 
                            bytes: wallet.publicKey.toBase58(),
                        },
                    },
                ]);
                
               
                const sortedEvents = userEvents.sort(
                    (a, b) => b.account.salesStartDate.toNumber() - a.account.salesStartDate.toNumber()
                );

                setMyEvents(sortedEvents);

            } catch (err) {
                console.error("Erro ao buscar 'Meus Eventos':", err);
                setError(err.message || "Não foi possível carregar seus eventos. Tente novamente mais tarde.");
            } finally {
                setIsLoading(false);
            }
        };

        fetchMyEvents();
    }, [program, wallet]);

  
    const filteredEvents = useMemo(() => {
        const now = Math.floor(Date.now() / 1000);
        switch (filter) {
            case 'finished':
                return myEvents.filter(e => !e.account.canceled && e.account.salesEndDate.toNumber() < now);
            case 'canceled':
                return myEvents.filter(e => e.account.canceled);
            case 'active':
            default:
                return myEvents.filter(e => !e.account.canceled && e.account.salesEndDate.toNumber() >= now);
        }
    }, [myEvents, filter]);

    if (isLoading) return <div className="flex justify-center items-center h-48"><Spinner /></div>;
    if (error) return <InfoBox title="Ocorreu um Erro" message={error} status="error" />;

    return (
        <div className="max-w-5xl mx-auto">
            <div className="border-b border-slate-200 mb-6">
                <nav className="-mb-px flex space-x-6">
                    <TabButton name="Ativos & Próximos" active={filter === 'active'} onClick={() => setFilter('active')} />
                    <TabButton name="Finalizados" active={filter === 'finished'} onClick={() => setFilter('finished')} />
                    <TabButton name="Cancelados" active={filter === 'canceled'} onClick={() => setFilter('canceled')} />
                </nav>
            </div>
            
            {filteredEvents.length > 0 ? (
                <div className="space-y-6">
                    {filteredEvents.map(event => (
                        <EventSummaryCard key={event.publicKey.toString()} event={event.account} publicKey={event.publicKey} />
                    ))}
                </div>
            ) : (
                <InfoBox 
                    title="Nenhum Evento Encontrado" 
                    message={`Você não tem eventos na categoria "${filter}". Crie um novo evento na aba ao lado!`}
                />
            )}
        </div>
    );
}

const TabButton = ({ name, active, onClick }) => (
    <button onClick={onClick} className={`px-1 py-3 text-sm font-semibold transition-colors ${active ? 'border-indigo-500 text-indigo-600 border-b-2' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
        {name}
    </button>
);
