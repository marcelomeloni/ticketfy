// src/components/event/MyEventsList.jsx
import { useState, useEffect, useMemo } from 'react';
import { EventSummaryCard } from './EventSummaryCard';
import { InfoBox } from '../ui/InfoBox';
import { API_URL } from '@/lib/constants';
import { PublicKey } from '@solana/web3.js';

export function MyEventsList({ program, wallet }) {
    const [myEvents, setMyEvents] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [filter, setFilter] = useState('active');

    useEffect(() => {
        const fetchMyEvents = async () => {
            if (!wallet || !wallet.publicKey) {
                setIsLoading(false);
                return;
            }
            
            try {
                setIsLoading(true);
                setError(null);
                
                console.log(`🎯 Buscando eventos do usuário: ${wallet.publicKey.toString()}`);
                
                // ✅ BUSCA DIRETA DO SUPABASE - MUITO MAIS RÁPIDO E CONFIÁVEL
                const response = await fetch(`${API_URL}/api/events/management/${wallet.publicKey.toString()}`);
                
                if (!response.ok) {
                    throw new Error(`Falha ao buscar eventos: ${response.status}`);
                }
                
                const data = await response.json();
                
                if (data.success) {
                    console.log(`✅ ${data.events?.length || 0} eventos encontrados via API`);
                    setMyEvents(data.events || []);
                } else {
                    throw new Error(data.error || 'Erro desconhecido da API');
                }
                
            } catch (err) {
                console.error("❌ Erro ao buscar eventos:", err);
                setError("Não foi possível carregar seus eventos. Tente novamente mais tarde.");
                
                // ✅ FALLBACK: Tenta buscar da blockchain se a API falhar
                try {
                    console.log('🔄 Tentando fallback para busca on-chain...');
                    if (program) {
                        const allEvents = await program.account.event.all();
                        const userEvents = allEvents
                            .filter(event => event.account.controller.equals(wallet.publicKey))
                            .sort((a, b) => b.account.salesStartDate.toNumber() - a.account.salesStartDate.toNumber());
                        
                        console.log(`✅ ${userEvents.length} eventos carregados via fallback on-chain`);
                        setMyEvents(userEvents);
                    }
                } catch (fallbackError) {
                    console.error('❌ Fallback on-chain também falhou:', fallbackError);
                    setMyEvents([]);
                }
            } finally {
                setIsLoading(false);
            }
        };
        
        fetchMyEvents();
    }, [program, wallet]);

    const filteredEvents = useMemo(() => {
        const now = Math.floor(Date.now() / 1000);
        
        return myEvents.filter(event => {
            const account = event.account || event;
            const salesEndDate = account.salesEndDate?.toNumber?.() || account.sales_end_date;
            const isCanceled = account.canceled || account.isCanceled;
            
            switch (filter) {
                case 'finished':
                    return !isCanceled && salesEndDate && salesEndDate < now;
                case 'canceled':
                    return isCanceled;
                case 'active':
                default:
                    return !isCanceled && (!salesEndDate || salesEndDate >= now);
            }
        });
    }, [myEvents, filter]);

    if (isLoading) {
        return (
            <div className="space-y-6">
                <CardSkeleton />
                <CardSkeleton />
                <CardSkeleton />
            </div>
        );
    }
    
    if (error && myEvents.length === 0) {
        return <InfoBox title="Ocorreu um Erro" message={error} status="error" />;
    }

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
                        <EventSummaryCard 
                            key={event.publicKey?.toString() || event.event_address} 
                            event={event.account || event} 
                            publicKey={new PublicKey(event.publicKey || event.event_address)} 
                        />
                    ))}
                </div>
            ) : (
                <InfoBox 
                    title="Nenhum Evento Encontrado" 
                    message={`Você não tem eventos na categoria "${filter}".`}
                />
            )}
            
            {/* Aviso se houve erro mas ainda temos eventos */}
            {error && myEvents.length > 0 && (
                <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
                    <p className="text-yellow-800 text-sm">
                        <strong>Aviso:</strong> {error} Alguns dados podem estar incompletos.
                    </p>
                </div>
            )}
        </div>
    );
}

const TabButton = ({ name, active, onClick }) => (
    <button 
        onClick={onClick} 
        className={`px-1 py-3 text-sm font-semibold transition-colors ${
            active ? 'border-indigo-500 text-indigo-600 border-b-2' : 'border-transparent text-slate-500 hover:text-slate-700'
        }`}
    >
        {name}
    </button>
);

// Componente Skeleton para loading
const CardSkeleton = () => (
    <div className="bg-white p-6 rounded-xl border animate-pulse">
        <div className="flex flex-col sm:flex-row justify-between gap-4">
            <div className="flex-grow space-y-4">
                <div className="flex items-center gap-4">
                    <div className="h-8 bg-slate-200 rounded w-1/2"></div>
                    <div className="h-6 bg-slate-200 rounded-full w-24"></div>
                </div>
                <div className="flex items-center text-sm gap-6">
                    <div className="h-4 bg-slate-200 rounded w-1/4"></div>
                    <div className="h-4 bg-slate-200 rounded w-1/3"></div>
                </div>
                <div>
                    <div className="flex justify-between items-center mb-1">
                        <div className="h-4 bg-slate-200 rounded w-1/3"></div>
                        <div className="h-4 bg-slate-200 rounded w-1/4"></div>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2.5"></div>
                </div>
            </div>
            <div className="flex-shrink-0 flex items-center">
                <div className="h-10 bg-slate-200 rounded-lg w-40"></div>
            </div>
        </div>
    </div>
);