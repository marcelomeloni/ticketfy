import { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useConnection, useAnchorWallet } from '@solana/wallet-adapter-react';
import { Program, web3, BN } from '@coral-xyz/anchor';
import { getAssociatedTokenAddress } from '@solana/spl-token';
import toast from 'react-hot-toast';
import idl from '@/idl/ticketing_system.json';
import { createReadOnlyProgram, createWritableProgram } from '@/lib/program';

// --- Ícones para UI ---
const CalendarIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>;
const LocationIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;

// --- Constantes ---
const TICKET_ACCOUNT_OWNER_FIELD_OFFSET = 72;
const LISTING_SEED = Buffer.from("listing");
const ESCROW_SEED = Buffer.from("escrow");
const REFUND_RESERVE_SEED = Buffer.from("refund_reserve");

export function MyTickets() {
    const { connection } = useConnection();
    const wallet = useAnchorWallet();
    const [tickets, setTickets] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSellModalOpen, setIsSellModalOpen] = useState(false);
    const [selectedTicket, setSelectedTicket] = useState(null);
    const [listedMints, setListedMints] = useState(new Set());
    const [isSubmitting, setIsSubmitting] = useState(false);

    const readOnlyProgram = useMemo(() => createReadOnlyProgram(connection), [connection]);
    const writableProgram = useMemo(() => createWritableProgram(connection, wallet), [connection, wallet]);

    const fetchAllData = async () => {
        if (!readOnlyProgram || !wallet) {
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        try {
            const userTicketAccounts = await readOnlyProgram.account.ticket.all([
                { memcmp: { offset: TICKET_ACCOUNT_OWNER_FIELD_OFFSET, bytes: wallet.publicKey.toBase58() } }
            ]);
            setTickets(userTicketAccounts);

            const allListings = await readOnlyProgram.account.marketplaceListing.all();
            const activeListings = allListings.filter(l => l.account.price > 0);
            const listedNftMints = new Set(activeListings.map(l => l.account.nftMint.toString()));
            setListedMints(listedNftMints);
        } catch (error) {
            console.error("Erro ao buscar dados:", error);
            toast.error("Não foi possível carregar seus ingressos.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchAllData();
    }, [readOnlyProgram, wallet]);

    const openSellModal = (ticket) => { setSelectedTicket(ticket); setIsSellModalOpen(true); };
    const closeSellModal = () => { setSelectedTicket(null); setIsSellModalOpen(false); };

    const handleListForSale = async (priceInSol) => {
        if (!writableProgram || !wallet || !selectedTicket) return;
        if (priceInSol <= 0) { toast.error("O preço deve ser maior que zero."); return; }
        
        setIsSubmitting(true);
        const loadingToast = toast.loading("Listando seu ingresso...");
        try {
            const priceInLamports = Math.round(priceInSol * web3.LAMPORTS_PER_SOL);
            const nftMint = selectedTicket.account.nftMint;
            
            const sellerTokenAccount = await getAssociatedTokenAddress(nftMint, wallet.publicKey);
            const [listingPda] = web3.PublicKey.findProgramAddressSync([LISTING_SEED, nftMint.toBuffer()], writableProgram.programId);
            const [escrowAccountPda] = web3.PublicKey.findProgramAddressSync([ESCROW_SEED, nftMint.toBuffer()], writableProgram.programId);
            const escrowTokenAccount = await getAssociatedTokenAddress(nftMint, escrowAccountPda, true);
            
            await writableProgram.methods
                .listForSale(new BN(priceInLamports))
                .accounts({
                    seller: wallet.publicKey,
                    event: selectedTicket.account.event,
                    ticket: selectedTicket.publicKey,
                    nftMint: nftMint,
                    sellerTokenAccount: sellerTokenAccount,
                    listing: listingPda,
                    escrowAccount: escrowAccountPda,
                    escrowTokenAccount: escrowTokenAccount,
                }).rpc();
            
            toast.success("Ingresso listado! Atualizando...", { id: loadingToast });
            closeSellModal();
            setTimeout(() => { fetchAllData() }, 2500);
        } catch (error) {
            console.error("Erro ao listar ingresso:", error);
            toast.error(`Falha ao listar: Verifique o console.`, { id: loadingToast });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCancelListing = async (ticket) => {
        if (!writableProgram || !wallet) return;

        setIsSubmitting(true);
        const loadingToast = toast.loading("Cancelando listagem...");
        try {
            const nftMint = ticket.account.nftMint;
            const [listingPda] = web3.PublicKey.findProgramAddressSync([LISTING_SEED, nftMint.toBuffer()], writableProgram.programId);
            const [escrowAccountPda] = web3.PublicKey.findProgramAddressSync([ESCROW_SEED, nftMint.toBuffer()], writableProgram.programId);
            const sellerTokenAccount = await getAssociatedTokenAddress(nftMint, wallet.publicKey);
            const escrowTokenAccount = await getAssociatedTokenAddress(nftMint, escrowAccountPda, true);
            
            await writableProgram.methods
                .cancelListing()
                .accounts({
                    seller: wallet.publicKey,
                    listing: listingPda,
                    ticket: ticket.publicKey,
                    nftMint: nftMint,
                    escrowAccount: escrowAccountPda,
                    sellerTokenAccount: sellerTokenAccount,
                    escrowTokenAccount: escrowTokenAccount,
                }).rpc();

            toast.success("Listagem cancelada! Atualizando...", { id: loadingToast });
            setTimeout(() => { fetchAllData() }, 2500);

        } catch (error) {
            console.error("Erro ao cancelar listagem:", error);
            toast.error(`Falha ao cancelar: Verifique o console.`, { id: loadingToast });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClaimRefund = async (ticket) => {
        if (!writableProgram || !wallet) return;

        setIsSubmitting(true);
        const loadingToast = toast.loading("Processando seu reembolso...");
        try {
            const eventKey = ticket.account.event;
            const nftMint = ticket.account.nftMint;

            const [refundReservePda] = web3.PublicKey.findProgramAddressSync(
                [REFUND_RESERVE_SEED, eventKey.toBuffer()],
                writableProgram.programId
            );

            const nftTokenAccount = await getAssociatedTokenAddress(nftMint, wallet.publicKey);

            await writableProgram.methods
                .claimRefund()
                .accounts({
                    event: eventKey,
                    buyer: wallet.publicKey,
                    ticket: ticket.publicKey,
                    nftToken: nftTokenAccount,
                    nftMint: nftMint,
                    refundReserve: refundReservePda,
                })
                .rpc();

            toast.success("Reembolso solicitado com sucesso! O ingresso foi queimado.", { id: loadingToast, duration: 4000 });
            setTimeout(() => { fetchAllData() }, 2500);

        } catch (error) {
            console.error("Erro ao solicitar reembolso:", error);
            toast.error(`Falha ao solicitar reembolso: Verifique o console.`, { id: loadingToast });
        } finally {
            setIsSubmitting(false);
        }
    };

    const renderContent = () => {
        if (isLoading) return <div className="text-center text-slate-500">Carregando seus ingressos... 🎟️</div>;
        if (!wallet) return <div className="text-center text-slate-500">Conecte sua carteira para ver seus ingressos.</div>;
        if (tickets.length === 0) return (
            <div className="text-center text-slate-500">
                <p>Você ainda não possui ingressos.</p>
                <Link to="/" className="text-indigo-600 hover:underline mt-2 inline-block">Ver eventos</Link>
            </div>
        );

        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                {tickets.map(ticket => (
                    <TicketCard 
                        key={ticket.account.nftMint.toString()} 
                        ticket={ticket}
                        isListed={listedMints.has(ticket.account.nftMint.toString())}
                        isSubmitting={isSubmitting}
                        onSellClick={() => openSellModal(ticket)}
                        onCancelClick={() => handleCancelListing(ticket)}
                        onRefundClick={() => handleClaimRefund(ticket)}
                    />
                ))}
            </div>
        );
    };

    return (
        <div className="container mx-auto px-4 py-12">
            <header className="text-center mb-12">
                <h1 className="text-4xl font-bold text-slate-900">Meus Ingressos</h1>
                <p className="mt-2 text-slate-600">Aqui estão todos os ingressos que você adquiriu.</p>
            </header>
            {renderContent()}
            {isSellModalOpen && (
                <SellModal 
                    isOpen={isSellModalOpen}
                    onClose={closeSellModal}
                    onSubmit={handleListForSale}
                    ticket={selectedTicket}
                    isSubmitting={isSubmitting}
                />
            )}
        </div>
    );
}

function TicketCard({ ticket, isListed, isSubmitting, onSellClick, onCancelClick, onRefundClick }) {
    const ticketData = ticket.account;
    const { connection } = useConnection();
    const [eventData, setEventData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const program = useMemo(() => createReadOnlyProgram(connection), [connection]);

    useEffect(() => {
        const fetchEventDetails = async () => {
            if (!program || !ticketData.event) return;
            setIsLoading(true);
            try {
                // 1. Busca os dados on-chain do evento
                const onChainEvent = await program.account.event.fetch(ticketData.event);
                
                // 2. Busca os metadados off-chain do JSON
                // ✅ Adicionado "https://" para garantir que seja uma URL válida
                const metadataUrl = onChainEvent.metadataUri.startsWith('http') 
                    ? onChainEvent.metadataUri 
                    : `https://${onChainEvent.metadataUri}`;
                
                const response = await fetch(metadataUrl);
                if (!response.ok) {
                    throw new Error(`Falha ao buscar metadados: ${response.statusText}`);
                }
                const offChainMetadata = await response.json();

                // 3. Mescla os dados on-chain e off-chain
                setEventData({
                    ...onChainEvent,           // Dados do contrato (canceled, etc.)
                    ...offChainMetadata,        // Dados do JSON (name, image, etc.)
                    publicKey: ticketData.event // Mantém a chave pública
                });

            } catch (error) {
                console.error("Erro ao buscar detalhes completos do evento:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchEventDetails();
    }, [program, ticketData.event]);

    if (isLoading || !eventData) {
        return (
            <div className="bg-white rounded-xl shadow-lg overflow-hidden h-[420px]">
                <div className="h-48 bg-slate-200 animate-pulse"></div>
                <div className="p-6 space-y-4">
                    <div className="h-6 bg-slate-200 rounded animate-pulse w-3/4"></div>
                    <div className="h-4 bg-slate-200 rounded animate-pulse w-1/2"></div>
                    <div className="h-4 bg-slate-200 rounded animate-pulse w-1/3"></div>
                    <div className="pt-4 mt-auto">
                        <div className="h-10 bg-slate-200 rounded-lg animate-pulse"></div>
                    </div>
                </div>
            </div>
        );
    }
    
    // ✅ CORREÇÃO: Usa a data do JSON `eventData.properties.dateTime.start`
    // Não precisa mais de .toNumber(), pois vem do JSON como string
    const eventDate = new Date(eventData.properties.dateTime.start).toLocaleDateString('pt-BR', {
        day: '2-digit', month: 'short', year: 'numeric'
    });

    // Usa a propriedade `canceled` que vem dos dados on-chain
    const isEventCanceled = eventData.canceled;
    
    // ✅ CORREÇÃO: Usa a localização do JSON
    const location = eventData.properties.location.venueName || 'Online';
    // ✅ CORREÇÃO: Usa a imagem do JSON
    const image = eventData.image;

    const getStatusInfo = () => {
        if (isEventCanceled) return { text: 'Evento Cancelado', color: 'bg-red-100 text-red-800' };
        if (ticketData.redeemed) return { text: 'Utilizado', color: 'bg-slate-100 text-slate-800' };
        if (isListed) return { text: 'À Venda no Marketplace', color: 'bg-blue-100 text-blue-800' };
        return { text: 'Disponível', color: 'bg-green-100 text-green-800' };
    };

    const status = getStatusInfo();

    const renderActionArea = () => {
        if (isEventCanceled && isListed) {
            return (
                <>
                    <div className="text-xs text-center text-orange-800 bg-orange-100 p-3 rounded-md mb-4">
                        Este evento foi cancelado. Retire o ingresso da venda para poder solicitar seu reembolso.
                    </div>
                    <button 
                        onClick={onCancelClick}
                        disabled={isSubmitting}
                        className="w-full bg-red-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-red-700 transition disabled:bg-slate-400"
                    >
                        {isSubmitting ? 'Retirando...' : 'Retirar da Venda'}
                    </button>
                </>
            );
        }

        if (isEventCanceled && !isListed) {
            return (
                <button
                    onClick={onRefundClick}
                    disabled={isSubmitting || ticketData.redeemed}
                    className="w-full bg-orange-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-orange-600 transition disabled:bg-slate-400 disabled:cursor-not-allowed"
                >
                   {ticketData.redeemed ? 'Ingresso já utilizado' : (isSubmitting ? 'Processando...' : 'Solicitar Reembolso')}
                </button>
            );
        }

        if (isListed) {
            return (
                <button 
                    onClick={onCancelClick}
                    disabled={isSubmitting}
                    className="w-full bg-red-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-red-700 transition disabled:bg-slate-400"
                >
                    {isSubmitting ? 'Cancelando...' : 'Cancelar Venda'}
                </button>
            );
        }
        
        return (
            <button 
                onClick={onSellClick}
                disabled={ticketData.redeemed || isSubmitting}
                className="w-full bg-indigo-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-indigo-700 transition disabled:bg-slate-400 disabled:cursor-not-allowed"
            >
                {ticketData.redeemed ? 'Ingresso já utilizado' : 'Vender'}
            </button>
        );
    };
    
    return (
        <div className="bg-white rounded-xl shadow-lg hover:shadow-2xl transition-shadow duration-300 overflow-hidden flex flex-col group">
            <div className="relative">
                <Link to={`/event/${eventData.publicKey.toString()}`} className="block">
                    <img 
                      className={`h-48 w-full object-cover transition-transform duration-300 group-hover:scale-105 ${isEventCanceled ? 'filter grayscale' : ''}`} 
                      src={image} 
                      alt={eventData.name} 
                    />
                </Link>
                <div className={`absolute top-2 right-2 px-3 py-1 text-xs font-bold rounded-full ${status.color}`}>
                    {status.text}
                </div>
            </div>
            
            <div className="p-6 flex-grow flex flex-col">
                <h3 className="text-xl font-bold text-slate-900 truncate mb-2">{eventData.name}</h3>
                <div className="space-y-2 text-slate-600">
                    <p className="flex items-center text-sm"><CalendarIcon /> {eventDate}</p>
                    <p className="flex items-center text-sm"><LocationIcon /> {location}</p>
                </div>
                
                <div className="mt-auto pt-6">
                    {renderActionArea()}
                </div>
            </div>
        </div>
    );
}

function SellModal({ isOpen, onClose, onSubmit, ticket, isSubmitting }) {
    const [price, setPrice] = useState('');
    
    const handleSubmit = async (e) => {
        e.preventDefault();
        await onSubmit(parseFloat(price));
    };

    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
                <h2 className="text-2xl font-bold mb-4">Listar Ingresso para Venda</h2>
                <p className="text-slate-600 mb-6">Defina o preço em SOL para o seu ingresso.</p>
                <form onSubmit={handleSubmit}>
                    <label htmlFor="price" className="block text-sm font-medium text-slate-700">Preço (SOL)</label>
                    <input type="number" id="price" value={price} onChange={(e) => setPrice(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" placeholder="Ex: 0.5" step="0.01" min="0.01" required />
                    <div className="mt-6 flex justify-end space-x-4">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-md hover:bg-slate-200">Cancelar</button>
                        <button type="submit" disabled={isSubmitting} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:bg-indigo-400">{isSubmitting ? "Listando..." : "Confirmar Listagem"}</button>
                    </div>
                </form>
            </div>
        </div>
    );
}