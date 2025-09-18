import { useState, useMemo, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useConnection, useAnchorWallet } from '@solana/wallet-adapter-react';
import { Program, AnchorProvider, web3, BN } from '@coral-xyz/anchor';
import { Transaction, VersionedTransaction } from '@solana/web3.js';
import { getAssociatedTokenAddress, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from '@solana/spl-token';
import toast from 'react-hot-toast';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import {
    CalendarDaysIcon, MapPinIcon, ClockIcon, UserCircleIcon,
    InformationCircleIcon, SparklesIcon, TicketIcon 
} from '@heroicons/react/24/outline';
import idl from '@/idl/ticketing_system.json';
import { ActionButton } from '@/components/ui/ActionButton';
const GASLESS_API_URL  = "https://gasless-api-ke68.onrender.com"
// --- Constantes Globais ---
const PROGRAM_ADDRESS = "AEcgrC2sEtWX12zs1m7RemTdcr9QwBkMbJUXfC4oEd2M";

// ✅ CORREÇÃO: Definindo o ID do programa Token Metadata da Metaplex manualmente.
// Isso evita erros caso a importação da biblioteca @metaplex-foundation/mpl-token-metadata falhe ou não esteja configurada.
const TOKEN_METADATA_PROGRAM_ID = new web3.PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s");

// --- Componente Principal da Página ---
export function EventDetail() {
    const { eventAddress } = useParams();
    const { connection } = useConnection();
    const wallet = useAnchorWallet();

    const [eventAccount, setEventAccount] = useState(null); // Dados on-chain
    const [metadata, setMetadata] = useState(null);       // Dados off-chain (do JSON)
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    const provider = useMemo(() => {
        if (!wallet) return null;
        return new AnchorProvider(connection, wallet, AnchorProvider.defaultOptions());
    }, [connection, wallet]);

    const program = useMemo(() => {
        if (!provider) return null;
        return new Program(idl, PROGRAM_ADDRESS, provider);
    }, [provider]);

    const fetchEventAndMetadata = useCallback(async () => {
        // Usando um programa de leitura que não depende da carteira para o carregamento inicial da página.
        const readOnlyProgram = new Program(idl, PROGRAM_ADDRESS, { connection });
        if (!eventAddress) return;
        
        setIsLoading(true);
        setError(null);
        try {
            const eventPubkey = new web3.PublicKey(eventAddress);
            const account = await readOnlyProgram.account.event.fetch(eventPubkey);
            setEventAccount(account);

            const metadataUrl = account.metadataUri.startsWith('http') ? account.metadataUri : `https://${account.metadataUri}`;
            const response = await fetch(metadataUrl);
            if (!response.ok) throw new Error("Falha ao buscar metadados do evento.");
            const metadataJson = await response.json();
            setMetadata(metadataJson);

        } catch (err) {
            console.error("Erro ao carregar o evento:", err);
            setError("Evento não encontrado ou indisponível.");
        } finally {
            setIsLoading(false);
        }
    }, [eventAddress, connection]);

    useEffect(() => {
        fetchEventAndMetadata();
    }, [fetchEventAndMetadata]);

    if (isLoading) return <PageSkeleton />;
    if (error) return <div className="text-center py-20 text-red-500"><h1>Erro 404</h1><p>{error}</p></div>;
    if (!eventAccount || !metadata) return <PageSkeleton />; // Proteção extra

    return (
        <div className="bg-slate-50 min-h-screen">
            <EventHero metadata={metadata} />
            <main className="container mx-auto px-4 py-12">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">
                    <div className="lg:col-span-2 space-y-12">
                        <DescriptionSection description={metadata.description} />
                        <OrganizerSection organizer={metadata.organizer} />
                        <LocationSection location={metadata.properties.location} />
                    </div>
                    <aside className="lg:col-span-1">
                        <div className="sticky top-24 space-y-8">
                            <PurchaseCard eventAccount={eventAccount} wallet={wallet} program={program} eventAddress={eventAddress} onPurchaseSuccess={fetchEventAndMetadata} />
                            <DetailsSection metadata={metadata} />
                        </div>
                    </aside>
                </div>
            </main>
        </div>
    );
}


const PurchaseCard = ({ eventAccount, wallet, program, eventAddress, onPurchaseSuccess }) => {
    const [isMinting, setIsMinting] = useState(false);
    const [selectedTierIndex, setSelectedTierIndex] = useState(0);

    const selectedTier = eventAccount.tiers[selectedTierIndex];
    const isFree = selectedTier.priceLamports.toNumber() === 0;

    // Função para compra padrão (paga pelo usuário)
    const handleStandardMint = async () => {
        // (Esta é a função handleMintTicket da versão anterior, sem alterações)
        const eventPubkey = new web3.PublicKey(eventAddress);
        const buyer = wallet.publicKey;
        const mintKeypair = new web3.Keypair();
        const mint = mintKeypair.publicKey;

        const [buyerTicketCountPda] = await web3.PublicKey.findProgramAddress(
            [Buffer.from("buyer_ticket_count"), eventPubkey.toBuffer(), buyer.toBuffer()],
            program.programId
        );
        const [globalConfigPda] = await web3.PublicKey.findProgramAddress([Buffer.from("config")], program.programId);
        const [refundReservePda] = await web3.PublicKey.findProgramAddress([Buffer.from("refund_reserve"), eventPubkey.toBuffer()], program.programId);
        const [metadataPda] = await web3.PublicKey.findProgramAddress([Buffer.from("metadata"), TOKEN_METADATA_PROGRAM_ID.toBuffer(), mint.toBuffer()], TOKEN_METADATA_PROGRAM_ID);
        const [ticketPda] = await web3.PublicKey.findProgramAddress([Buffer.from("ticket"), eventPubkey.toBuffer(), mint.toBuffer()], program.programId);
        const associatedTokenAccount = await getAssociatedTokenAddress(mint, buyer);

        await program.methods
            .mintTicket(selectedTierIndex)
            .accounts({
                globalConfig: globalConfigPda, event: eventPubkey, refundReserve: refundReservePda,
                buyer: buyer, buyerTicketCount: buyerTicketCountPda, mintAccount: mint,
                metadataAccount: metadataPda, associatedTokenAccount: associatedTokenAccount,
                ticket: ticketPda, tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
                tokenProgram: TOKEN_PROGRAM_ID, associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
                systemProgram: web3.SystemProgram.programId, rent: web3.SYSVAR_RENT_PUBKEY,
            })
            .signers([mintKeypair])
            .rpc();
    };

    // Nova função para mint "gasless" (gratuito)
    const handleGaslessMint = async () => {
        // 1. Chamar a API para criar a transação parcialmente assinada
        const createResponse = await fetch(`${GASLESS_API_URL}/create-mint-transaction`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                buyer_pubkey: wallet.publicKey.toString(),
                event_id: eventAccount.eventId.toString(), // ✅ ENVIANDO O ID NUMÉRICO
                tier_index: selectedTierIndex,
            }),
        });

        if (!createResponse.ok) {
            const errorData = await createResponse.json();
            throw new Error(errorData.error || "Falha ao criar a transação no servidor.");
        }

        const { transaction: base64Transaction } = await createResponse.json();
        
        // 2. Deserializar a transação e pedir ao usuário para assinar
        const transactionBuffer = Buffer.from(base64Transaction, 'base64');
      
        const partiallySignedTx = VersionedTransaction.deserialize(transactionBuffer); 
        const signedTx = await wallet.signTransaction(partiallySignedTx);
        
        // 3. Enviar a transação totalmente assinada de volta para a API finalizar
        const finalizeResponse = await fetch(`${GASLESS_API_URL}/finalize-mint-transaction`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                signed_transaction: Buffer.from(signedTx.serialize()).toString('base64'),
            }),
        });

        if (!finalizeResponse.ok) {
            const errorData = await finalizeResponse.json();
            throw new Error(errorData.error || "Falha ao finalizar a transação no servidor.");
        }

        const result = await finalizeResponse.json();
        console.log("Transação finalizada com sucesso:", result.transaction_signature);
    };
    
    // Função principal que decide qual fluxo seguir
    const handleMintTicket = async () => {
        if (!wallet) return toast.error("Por favor, conecte sua carteira.");
        
        setIsMinting(true);
        const toastMessage = isFree ? "Resgatando seu ingresso grátis..." : `Comprando ingresso "${selectedTier.name}"...`;
        const loadingToast = toast.loading(toastMessage);

        try {
            if (isFree) {
                await handleGaslessMint();
            } else {
                await handleStandardMint();
            }
            toast.success("Ingresso adquirido com sucesso!", { id: loadingToast });
            onPurchaseSuccess();
        } catch (error) {
            console.error("Erro detalhado ao adquirir ingresso:", error);
            const errorMessage = error.message || "Falha na transação. Verifique o console.";
            toast.error(`Erro: ${errorMessage}`, { id: loadingToast });
        } finally {
            setIsMinting(false);
        }
    };
    
    const now = Math.floor(Date.now() / 1000);
    const salesHaveEnded = now > eventAccount.salesEndDate.toNumber();
    const salesHaveNotStarted = now < eventAccount.salesStartDate.toNumber();

    return (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center"><TicketIcon className="w-6 h-6 mr-2 text-indigo-500" /> Ingressos</h2>
            <div className="space-y-3 mb-6">
                {eventAccount.tiers.map((tier, index) => {
                    const isSoldOut = tier.ticketsSold >= tier.maxTicketsSupply;
                    const isSelected = selectedTierIndex === index;
                    const isTierFree = tier.priceLamports.toNumber() === 0;
                    return (
                        <div key={index} onClick={() => !isSoldOut && setSelectedTierIndex(index)}
                             className={`p-4 border-2 rounded-lg transition-all ${isSelected ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200'} ${isSoldOut ? 'bg-slate-100 opacity-60 cursor-not-allowed' : 'cursor-pointer hover:border-indigo-400'}`}>
                            <div className="flex justify-between items-center">
                                <div>
                                    <p className="font-bold text-slate-800">{tier.name}</p>
                                    <p className="text-sm text-slate-500">{tier.maxTicketsSupply - tier.ticketsSold} restantes</p>
                                </div>
                                {isSoldOut 
                                    ? <span className="font-bold text-red-500">Esgotado</span>
                                    : isTierFree
                                        ? <span className="text-xl font-bold text-green-600">Grátis</span>
                                        : <p className="text-xl font-bold text-indigo-600">{(tier.priceLamports.toNumber() / web3.LAMPORTS_PER_SOL).toFixed(2)} SOL</p>
                                }
                            </div>
                        </div>
                    );
                })}
            </div>
            <ActionButton onClick={handleMintTicket} loading={isMinting} disabled={!wallet || isMinting || salesHaveEnded || salesHaveNotStarted || eventAccount.canceled} className={`w-full ${isFree && 'bg-green-600 hover:bg-green-700'}`}>
                { !wallet ? "Conecte a Carteira" 
                  : eventAccount.canceled ? "Evento Cancelado" 
                  : salesHaveEnded ? "Vendas Encerradas" 
                  : salesHaveNotStarted ? "Vendas em Breve" 
                  : isFree ? "Pegar Ingresso Grátis" : "Comprar Ingresso"}
            </ActionButton>
        </div>
    );
};


const PageSkeleton = () => (
    <div className="animate-pulse">
        <div className="h-96 bg-slate-200"></div>
        <div className="container mx-auto px-4 py-12">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                <div className="lg:col-span-2 space-y-12">
                    <div className="h-40 bg-slate-200 rounded-lg"></div>
                    <div className="h-24 bg-slate-200 rounded-lg"></div>
                </div>
                <div className="lg:col-span-1">
                    <div className="h-96 bg-slate-200 rounded-lg"></div>
                </div>
            </div>
        </div>
    </div>
);

const EventHero = ({ metadata }) => (
    <header className="relative bg-slate-800 h-96 flex items-center justify-center text-white overflow-hidden">
        <img src={metadata.image} alt={metadata.name} className="absolute top-0 left-0 w-full h-full object-cover opacity-30" />
        <div className="relative z-10 text-center p-4">
            <div className="flex justify-center items-center gap-3">
                <span className="bg-white/10 text-white text-xs font-semibold px-3 py-1 rounded-full">{metadata.category}</span>
                {metadata.tags?.map(tag => <span key={tag} className="bg-white/10 text-white text-xs font-semibold px-3 py-1 rounded-full">#{tag}</span>)}
            </div>
            <h1 className="text-4xl md:text-6xl font-extrabold mt-4 drop-shadow-lg">{metadata.name}</h1>
        </div>
    </header>
);

const Section = ({ title, icon: Icon, children }) => (
    <section>
        <h2 className="text-2xl font-bold text-slate-900 flex items-center mb-4">
            <Icon className="h-6 w-6 text-indigo-500 mr-3" />
            {title}
        </h2>
        <div className="prose max-w-none text-slate-600">{children}</div>
    </section>
);

const DescriptionSection = ({ description }) => (
    <Section title="Sobre o Evento" icon={InformationCircleIcon}>
        <p className="whitespace-pre-wrap">{description}</p>
    </Section>
);

const OrganizerSection = ({ organizer }) => (
    <Section title="Organizado por" icon={UserCircleIcon}>
        <div className="bg-slate-100 p-4 rounded-lg flex items-center justify-between">
            <p className="font-semibold">{organizer.name}</p>
            {organizer.website && <a href={organizer.website} target="_blank" rel="noopener noreferrer" className="text-indigo-600 font-semibold text-sm hover:underline">Visitar Website →</a>}
        </div>
    </Section>
);

const LocationSection = ({ location }) => {
    // Posição central do mapa. Leaflet espera números, então convertemos as strings.
    const position = [
        parseFloat(location.coordinates.latitude), 
        parseFloat(location.coordinates.longitude)
    ];

    return (
        <Section title="Localização" icon={MapPinIcon}>
            {location.type === 'Physical' ? (
                <div>
                    <p className="font-semibold mb-2">{location.venueName}</p>
                    <p>{`${location.address.street}, ${location.address.number} - ${location.address.neighborhood}, ${location.address.city} - ${location.address.state}`}</p>
                    
                    {/* Mapa Interativo com Leaflet e OpenStreetMap */}
                    <div className="mt-4 rounded-lg overflow-hidden border z-0">
                        <MapContainer center={position} zoom={16} scrollWheelZoom={false} style={{ height: '400px', width: '100%' }}>
                            <TileLayer
                                attribution='&copy; <a href="http://googleusercontent.com/osm/copyright">OpenStreetMap</a> contributors'
                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            />
                            <Marker position={position}>
                                <Popup>
                                    <span className="font-bold">{location.venueName}</span><br/>
                                    {location.address.street}, {location.address.number}
                                </Popup>
                            </Marker>
                        </MapContainer>
                    </div>
                </div>
            ) : (
                <div className="bg-slate-100 p-4 rounded-lg">
                    <p className="font-semibold">Este é um evento online.</p>
                    <a href={location.onlineUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-600 font-semibold text-sm hover:underline">Acessar o evento →</a>
                </div>
            )}
        </Section>
    );
};

const DetailsSection = ({ metadata }) => {
    const { organizer, additionalInfo } = metadata;
    const { dateTime } = metadata.properties;
    const startDate = new Date(dateTime.start);
    const endDate = new Date(dateTime.end);

    // ✅ LÓGICA DE FORMATAÇÃO DE DATA MELHORADA
    const formatOptions = {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    };
    const datePartStart = startDate.toLocaleDateString('pt-BR', formatOptions);
    const datePartEnd = endDate.toLocaleDateString('pt-BR', formatOptions);

    const timePartStart = startDate.toLocaleTimeString('pt-BR', { timeStyle: 'short' });
    const timePartEnd = endDate.toLocaleTimeString('pt-BR', { timeStyle: 'short' });

    // Verifica se o evento acontece e termina no mesmo dia
    const isSameDay = datePartStart === datePartEnd;

    // Constrói as strings de exibição com base na verificação
    const dateText = isSameDay 
        ? datePartStart 
        : `De ${datePartStart} a ${datePartEnd}`;
    
    const timeText = `${timePartStart} - ${timePartEnd}`;

    return (
        <div className="space-y-4">
            <h3 className="text-lg font-bold">Detalhes</h3>
            <DetailItem icon={CalendarDaysIcon} label={isSameDay ? "Data" : "Período"} text={dateText} />
            <DetailItem icon={ClockIcon} label="Horário" text={timeText} />
            <DetailItem icon={UserCircleIcon} label="Organizador" text={organizer.name} />
            <DetailItem icon={SparklesIcon} label="Classificação" text={additionalInfo.ageRestriction} />
        </div>
    );
};

const DetailItem = ({ icon: Icon, label, text }) => (
    <div className="flex items-start">
        <Icon className="h-5 w-5 text-slate-500 mt-0.5 flex-shrink-0" />
        <div className="ml-3">
            <p className="text-sm font-semibold text-slate-800">{label}</p>
            <p className="text-sm text-slate-600">{text}</p>
        </div>
    </div>
);