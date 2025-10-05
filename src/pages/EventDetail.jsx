import { useState, useMemo, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useConnection } from '@solana/wallet-adapter-react';
import { Program, AnchorProvider, web3 } from '@coral-xyz/anchor';

import { useAppWallet } from '@/hooks/useAppWallet';
import { PurchaseCard } from '@/components/event/PurchaseCard';
import { EventHero } from '@/components/event/EventHero';
import { EventSections, EventDetailsSidebar } from '@/components/event/EventSections';

import { PROGRAM_ID, API_URL } from '@/lib/constants';
import idl from '@/idl/ticketing_system.json';
import { PageSkeleton } from '@/components/ui/PageSkeleton';

export function EventDetail() {
    const { eventAddress } = useParams();
    const { connection } = useConnection();
    const wallet = useAppWallet();

    const [eventAccount, setEventAccount] = useState(null);
    const [metadata, setMetadata] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    const program = useMemo(() => {
        const anchorWallet = (wallet.connected && wallet.publicKey) ? {
            publicKey: wallet.publicKey,
            signTransaction: wallet.signTransaction,
            signAllTransactions: wallet.signAllTransactions,
        } : {};
        const provider = new AnchorProvider(connection, anchorWallet, AnchorProvider.defaultOptions());
        return new Program(idl, PROGRAM_ID, provider);
    }, [connection, wallet]);

    // Função para o carregamento INICIAL da página
    const fetchEventDataFromAPI = useCallback(async () => {
        if (!eventAddress) return;

        setIsLoading(true);
        setError(null);
        try {
            const response = await fetch(`${API_URL}/api/events/${eventAddress}`);
            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.error || "Falha ao buscar dados do evento.");
            }
            
            setEventAccount(data.event.account);
            setMetadata(data.event.metadata);

        } catch (err) {
            console.error("Erro ao carregar os dados do evento via API:", err);
            setError("Evento não encontrado ou indisponível.");
        } finally {
            setIsLoading(false);
        }
    }, [eventAddress]);

    useEffect(() => {
        fetchEventDataFromAPI();
    }, [fetchEventDataFromAPI]);

    // ✅ NOVA FUNÇÃO: Atualiza os dados em segundo plano SEM mostrar loading
    const refetchEventDataInBackground = useCallback(async () => {
        if (!eventAddress) return;
        try {
            const response = await fetch(`${API_URL}/api/events/${eventAddress}`);
            const data = await response.json();
            if (response.ok && data.success) {
                setEventAccount(data.event.account);
                setMetadata(data.event.metadata);
                console.log("Dados do evento atualizados em segundo plano.");
            } else {
                throw new Error(data.error || "Falha ao atualizar dados do evento em segundo plano.");
            }
        } catch (err) {
            console.error("Falha ao atualizar dados em segundo plano:", err);
        }
    }, [eventAddress]);


    if (isLoading) return <PageSkeleton />;
    if (error) return <div className="text-center py-20 text-red-500"><h1>Erro 404</h1><p>{error}</p></div>;
    if (!eventAccount || !metadata) return <div className="text-center py-20">Nenhum dado de evento encontrado.</div>;

    return (
        <div className="bg-slate-50 min-h-screen">
            <EventHero metadata={metadata} />
            <main className="container mx-auto px-4 py-12">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">
                    <div className="lg:col-span-2">
                        <EventSections metadata={metadata} />
                    </div>
                    <aside className="lg:col-span-1">
                        <div className="sticky top-24 space-y-8">
                            <PurchaseCard
                                metadata={metadata}
                                eventAccount={eventAccount} 
                                eventAddress={eventAddress} 
                                // ✅ ALTERADO: Passando a nova função "silenciosa"
                                onPurchaseSuccess={refetchEventDataInBackground} 
                            />
                            <EventDetailsSidebar metadata={metadata} />
                        </div>
                    </aside>
                </div>
            </main>
        </div>
    );
}