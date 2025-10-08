import { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useConnection } from '@solana/wallet-adapter-react';
import { Program, web3, BN, AnchorProvider } from '@coral-xyz/anchor';
import { getAssociatedTokenAddress } from '@solana/spl-token';
import toast from 'react-hot-toast';

import { useAppWallet } from '@/hooks/useAppWallet';
import { useUserRegistrations } from '@/hooks/useUserRegistrations';
import { getRegistrationIdByMint } from '@/utils/ticketUtils'; 
import { TicketDownloader } from '@/components/TicketDownloader'; // ✅ IMPORTE O COMPONENTE UNIFICADO
import idl from '@/idl/ticketing_system.json';
import { PROGRAM_ID, API_URL } from '@/lib/constants';
import { AcademicCapIcon, ArrowDownTrayIcon, CalendarIcon, MapPinIcon, TagIcon } from '@heroicons/react/24/outline';

// --- Constantes ---
const LISTING_SEED = Buffer.from("listing");
const ESCROW_SEED = Buffer.from("escrow");
const REFUND_RESERVE_SEED = Buffer.from("refund_reserve");
const APP_BASE_URL = "https://ticketfy.app";

export function MyTickets() {
    const { connection } = useConnection();
    const wallet = useAppWallet();
    const { registrations, isLoading: isLoadingRegistrations, error: registrationsError } = useUserRegistrations();
    
    const [tickets, setTickets] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSellModalOpen, setIsSellModalOpen] = useState(false);
    const [selectedTicket, setSelectedTicket] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const program = useMemo(() => {
        const anchorWallet = (wallet.connected && wallet.publicKey) ? {
            publicKey: wallet.publicKey,
            signTransaction: wallet.signTransaction,
            signAllTransactions: wallet.signAllTransactions,
        } : {};
        const provider = new AnchorProvider(connection, anchorWallet, AnchorProvider.defaultOptions());
        return new Program(idl, PROGRAM_ID, provider);
    }, [connection, wallet]);

    // 🔄 Buscar tickets e combinar com registrationIds
    const fetchAllData = async () => {
        if (!wallet.publicKey) {
            setTickets([]);
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        try {
            console.log('[MY_TICKETS] Buscando tickets para:', wallet.publicKey.toString());
            const response = await fetch(`${API_URL}/api/tickets/user-tickets/${wallet.publicKey.toString()}`);
            if (!response.ok) {
                throw new Error('Falha ao buscar ingressos na API.');
            }
            const data = await response.json();

            if (data.success) {
                const ticketsWithRegistrations = await combineTicketsWithRegistrations(data.tickets);
                setTickets(ticketsWithRegistrations);
            } else {
                throw new Error(data.error || 'Erro desconhecido da API.');
            }
        } catch (error) {
            console.error("Erro ao buscar dados via API:", error);
            toast.error("Não foi possível carregar seus ingressos.");
            setTickets([]);
        } finally {
            setIsLoading(false);
        }
    };

    const combineTicketsWithRegistrations = async (ticketsFromApi) => {
        if (!ticketsFromApi || !wallet.publicKey) return ticketsFromApi;

        console.log('[MY_TICKETS] Combinando tickets com registrationIds...');
        
        if (registrations && registrations.length > 0) {
            console.log('[MY_TICKETS] Usando registrations do hook:', registrations.length);
            return ticketsFromApi.map(ticket => {
                const mintAddress = ticket.account.nftMint.toString();
                const registration = registrations.find(reg => reg.mint_address === mintAddress);
                return {
                    ...ticket,
                    registrationId: registration?.id || null
                };
            });
        }

        console.log('[MY_TICKETS] Buscando registrationIds individualmente...');
        const ticketsWithRegistrations = await Promise.all(
            ticketsFromApi.map(async (ticket) => {
                const mintAddress = ticket.account.nftMint.toString();
                try {
                    const registrationId = await getRegistrationIdByMint(mintAddress, wallet.publicKey.toString());
                    return {
                        ...ticket,
                        registrationId
                    };
                } catch (error) {
                    console.error(`[MY_TICKETS] Erro ao buscar registrationId para ${mintAddress}:`, error);
                    return {
                        ...ticket,
                        registrationId: null
                    };
                }
            })
        );

        return ticketsWithRegistrations;
    };

    useEffect(() => {
        fetchAllData();
    }, [wallet.publicKey, registrations]);

    // ... (restante das funções: openSellModal, closeSellModal, handleListForSale, etc.)
    const openSellModal = (ticket) => { setSelectedTicket(ticket); setIsSellModalOpen(true); };
    const closeSellModal = () => { setSelectedTicket(null); setIsSellModalOpen(false); };

    const handleListForSale = async (priceInSol) => {
        if (!program || !wallet.connected || !selectedTicket) return;
        if (priceInSol <= 0) { toast.error("O preço deve ser maior que zero."); return; }
        
        setIsSubmitting(true);
        const loadingToast = toast.loading("Listando seu ingresso...");
        try {
            const priceInLamports = Math.round(priceInSol * web3.LAMPORTS_PER_SOL);
            const nftMint = new web3.PublicKey(selectedTicket.account.nftMint);
            
            const sellerTokenAccount = await getAssociatedTokenAddress(nftMint, wallet.publicKey);
            const [listingPda] = web3.PublicKey.findProgramAddressSync([LISTING_SEED, nftMint.toBuffer()], program.programId);
            const [escrowAccountPda] = web3.PublicKey.findProgramAddressSync([ESCROW_SEED, nftMint.toBuffer()], program.programId);
            const escrowTokenAccount = await getAssociatedTokenAddress(nftMint, escrowAccountPda, true);
            
            await program.methods
                .listForSale(new BN(priceInLamports))
                .accounts({
                    seller: wallet.publicKey,
                    event: new web3.PublicKey(selectedTicket.account.event),
                    ticket: new web3.PublicKey(selectedTicket.publicKey),
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
        if (!program || !wallet.connected) return;
        setIsSubmitting(true);
        const loadingToast = toast.loading("Cancelando listagem...");
        try {
            const nftMint = new web3.PublicKey(ticket.account.nftMint);
            const [listingPda] = web3.PublicKey.findProgramAddressSync([LISTING_SEED, nftMint.toBuffer()], program.programId);
            const [escrowAccountPda] = web3.PublicKey.findProgramAddressSync([ESCROW_SEED, nftMint.toBuffer()], program.programId);
            const sellerTokenAccount = await getAssociatedTokenAddress(nftMint, wallet.publicKey);
            const escrowTokenAccount = await getAssociatedTokenAddress(nftMint, escrowAccountPda, true);
            
            await program.methods
                .cancelListing()
                .accounts({
                    seller: wallet.publicKey,
                    listing: listingPda,
                    ticket: new web3.PublicKey(ticket.publicKey),
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
        if (!program || !wallet.connected) return;
        setIsSubmitting(true);
        const loadingToast = toast.loading("Processando seu reembolso...");
        try {
            const eventKey = new web3.PublicKey(ticket.account.event);
            const nftMint = new web3.PublicKey(ticket.account.nftMint);

            const [refundReservePda] = web3.PublicKey.findProgramAddressSync(
                [REFUND_RESERVE_SEED, eventKey.toBuffer()], program.programId
            );
            const nftTokenAccount = await getAssociatedTokenAddress(nftMint, wallet.publicKey);
            await program.methods
                .claimRefund()
                .accounts({
                    event: eventKey,
                    buyer: wallet.publicKey,
                    ticket: new web3.PublicKey(ticket.publicKey),
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
        if (isLoading || isLoadingRegistrations) {
            return (
                <div className="text-center text-slate-500">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mb-2"></div>
                    <p>Carregando seus ingressos...</p>
                </div>
            );
        }
        
        if (!wallet.connected) {
            return (
                <div className="text-center text-slate-500">
                    <p>Conecte sua carteira ou faça login para ver seus ingressos.</p>
                </div>
            );
        }
        
        if (tickets.length === 0) {
            return (
                <div className="text-center text-slate-500">
                    <p>Você ainda não possui ingressos.</p>
                    <Link to="/events" className="text-indigo-600 hover:underline mt-2 inline-block">
                        Ver eventos
                    </Link>
                </div>
            );
        }

        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                {tickets.map(ticket => (
                    <TicketCard 
                        key={ticket.publicKey} 
                        ticket={ticket}
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
                
                {registrationsError && (
                    <div className="mt-4 p-3 bg-yellow-100 border border-yellow-400 rounded-md text-yellow-800 text-sm">
                        <strong>Aviso:</strong> Não foi possível carregar algumas informações dos ingressos.
                        Os QR Codes podem não funcionar corretamente.
                    </div>
                )}
            </header>
            
            {renderContent()}
            
            {isSellModalOpen && (
                <SellModal 
                    isOpen={isSellModalOpen}
                    onClose={closeSellModal}
                    onSubmit={handleListForSale}
                    isSubmitting={isSubmitting}
                />
            )}
        </div>
    );
}

// ✅ COMPONENTE TicketCard ATUALIZADO
function TicketCard({ ticket, isSubmitting, onSellClick, onCancelClick, onRefundClick }) {
    const { account: ticketData, event: eventDetails, isListed, registrationId } = ticket;

    if (!eventDetails) {
        return (
            <div className="bg-white rounded-xl shadow-lg overflow-hidden h-[420px] p-6 flex flex-col justify-center items-center">
                 <p className="text-slate-500">Não foi possível carregar os detalhes deste ingresso.</p>
            </div>
        );
    }
    
    const eventData = { ...eventDetails.account, ...eventDetails.metadata, publicKey: new web3.PublicKey(ticketData.event) };
    const eventDate = new Date(eventData.properties.dateTime.start).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
    const location = eventData.properties.location.venueName || 'Online';
    const isEventCanceled = eventData.canceled;
    const isFreeTicket = new BN(ticketData.pricePaid).toNumber() === 0;

    const getStatusInfo = () => {
        if (isEventCanceled) return { text: 'Evento Cancelado', color: 'bg-red-100 text-red-800' };
        if (ticketData.redeemed) return { text: 'Utilizado', color: 'bg-slate-100 text-slate-800' };
        if (isListed) return { text: 'À Venda', color: 'bg-blue-100 text-blue-800' };
        return { text: 'Disponível', color: 'bg-green-100 text-green-800' };
    };

    const status = getStatusInfo();
    const certificateUrl = `${APP_BASE_URL}/certificate/${ticketData.nftMint.toString()}`;
    
    const renderActionArea = () => {
        if (isEventCanceled && isListed) {
            return ( 
                <> 
                    <div className="text-xs text-center text-orange-800 bg-orange-100 p-3 rounded-md mb-4">
                        Retire o ingresso da venda para solicitar seu reembolso.
                    </div> 
                    <button onClick={onCancelClick} disabled={isSubmitting} className="w-full bg-red-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-red-700 transition disabled:bg-slate-400">
                        {isSubmitting ? 'Retirando...' : 'Retirar da Venda'}
                    </button> 
                </> 
            );
        }
        
        if (isEventCanceled && !isListed) {
            return ( 
                <button onClick={onRefundClick} disabled={isSubmitting || ticketData.redeemed} className="w-full bg-orange-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-orange-600 transition disabled:bg-slate-400 disabled:cursor-not-allowed">
                    {ticketData.redeemed ? 'Ingresso já utilizado' : (isSubmitting ? 'Processando...' : 'Solicitar Reembolso')}
                </button> 
            );
        }
        
        if (isListed) {
            return ( 
                <button onClick={onCancelClick} disabled={isSubmitting} className="w-full bg-red-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-red-700 transition disabled:bg-slate-400">
                    {isSubmitting ? 'Cancelando...' : 'Cancelar Venda'}
                </button> 
            );
        }
        
        return (
            <button onClick={onSellClick} disabled={ticketData.redeemed || isSubmitting} className="w-full bg-indigo-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-indigo-700 transition disabled:bg-slate-400 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                <TagIcon className="h-5 w-5"/>
                {ticketData.redeemed ? 'Ingresso Utilizado' : 'Vender'}
            </button>
        );
    };

    return (
        <div className="bg-white rounded-xl shadow-lg hover:shadow-2xl transition-shadow duration-300 overflow-hidden flex flex-col group">
            <div className="relative">
                <Link to={`/event/${eventData.publicKey.toString()}`} className="block">
                    <img className={`h-48 w-full object-cover transition-transform duration-300 group-hover:scale-105 ${isEventCanceled ? 'filter grayscale' : ''}`} src={eventData.image} alt={eventData.name} />
                </Link>
                <div className={`absolute top-2 right-2 px-3 py-1 text-xs font-bold rounded-full ${status.color}`}>
                    {status.text}
                </div>
            </div>
            <div className="p-6 flex-grow flex flex-col">
                <h3 className="text-xl font-bold text-slate-900 truncate mb-2">{eventData.name}</h3>
                <div className="space-y-2 text-slate-600">
                    <p className="flex items-center text-sm gap-2"><CalendarIcon className="h-5 w-5 text-slate-400"/> {eventDate}</p>
                    <p className="flex items-center text-sm gap-2"><MapPinIcon className="h-5 w-5 text-slate-400"/> {location}</p>
                </div>
                <div className="mt-auto pt-6 space-y-3">
                    {renderActionArea()}
                    
                    <div className="flex flex-col gap-2">
                        {isFreeTicket && (
                            <Link 
                                to={certificateUrl} 
                                className={`w-full text-center px-4 py-2 rounded-lg font-bold transition flex items-center justify-center gap-2 ${ticketData.redeemed ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-slate-200 text-slate-500 cursor-not-allowed'}`} 
                                disabled={!ticketData.redeemed}
                            >
                                <AcademicCapIcon className="h-5 w-5"/> 
                                Ver Certificado
                            </Link>
                        )}
                        
                        {/* ✅ AGORA USA O TICKETDOWNLOADER UNIFICADO */}
                        <TicketDownloader 
                            ticket={ticket}
                            eventDetails={eventDetails}
                            registrationId={registrationId}
                            className="w-full bg-slate-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-slate-700 transition flex items-center justify-center gap-2"
                        >
                            <ArrowDownTrayIcon className="h-5 w-5"/> 
                            Baixar Ingresso
                        </TicketDownloader>
                        
                        {isFreeTicket && !ticketData.redeemed && (
                            <p className="text-xs text-center text-slate-500 mt-1">
                                Certificado disponível após check-in.
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

function SellModal({ isOpen, onClose, onSubmit, isSubmitting }) {
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
                <p className="text-slate-600 mb-6">Defina o preço em TFY para o seu ingresso.</p>
                <form onSubmit={handleSubmit}>
                    <label htmlFor="price" className="block text-sm font-medium text-slate-700">Preço (TFY)</label>
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



