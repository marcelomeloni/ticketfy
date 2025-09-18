import { useState, useMemo, useEffect } from 'react';
import { useConnection, useAnchorWallet } from '@solana/wallet-adapter-react';
import { Program, web3 } from '@coral-xyz/anchor';
import { getAssociatedTokenAddress } from '@solana/spl-token';
import toast from 'react-hot-toast';
import idl from '@/idl/ticketing_system.json';
import { createReadOnlyProgram, createWritableProgram } from '@/lib/program';

// Constantes
const TICKET_ACCOUNT_NFT_MINT_FIELD_OFFSET = 40;
const ESCROW_SEED = Buffer.from("escrow");

// --- COMPONENTE PRINCIPAL DO MARKETPLACE (MODIFICADO) ---
export function Marketplace() {
    const { connection } = useConnection();
    const [listings, setListings] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    const program = useMemo(() => createReadOnlyProgram(connection), [connection]);

    const fetchListings = async () => {
        if (!program) return;
        setIsLoading(true);
        try {
            // 1. Busca todas as contas de listagem ativas.
            const allListings = await program.account.marketplaceListing.all();
            const activeListings = allListings.filter(l => l.account.price.toNumber() > 0);

            // 2. Para cada listagem, busca os detalhes do ticket e do evento associado.
            const hydratedListingsPromises = activeListings.map(async (listing) => {
                try {
                    // Encontra a conta do ticket usando o mint do NFT.
                    const ticketAccounts = await program.account.ticket.all([
                        { memcmp: { offset: TICKET_ACCOUNT_NFT_MINT_FIELD_OFFSET, bytes: listing.account.nftMint.toBase58() } }
                    ]);
                    if (ticketAccounts.length === 0) return null; // Ingresso não encontrado, ignora.
                    
                    const ticketData = ticketAccounts[0];
                    
                    // Busca os dados do evento a partir da conta do ticket.
                    const eventData = await program.account.event.fetch(ticketData.account.event);
                    
                    // Retorna um objeto combinado com todas as informações.
                    return { listing, ticketData, eventData };
                } catch (e) {
                    console.error(`Falha ao hidratar listagem para o mint ${listing.account.nftMint.toBase58()}:`, e);
                    return null; // Retorna nulo se houver erro na busca.
                }
            });

            // Aguarda todas as buscas terminarem.
            const hydratedListings = (await Promise.all(hydratedListingsPromises));

            // 3. Filtra as listagens para remover nulos e aquelas de eventos cancelados.
            const validAndActiveListings = hydratedListings.filter(item => 
                item !== null && !item.eventData.canceled
            );

            // Ordena por preço.
            validAndActiveListings.sort((a, b) => a.listing.account.price.toNumber() - b.listing.account.price.toNumber());
            
            setListings(validAndActiveListings);
        } catch (error) {
            console.error("Erro ao buscar listagens:", error);
            toast.error("Não foi possível carregar o marketplace.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchListings();
    }, [program]);

    return (
        <div className="container mx-auto px-4 py-12">
            <header className="text-center mb-12">
                <h1 className="text-4xl font-bold text-slate-900">Marketplace</h1>
                <p className="mt-2 text-slate-600">Compre ingressos revendidos por outros usuários.</p>
            </header>

            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                    {/* Esqueleto de carregamento */}
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="bg-white rounded-xl shadow-md overflow-hidden animate-pulse h-[420px]"></div>
                    ))}
                </div>
            ) : listings.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                    {listings.map(hydrated => (
                        <ListingCard 
                            key={hydrated.listing.publicKey.toString()} 
                            hydratedListing={hydrated} 
                            onPurchase={fetchListings} 
                        />
                    ))}
                </div>
            ) : (
                <div className="text-center text-slate-500 py-10">Nenhum ingresso à venda no momento.</div>
            )}
        </div>
    );
}

// --- COMPONENTE ListingCard (SIMPLIFICADO) ---
function ListingCard({ hydratedListing, onPurchase }) {
    const { connection } = useConnection();
    const wallet = useAnchorWallet();
    const [isBuying, setIsBuying] = useState(false);

    // O programa para escrita ainda é necessário para a ação de compra.
    const writableProgram = useMemo(() => createWritableProgram(connection, wallet), [connection, wallet]);

    // Extrai os dados do objeto "hidratado" recebido via props.
    const { listing, ticketData, eventData } = hydratedListing;

    const handleBuy = async () => {
        if (!writableProgram || !wallet) {
            toast.error("Conecte sua carteira para comprar.");
            return;
        }
        if (wallet.publicKey.equals(listing.account.seller)) {
            toast.error("Você não pode comprar seu próprio ingresso.");
            return;
        }

        setIsBuying(true);
        const loadingToast = toast.loading("Processando sua compra...");
        try {
            const nftMint = listing.account.nftMint;
            
            // Derivar contas para a instrução `buyFromMarketplace`.
            const [escrowAccountPda] = web3.PublicKey.findProgramAddressSync([ESCROW_SEED, nftMint.toBuffer()], writableProgram.programId);
            const escrowTokenAccount = await getAssociatedTokenAddress(nftMint, escrowAccountPda, true);
            
            await writableProgram.methods
                .buyFromMarketplace()
                .accounts({
                    buyer: wallet.publicKey,
                    seller: listing.account.seller,
                    event: ticketData.account.event,
                    listing: listing.publicKey,
                    ticket: ticketData.publicKey,
                    nftMint: nftMint,
                    escrowAccount: escrowAccountPda,
                    escrowTokenAccount: escrowTokenAccount,
                    // O Anchor infere as outras contas como buyer_token_account, system_program, etc.
                }).rpc();
            
            toast.success("Compra realizada com sucesso!", { id: loadingToast });
            setTimeout(onPurchase, 2500);

        } catch (error) {
            console.error("Erro ao comprar:", error);
            // A verificação do contrato já impede a compra, mas podemos adicionar um feedback.
            if (error.toString().includes("EventIsCanceled")) {
                 toast.error("Este evento foi cancelado e o ingresso não pode ser comprado.", { id: loadingToast });
            } else {
                 toast.error(`Falha na compra: Verifique o console.`, { id: loadingToast });
            }
        } finally {
            setIsBuying(false);
        }
    };

    return (
        <div className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow overflow-hidden flex flex-col">
            <img className="h-48 w-full object-cover" src={eventData.imageUri} alt={eventData.name} />
            <div className="p-6 flex-grow flex flex-col">
                <h3 className="text-xl font-semibold text-slate-800 truncate">{eventData.name}</h3>
                <p className="text-slate-500 mt-2 text-sm">Vendido por: <span className="font-mono text-xs">{listing.account.seller.toString().substring(0,8)}...</span></p>
                <div className="mt-4">
                    <span className="text-slate-600">Preço</span>
                    <p className="text-2xl font-bold text-indigo-600">
                        {(listing.account.price / web3.LAMPORTS_PER_SOL).toFixed(2)} SOL
                    </p>
                </div>
                <div className="mt-auto pt-6">
                   <button 
                        onClick={handleBuy}
                        disabled={isBuying || !wallet || (wallet && wallet.publicKey.equals(listing.account.seller))}
                        className="w-full bg-indigo-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-indigo-700 transition disabled:bg-slate-400 disabled:cursor-not-allowed"
                    >
                        {isBuying ? "Processando..." : "Comprar Agora"}
                    </button>
                </div>
            </div>
        </div>
    );
}