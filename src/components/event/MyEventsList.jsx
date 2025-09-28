import { useState, useEffect, useMemo } from 'react';
import { EventSummaryCard } from './EventSummaryCard';
import { InfoBox } from '../ui/InfoBox';
import { Spinner } from '../ui/Spinner';

// ✨ 1. Importe o bs58 para o filtro memcmp
import { bs58 } from '@coral-xyz/anchor/dist/cjs/utils/bytes';

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

                // ✨ 2. Lógica de busca modificada para ser mais robusta
                // Filtramos on-chain por todos os estados válidos para ignorar contas antigas/incompatíveis.
                // O offset 48 assume a sua nova struct com o campo `state` movido para o topo.
                const stateFilters = [0, 1, 2, 3].map(stateValue => ({
                    memcmp: {
                        offset: 49, // 8 (discriminator) + 8 (event_id) + 32 (controller) = 48
                        bytes: bs58.encode([stateValue]),
                    }
                }));
                
                // Executa as buscas para cada estado em paralelo para mais performance
                const eventArrays = await Promise.all(
                    stateFilters.map(filter => program.account.event.all([filter]))
                );

                // Junta todos os eventos encontrados de todos os estados em um único array
                const allCompatibleEvents = eventArrays.flat();

                const userEvents = allCompatibleEvents
                    .filter(event => event.account.controller.equals(wallet.publicKey))
                    .sort((a, b) => b.account.salesStartDate.toNumber() - a.account.salesStartDate.toNumber());
                
                setMyEvents(userEvents);
            } catch (err) {
                console.error("Erro ao buscar eventos:", err);
                // Mantemos a mensagem de erro original, pois pode ser útil
                setError(err.message || "Não foi possível carregar seus eventos. Tente novamente mais tarde.");
            } finally {
                setIsLoading(false);
            }
        };
        fetchMyEvents();
    }, [program, wallet]);

    // ✨ 3. A lógica de filtragem local (useMemo) e o JSX não precisam de NENHUMA alteração.
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

