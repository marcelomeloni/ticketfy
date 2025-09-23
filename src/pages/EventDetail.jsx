import { useState, useMemo, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useConnection, useAnchorWallet } from '@solana/wallet-adapter-react';
import { Program, AnchorProvider, web3 } from '@coral-xyz/anchor';

import { PurchaseCard } from '@/components/event/PurchaseCard';
import { EventHero } from '@/components/event/EventHero';
import { EventSections, EventDetailsSidebar } from '@/components/event/EventSections';
import { PageSkeleton } from '@/components/ui/PageSkeleton';
import { PROGRAM_ID } from '@/lib/constants';
import idl from '@/idl/ticketing_system.json';


// ✅ CORREÇÃO: "export function" em vez de "export default function"
export function EventDetail() {
    const { eventAddress } = useParams();
    const { connection } = useConnection();
    const wallet = useAnchorWallet();

    const [eventAccount, setEventAccount] = useState(null);
    const [metadata, setMetadata] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    const program = useMemo(() => {
        const provider = new AnchorProvider(connection, wallet || {}, AnchorProvider.defaultOptions());
        return new Program(idl, PROGRAM_ID, provider);
    }, [connection, wallet]);

    const fetchEventAndMetadata = useCallback(async () => {
        if (!eventAddress) return;
        if (!eventAccount) setIsLoading(true);
        setError(null);
        try {
            const eventPubkey = new web3.PublicKey(eventAddress);
            const account = await program.account.event.fetch(eventPubkey);
            setEventAccount(account);
            
            const response = await fetch(account.metadataUri);
            if (!response.ok) throw new Error("Falha ao buscar metadados.");
            const metadataJson = await response.json();
            setMetadata(metadataJson);
        } catch (err) {
            console.error("Erro ao carregar os dados do evento:", err);
            setError("Evento não encontrado ou indisponível.");
        } finally {
            setIsLoading(false);
        }
    }, [eventAddress, program, eventAccount]);

    useEffect(() => {
        if (!eventAccount) {
            fetchEventAndMetadata();
        }
    }, [fetchEventAndMetadata, eventAccount]);


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
                                onPurchaseSuccess={fetchEventAndMetadata} 
                            />
                            <EventDetailsSidebar metadata={metadata} />
                        </div>
                    </aside>
                </div>
            </main>
        </div>
    );
}
