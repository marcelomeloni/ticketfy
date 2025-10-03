import { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useConnection } from '@solana/wallet-adapter-react';
import { Program, web3, BN, AnchorProvider } from '@coral-xyz/anchor';
import { getAssociatedTokenAddress,  createAssociatedTokenAccountInstruction,
    TOKEN_PROGRAM_ID, 
    ASSOCIATED_TOKEN_PROGRAM_ID  } from '@solana/spl-token';
import toast from 'react-hot-toast';

import { useAppWallet } from '@/hooks/useAppWallet';
import idl from '@/idl/ticketing_system.json';
import { PROGRAM_ID } from '@/lib/constants';
import { 
    ShoppingCartIcon, 
    TagIcon, 
    CalendarIcon, 
    MapPinIcon,
    UserIcon,
    FireIcon,
    ArrowPathIcon,
    CurrencyDollarIcon
} from '@heroicons/react/24/outline';

// --- Constantes ---
const LISTING_SEED = Buffer.from("listing");
const TICKET_SEED = Buffer.from("ticket");
const GLOBAL_CONFIG_SEED = Buffer.from("config");

export function Marketplace() {
    const { connection } = useConnection();
    const wallet = useAppWallet();
    const [listings, setListings] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isBuying, setIsBuying] = useState(false);

    const program = useMemo(() => {
        const anchorWallet = (wallet.connected && wallet.publicKey) ? {
            publicKey: wallet.publicKey,
            signTransaction: wallet.signTransaction,
            signAllTransactions: wallet.signAllTransactions,
        } : {};
        const provider = new AnchorProvider(connection, anchorWallet, AnchorProvider.defaultOptions());
        return new Program(idl, PROGRAM_ID, provider);
    }, [connection, wallet]);

    // ✅ FUNÇÃO AUXILIAR: Verificar se conta existe
    const checkAccountExists = async (publicKey) => {
        try {
            const accountInfo = await connection.getAccountInfo(publicKey);
            return accountInfo !== null;
        } catch (error) {
            return false;
        }
    };

    // ✅ FUNÇÃO MELHORADA: Buscar ticket verificando múltiplas abordagens
    const findTicketByNftMint = async (nftMint) => {
        try {
            console.log(`Buscando ticket para nftMint: ${nftMint.toString()}`);
            
            // Tentativa 1: Buscar todas as contas Ticket e filtrar
            try {
                const allTickets = await program.account.ticket.all();
                console.log(`Total de tickets encontrados: ${allTickets.length}`);
                
                const ticketAccount = allTickets.find(ticket => {
                    const matches = ticket.account.nftMint && 
                                   ticket.account.nftMint.toString() === nftMint.toString();
                    if (matches) {
                        console.log(`Ticket encontrado via all(): ${ticket.publicKey.toString()}`);
                    }
                    return matches;
                });
                
                if (ticketAccount) {
                    return ticketAccount;
                }
            } catch (error) {
                console.warn('Erro ao buscar todos os tickets:', error.message);
            }

            // Tentativa 2: Tentar derivar a PDA e buscar diretamente
            console.log('Tentando derivar PDA do ticket...');
            const allEvents = await program.account.event.all();
            console.log(`Eventos encontrados: ${allEvents.length}`);
            
            for (const eventAccount of allEvents) {
                try {
                    const [ticketPda] = web3.PublicKey.findProgramAddressSync(
                        [Buffer.from("ticket"), eventAccount.publicKey.toBuffer(), nftMint.toBuffer()],
                        program.programId
                    );
                    
                    // Verificar se a conta existe antes de tentar fetch
                    const accountExists = await checkAccountExists(ticketPda);
                    if (accountExists) {
                        console.log(`Conta encontrada na PDA: ${ticketPda.toString()}`);
                        // Tentar decodificar como conta Ticket
                        const ticket = await program.account.ticket.fetch(ticketPda);
                        return {
                            publicKey: ticketPda,
                            account: ticket
                        };
                    }
                } catch (error) {
                    // Continuar para o próximo evento
                    continue;
                }
            }
            
            console.warn(`Nenhum ticket encontrado para nftMint ${nftMint.toString()} após verificar ${allEvents.length} eventos`);
            return null;
            
        } catch (error) {
            console.warn(`Erro ao buscar ticket para ${nftMint.toString()}:`, error.message);
            return null;
        }
    };

    const formatPrice = (price) => {
        try {
            if (!price) return '0';
            const bnPrice = new BN(price);
            return (bnPrice.toNumber() / web3.LAMPORTS_PER_SOL).toFixed(2);
        } catch (error) {
            console.error('Erro ao formatar preço:', error);
            return '0';
        }
    };

    const fetchMarketplaceListings = async () => {
    setIsLoading(true);
    try {
        const allListings = await program.account.marketplaceListing.all();
        const activeListings = allListings.filter(listing => 
            listing.account && new BN(listing.account.price).gt(new BN(0))
        );
        
        console.log(`Encontradas ${activeListings.length} listagens ativas`);

        const listingsWithDetails = await Promise.all(
            activeListings.map(async (listing) => {
                try {
                    const nftMint = listing.account.nftMint;
                    if (!nftMint) return null;

                    // Step 1: Find the Ticket account directly using its NFT Mint.
                    // This is much more reliable than guessing the event.
                    const tickets = await program.account.ticket.all([
                        { memcmp: { offset: 40, bytes: nftMint.toBase58() } }
                    ]);
                    if (tickets.length === 0) {
                        console.warn(`Ticket não encontrado para nftMint ${nftMint.toString()}`);
                        return null;
                    }
                    const ticketAccount = tickets[0];
                    const ticketPubkey = ticketAccount.publicKey;
                    const ticketData = ticketAccount.account;
                    
                    // Step 2: Use the Event key from the Ticket account to fetch the Event data.
                    const eventAccount = await program.account.event.fetch(ticketData.event);
                    
                    // Step 3: Fetch the off-chain metadata using the URI from the Event account.
                    const metadataResponse = await fetch(eventAccount.metadataUri);
                    if (!metadataResponse.ok) {
                        console.warn(`Metadata não encontrada para ${eventAccount.metadataUri}`);
                        return null;
                    }
                    const metadata = await metadataResponse.json();
                    
                    // Step 4: Assemble the complete object for the ListingCard.
                    return {
                        listing: listing,
                        ticket: { account: ticketData, publicKey: ticketPubkey },
                        event: { account: eventAccount, publicKey: ticketData.event },
                        metadata: metadata
                    };
                } catch (error) {
                    console.error('Erro ao buscar detalhes para uma listagem, pulando:', error.message);
                    return null; // Return null to filter out this incomplete listing
                }
            })
        );
        
        const validListings = listingsWithDetails.filter(item => item !== null);
        console.log(`Listagens válidas processadas: ${validListings.length}`);
        setListings(validListings);
        
    } catch (error) {
        console.error("Erro ao buscar listagens do marketplace:", error);
        toast.error("Não foi possível carregar os ingressos à venda.");
    } finally {
        setIsLoading(false);
    }
};
    useEffect(() => {
        if (program) {
            fetchMarketplaceListings();
        }
    }, [program]);

    // ✅ FUNÇÃO CORRIGIDA: Calcular estatísticas
    const calculateStats = () => {
        if (!listings || listings.length === 0) {
            return { min: '0', max: '0', categories: 0 };
        }

        try {
            // Extrair preços válidos
            const validPrices = listings
                .map(l => l?.listing?.account?.price)
                .filter(price => {
                    try {
                        return price !== undefined && 
                               price !== null && 
                               !isNaN(price) && 
                               new BN(price).toNumber() >= 0;
                    } catch {
                        return false;
                    }
                })
                .map(price => new BN(price));

            if (validPrices.length === 0) {
                return { 
                    min: '0', 
                    max: '0', 
                    categories: new Set(
                        listings
                            .map(l => l?.metadata?.category)
                            .filter(cat => cat && typeof cat === 'string')
                    ).size 
                };
            }

            // Calcular min e max manualmente
            let minPrice = validPrices[0];
            let maxPrice = validPrices[0];

            for (let i = 1; i < validPrices.length; i++) {
                const current = validPrices[i];
                if (current.lt(minPrice)) minPrice = current;
                if (current.gt(maxPrice)) maxPrice = current;
            }

            // Contar categorias únicas
            const categories = new Set(
                listings
                    .map(l => l?.metadata?.category)
                    .filter(cat => cat && typeof cat === 'string')
            ).size;

            return {
                min: formatPrice(minPrice),
                max: formatPrice(maxPrice),
                categories
            };
        } catch (error) {
            console.error('Erro crítico ao calcular estatísticas:', error);
            return { min: '0', max: '0', categories: 0 };
        }
    };

    const stats = calculateStats();

    // ✅ FUNÇÃO CORRIGIDA: Compra simplificada
 const handleBuyTicket = async (listing) => {
    if (!wallet.connected || !wallet.publicKey) {
        toast.error("Conecte sua carteira para comprar ingressos.");
        return;
    }

    setIsBuying(true);
    const loadingToast = toast.loading("Processando sua compra...");

    try {
        const nftMint = listing.listing.account.nftMint;
        
        // 1. Encontrar PDAs
        const [listingPda] = web3.PublicKey.findProgramAddressSync(
            [LISTING_SEED, nftMint.toBuffer()], 
            program.programId
        );

        const ticketPda = listing.ticket.publicKey;
        const eventPubkey = listing.event.publicKey;

        // ✅ Declarações e atribuições para as contas de token NFT
        const buyerNftTokenAccount = await getAssociatedTokenAddress(nftMint, wallet.publicKey);
        const escrowNftTokenAccount = await getAssociatedTokenAddress(nftMint, listing.listing.account.escrowAccount, true);
        
        // Encontrar as contas de token TFY necessárias
        const [globalConfigPda] = web3.PublicKey.findProgramAddressSync(
            [GLOBAL_CONFIG_SEED],
            program.programId
        );
        const globalConfig = await program.account.globalConfig.fetch(globalConfigPda);
        const tfyTokenMint = globalConfig.tfyTokenMint;
        
        const buyerTokenAccountTfy = await getAssociatedTokenAddress(tfyTokenMint, wallet.publicKey);
        const sellerTokenAccountTfy = await getAssociatedTokenAddress(tfyTokenMint, listing.listing.account.seller);
        const eventControllerTokenAccountTfy = await getAssociatedTokenAddress(tfyTokenMint, listing.event.account.controller);

        // ✅ NOVO: Verificar e criar o ATA do comprador para o token TFY, se necessário
        let transaction = new web3.Transaction();
        const buyerAtaTfyExists = await connection.getAccountInfo(buyerTokenAccountTfy);
        if (!buyerAtaTfyExists) {
            console.log("Buyer's TFY ATA not found, creating it.");
            const createAtaIx = createAssociatedTokenAccountInstruction(
                wallet.publicKey, // Payer to create the ATA
                buyerTokenAccountTfy, // The ATA to create
                wallet.publicKey, // Owner of the ATA
                tfyTokenMint // Mint of the token
            );
            transaction.add(createAtaIx);
        }

        // 3. Adicionar a instrução de compra à transação
        const buyIx = await program.methods
            .buyFromMarketplace()
            .accounts({
                buyer: wallet.publicKey,
                listing: listingPda,
                seller: listing.listing.account.seller,
                ticket: ticketPda,
                nftMint: nftMint,
                buyerTokenAccount: buyerNftTokenAccount,
                escrowTokenAccount: escrowNftTokenAccount,
                escrowAccount: listing.listing.account.escrowAccount,
                event: eventPubkey,
                
                globalConfig: globalConfigPda,
                buyerTokenAccountTfy: buyerTokenAccountTfy,
                sellerTokenAccountTfy: sellerTokenAccountTfy,
                eventControllerTokenAccountTfy: eventControllerTokenAccountTfy,

                systemProgram: web3.SystemProgram.programId,
                tokenProgram: TOKEN_PROGRAM_ID,
                associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
            })
            .instruction();

        transaction.add(buyIx);

        // Enviar e confirmar a transação
        const signature = await wallet.sendTransaction(transaction, connection);
        await connection.confirmTransaction(signature, 'confirmed');

        toast.success(`Ingresso comprado com sucesso!`, { id: loadingToast });
        
        // Atualizar a lista de listagens
        setTimeout(() => {
            fetchMarketplaceListings();
        }, 2000);

    } catch (error) {
        console.error("Erro ao comprar ingresso:", error);
        const errorMessage = error.message || "Erro desconhecido";
        toast.error(`Falha na compra: ${errorMessage}`, { id: loadingToast });
    } finally {
        setIsBuying(false);
    }
};


    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
            {/* Header e resto do JSX permanece igual */}
            <div className="bg-slate-900 text-white py-20">
                <div className="container mx-auto px-4 text-center">
                    <div className="flex justify-center mb-6">
                        <div className="bg-gradient-to-r from-cyan-500 to-fuchsia-600 p-4 rounded-3xl">
                            <ShoppingCartIcon className="h-12 w-12 text-white" />
                        </div>
                    </div>
                    <h1 className="text-4xl md:text-6xl font-bold mb-6">
                        Marketplace de <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-500">Ingressos</span>
                    </h1>
                    <p className="text-xl text-slate-300 max-w-2xl mx-auto leading-relaxed">
                        Compre ingressos NFT diretamente de outros participantes. 
                        Transações seguras e transparentes na blockchain Solana.
                    </p>
                </div>
            </div>

            {/* Conteúdo Principal */}
            <div className="container mx-auto px-4 py-12">
                {/* Estatísticas */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
                    <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-200 text-center">
                        <div className="text-2xl font-bold text-slate-900 mb-2">{listings.length}</div>
                        <div className="text-slate-600">Ingressos à Venda</div>
                    </div>
                    <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-200 text-center">
                        <div className="text-2xl font-bold text-slate-900 mb-2">
                            {stats.min}
                        </div>
                        <div className="text-slate-600">Preço Mais Baixo (TFY)</div>
                    </div>
                    <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-200 text-center">
                        <div className="text-2xl font-bold text-slate-900 mb-2">
                            {stats.max}
                        </div>
                        <div className="text-slate-600">Preço Mais Alto (TFY)</div>
                    </div>
                    <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-200 text-center">
                        <div className="text-2xl font-bold text-slate-900 mb-2">
                            {stats.categories}
                        </div>
                        <div className="text-slate-600">Categorias</div>
                    </div>
                </div>

                {/* Conteúdo de listagens */}
                {isLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                        {Array.from({ length: 8 }).map((_, i) => (
                            <div key={i} className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden animate-pulse">
                                <div className="h-48 bg-slate-300"></div>
                                <div className="p-6 space-y-4">
                                    <div className="h-6 bg-slate-300 rounded"></div>
                                    <div className="h-4 bg-slate-300 rounded w-3/4"></div>
                                    <div className="h-4 bg-slate-300 rounded w-1/2"></div>
                                    <div className="h-10 bg-slate-300 rounded"></div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : listings.length > 0 ? (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                            {listings
                                .map((item, index) => (
                                    <ListingCard 
                                        key={item.listing.publicKey.toString()}
                                        listing={item}
                                        onBuy={() => handleBuyTicket(item)}
                                        isBuying={isBuying}
                                        index={index}
                                    />
                                ))}
                        </div>
                        <div className="text-center mt-12">
                            <button
                                onClick={fetchMarketplaceListings}
                                className="inline-flex items-center gap-2 bg-slate-200 text-slate-700 font-semibold py-3 px-6 rounded-2xl hover:bg-slate-300 transition-all duration-300"
                            >
                                <ArrowPathIcon className="h-5 w-5" />
                                Atualizar Listagens
                            </button>
                        </div>
                    </>
                ) : (
                    <div className="text-center py-16">
                        <div className="bg-white rounded-3xl p-12 max-w-md mx-auto shadow-lg border border-slate-200">
                            <TagIcon className="h-16 w-16 text-slate-400 mx-auto mb-6" />
                            <h3 className="text-2xl font-bold text-slate-900 mb-4">
                                Nenhum Ingresso à Venda
                            </h3>
                            <p className="text-slate-600 mb-8">
                                No momento não há ingressos disponíveis no marketplace. 
                                Seja o primeiro a listar seus ingressos!
                            </p>
                            <div className="space-y-4">
                                <Link 
                                    to="/events"
                                    className="block w-full bg-gradient-to-r from-cyan-500 to-fuchsia-600 text-white font-bold py-3 px-6 rounded-2xl text-center hover:shadow-lg transition-all"
                                >
                                    Explorar Eventos
                                </Link>
                                <Link 
                                    to="/my-tickets"
                                    className="block w-full border-2 border-slate-300 text-slate-700 font-bold py-3 px-6 rounded-2xl text-center hover:border-slate-400 transition-all"
                                >
                                    Meus Ingressos
                                </Link>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

// Componente ListingCard
function ListingCard({ listing, onBuy, isBuying, index }) {
    // 1. Verificação de dados robusta para evitar erros.
    // Se 'listing' ou suas propriedades críticas não existirem, não renderize nada.
    if (!listing || !listing.listing || !listing.listing.account || !listing.event || !listing.metadata) {
        console.warn("Dados incompletos recebidos para renderizar um ListingCard:", listing);
        return null;
    }

    const { metadata, event, ticket, listing: listingAccount } = listing;

    // 2. Verificação adicional para as chaves públicas que serão convertidas em string.
    if (!event.publicKey || !listingAccount.account.seller) {
        console.warn("Chave pública do evento ou vendedor ausente.", listing);
        return null;
    }

    const priceInSol = new BN(listingAccount.account.price).toNumber() / web3.LAMPORTS_PER_SOL;

    return (
        <div 
            className="bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border border-slate-200 group hover:scale-105"
            style={{ animationDelay: `${index * 100}ms` }}
        >
            <div className="relative">
                <Link to={`/event/${event.publicKey.toString()}`}>
                    <img 
                        src={metadata.image} 
                        alt={metadata.name} 
                        className="w-full h-48 object-cover group-hover:scale-110 transition-transform duration-300"
                        onError={(e) => {
                            e.target.src = 'https://via.placeholder.com/300x200?text=Imagem+Indisponível';
                        }}
                    />
                </Link>
                
                <div className="absolute top-4 right-4">
                    <div className="bg-gradient-to-r from-cyan-500 to-fuchsia-600 text-white px-3 py-2 rounded-full font-bold shadow-lg flex items-center gap-1">
                        <CurrencyDollarIcon className="h-4 w-4"/> {priceInSol.toFixed(2)} TFY
                    </div>
                </div>

                {metadata.category && (
                    <div className="absolute top-4 left-4">
                        <span className="bg-black/70 text-white px-3 py-1 rounded-full text-sm font-medium backdrop-blur-sm">
                            {metadata.category}
                        </span>
                    </div>
                )}
            </div>

            <div className="p-6">
                <Link to={`/event/${event.publicKey.toString()}`}>
                    <h3 className="text-xl font-bold text-slate-900 mb-3 leading-tight group-hover:text-cyan-600 transition-colors line-clamp-2">
                        {metadata.name}
                    </h3>
                </Link>

                {metadata.description && (
                    <p className="text-slate-600 text-sm mb-4 line-clamp-2 leading-relaxed">
                        {metadata.description}
                    </p>
                )}

                <div className="space-y-3 mb-6">
                    {metadata.properties?.dateTime?.start && (
                        <div className="flex items-center gap-3 text-slate-700">
                            <CalendarIcon className="h-4 w-4 text-cyan-500 flex-shrink-0" />
                            <span className="text-sm font-medium">
                                {formatDate(metadata.properties.dateTime.start)}
                            </span>
                        </div>
                    )}
                    
                    {metadata.properties?.location && (
                        <div className="flex items-center gap-3 text-slate-700">
                            <MapPinIcon className="h-4 w-4 text-cyan-500 flex-shrink-0" />
                            <span className="text-sm font-medium">
                                {metadata.properties.location.venueName || 'Online'}
                            </span>
                        </div>
                    )}
                    
                    <div className="flex items-center gap-3 text-slate-700">
                        <UserIcon className="h-4 w-4 text-cyan-500 flex-shrink-0" />
                        <span className="text-sm font-medium">
                            Vendedor: {listingAccount.account.seller.toString().slice(0, 4)}...{listingAccount.account.seller.toString().slice(-4)}
                        </span>
                    </div>
                </div>

                <button
                    onClick={onBuy}
                    disabled={isBuying}
                    className="w-full bg-gradient-to-r from-cyan-500 to-fuchsia-600 text-white font-bold py-3 px-6 rounded-2xl hover:shadow-lg hover:shadow-cyan-500/25 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                    {isBuying ? (
                        <>
                            <ArrowPathIcon className="h-5 w-5 animate-spin" />
                            Processando...
                        </>
                    ) : (
                        <>
                            <ShoppingCartIcon className="h-5 w-5" />
                            Comprar Ingresso
                        </>
                    )}
                </button>

                <div className="mt-4 text-center">
                    <div className="inline-flex items-center gap-1 bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-xs">
                        <FireIcon className="h-3 w-3" />
                        NFT Verificado • Blockchain Solana
                    </div>
                </div>
            </div>
        </div>
    );
}

export default ListingCard;

// Função auxiliar para formatação de data
const formatDate = (dateString) => {
    try {
        return new Date(dateString).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    } catch (error) {
        return 'Data indisponível';
    }
};