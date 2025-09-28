// Em: src/components/event/MyEventsList.js

import { useState, useEffect, useMemo } from 'react';
import { EventSummaryCard } from './EventSummaryCard';
import { InfoBox } from '../ui/InfoBox';
import { Spinner } from '../ui/Spinner';
import { bs58 } from '@coral-xyz/anchor/dist/cjs/utils/bytes';

// ✨ NOVO: Importe o coder para desserializar manualmente
import { BorshAccountsCoder } from '@coral-xyz/anchor';

export function MyEventsList({ program, wallet }) {
    const [myEvents, setMyEvents] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [filter, setFilter] = useState('active');

    useEffect(() => {
        // ✨ LÓGICA DE BUSCA TOTALMENTE REFEITA PARA SER MAIS ROBUSTA
        const fetchMyEvents = async () => {
            if (!program || !wallet) {
                setIsLoading(false);
                return;
            }
            try {
                setIsLoading(true);
                setError(null);

                // 1. Obter o "discriminator" da conta Event.
                // É um identificador de 8 bytes que o Anchor coloca no início de cada conta.
                const eventAccountName = 'event'; // O nome da sua struct em Rust, em camelCase
                const eventDiscriminator = BorshAccountsCoder.accountDiscriminator(eventAccountName);

                // 2. Buscar TODAS as contas do programa que pertencem ao usuário atual
                // sem tentar desserializá-las ainda. Isso evita o RangeError.
                const accounts = await program.provider.connection.getProgramAccounts(
                    program.programId,
                    {
                        filters: [
                            // Filtro para o tipo de conta (Event)
                            {
                                memcmp: {
                                    offset: 0,
                                    bytes: bs58.encode(eventDiscriminator),
                                },
                            },
                            // Filtro para o 'controller' (dono do evento)
                            {
                                memcmp: {
                                    offset: 8, // 8 bytes para o discriminator
                                    bytes: wallet.publicKey.toBase58(),
                                },
                            },
                        ],
                    }
                );

                // 3. Tentar desserializar cada conta individualmente.
                const successfullyDecodedEvents = [];
                const coder = new BorshAccountsCoder(program.idl);

                for (const account of accounts) {
                    try {
                        // Tenta decodificar o buffer da conta.
                        const decodedAccount = coder.decode(eventAccountName, account.account.data);

                        // Se bem-sucedido, adiciona à lista com sua chave pública.
                        successfullyDecodedEvents.push({
                            publicKey: account.pubkey,
                            account: decodedAccount,
                        });
                    } catch (e) {
                        // Se falhar (ex: RangeError), loga o erro e a chave da conta problemática e continua.
                        console.warn(`Falha ao desserializar a conta de evento ${account.pubkey.toBase58()}:`, e);
                        // Você pode adicionar uma lógica mais complexa aqui se precisar.
                    }
                }

                // 4. Ordenar os eventos válidos e atualizar o estado.
                const sortedEvents = successfullyDecodedEvents.sort(
                    (a, b) => b.account.salesStartDate.toNumber() - a.account.salesStartDate.toNumber()
                );

                setMyEvents(sortedEvents);

            } catch (err) {
                console.error("Erro geral ao buscar eventos:", err);
                setError(err.message || "Não foi possível carregar seus eventos. Tente novamente mais tarde.");
            } finally {
                setIsLoading(false);
            }
        };

        fetchMyEvents();
    }, [program, wallet]);

    // A lógica de filtragem local (useMemo) e o JSX não precisam de NENHUMA alteração.
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
