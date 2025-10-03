import { useState, useEffect, useMemo } from 'react';
import { EventSummaryCard } from './EventSummaryCard';
import { InfoBox } from '../ui/InfoBox';
import { Spinner } from '../ui/Spinner';
import { web3, BN } from '@coral-xyz/anchor'; // Importado BN e web3 para cálculo de preços

// Helper para formatar BRL (Reais)
const formatBRL = (amount) => {
    return new Intl.NumberFormat('pt-BR', { 
        style: 'currency', 
        currency: 'BRL',
        minimumFractionDigits: 2
    }).format(amount);
};

// Componente Auxiliar para o progresso de cada lote
const TierProgress = ({ tier }) => {
    // ✅ CORREÇÃO: Converte o preço de Hexadecimal para Decimal (centavos)
    const priceInBRLCents = parseInt(tier.priceBrlCents || '0', 16);
    const priceInBRL = priceInBRLCents / 100;
    
    const progress = tier.maxTicketsSupply > 0 ? (tier.ticketsSold / tier.maxTicketsSupply) * 100 : 0;
    
    // ✅ CORREÇÃO: Receita total baseada no preço em BRL
    const revenue = (tier.ticketsSold * priceInBRL) || 0;

    return (
        <div className="p-4 border rounded-lg bg-white shadow-sm">
            <div className="flex justify-between items-center mb-2">
                <div>
                    <p className="font-bold text-slate-800">{tier.name}</p>
                    {/* ✅ Exibe o preço em BRL */}
                    <p className="text-xs text-slate-500">
                        Preço: {formatBRL(priceInBRL)}
                    </p>
                </div>
                <div className="text-right">
                    <p className="font-semibold text-indigo-600">{tier.ticketsSold} / {tier.maxTicketsSupply}</p>
                    {/* ✅ Exibe a receita em BRL */}
                    <p className="text-xs text-slate-500">Receita Estimada: {formatBRL(revenue)}</p>
                </div>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2">
                <div className="bg-indigo-500 h-2 rounded-full" style={{ width: `${progress}%` }}></div>
            </div>
        </div>
    );
};


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
                const allEvents = await program.account.event.all();
                const userEvents = allEvents
                    .filter(event => event.account.controller.equals(wallet.publicKey))
                    // MODIFICADO: Ordena pela data de início das vendas (dado on-chain)
                    .sort((a, b) => b.account.salesStartDate.toNumber() - a.account.salesStartDate.toNumber());
                setMyEvents(userEvents);
            } catch (err) {
                console.error("Erro ao buscar eventos:", err);
                setError("Não foi possível carregar seus eventos. Tente novamente mais tarde.");
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
                // MODIFICADO: Um evento é considerado "finalizado" após o fim das vendas.
                return myEvents.filter(e => !e.account.canceled && e.account.salesEndDate.toNumber() < now);
            case 'canceled':
                return myEvents.filter(e => e.account.canceled);
            case 'active':
            default:
                // MODIFICADO: Um evento está "ativo" ou "próximo" enquanto não for cancelado e as vendas não tiverem terminado.
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
                    {/* ✅ ATUALIZADO: Passa o componente TierProgress para o EventSummaryCard renderizar os dados */}
                    {filteredEvents.map(event => (
                        <EventSummaryCard 
                            key={event.publicKey.toString()} 
                            event={event.account} 
                            publicKey={event.publicKey} 
                            // Adicionando a lista de tiers para a renderização detalhada
                            TierComponent={TierProgress} 
                        />
                    ))}
                </div>
            ) : (
                <InfoBox 
                    title="Nenhum Evento Encontrado" 
                    message={`Você não tem eventos na categoria "${filter}".`}
                    status="info"
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
