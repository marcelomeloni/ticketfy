import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useConnection, useAnchorWallet, useWallet } from '@solana/wallet-adapter-react';
import { Program, AnchorProvider, web3 } from '@coral-xyz/anchor';
import { getAssociatedTokenAddress } from '@solana/spl-token';
import toast from 'react-hot-toast';
import { Html5QrcodeScanner } from 'html5-qrcode';
import idl from '@/idl/ticketing_system.json';
// import { supabase } from '@/lib/supabaseClient'; // ✅ REMOVIDO: Não é mais necessário aqui.
import { ActionButton } from '@/components/ui/ActionButton';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { DocumentMagnifyingGlassIcon, ClipboardDocumentCheckIcon, ShieldCheckIcon, ShieldExclamationIcon, TicketIcon, QrCodeIcon, ClockIcon, UserIcon, UserGroupIcon } from '@heroicons/react/24/outline';
import { PROGRAM_ID, API_URL } from '@/lib/constants';


// --- Componentes Modulares de UI (Inalterados) ---

const StatCard = ({ title, value, icon: Icon, color }) => (
    <div className="bg-white p-4 rounded-lg flex items-center gap-4 border border-slate-200">
        <div className={`p-3 rounded-full ${color}`}>
            <Icon className="h-6 w-6 text-white"/>
        </div>
        <div>
            <p className="text-sm font-semibold text-slate-500">{title}</p>
            <p className="text-2xl font-bold text-slate-800">{value}</p>
        </div>
    </div>
);

const ScannerView = ({ onScan, onManualSearch }) => {
    const [manualMintAddress, setManualMintAddress] = useState('');

    useEffect(() => {
        let scanner;
        if (document.getElementById('qr-reader-container')?.innerHTML === "") {
            scanner = new Html5QrcodeScanner('qr-reader-container', { fps: 10, qrbox: { width: 250, height: 250 } }, false);
            const handleSuccess = (decodedText, decodedResult) => {
                onScan(decodedText);
                if (scanner.getState() && scanner.getState() !== 1) { // 1 = NOT_STARTED
                    scanner.clear().catch(err => console.error("Falha ao limpar scanner", err));
                }
            };
            scanner.render(handleSuccess, () => {});
        }
        return () => {
            if (scanner && scanner.getState() && scanner.getState() !== 1) {
                scanner.clear().catch(() => {});
            }
        };
    }, [onScan]);

    return (
        <div className="w-full text-center">
            <h2 className="text-2xl font-bold text-slate-800">Escanear Ingresso</h2>
            <p className="text-slate-500 mt-1 mb-4">Aponte a câmera para o QR Code do participante.</p>
            <div id="qr-reader-container" className="w-full max-w-md mx-auto bg-slate-100 p-2 rounded-lg border-2 border-dashed border-slate-300"></div>
            <div className="my-6 flex items-center w-full">
                <div className="flex-grow border-t border-slate-300"></div>
                <span className="flex-shrink mx-4 text-slate-500 font-bold">OU</span>
                <div className="flex-grow border-t border-slate-300"></div>
            </div>
            <h3 className="text-lg font-bold text-slate-800">Busca Manual</h3>
            <p className="text-slate-500 mt-1 mb-4">Insira o código do ingresso manualmente.</p>
            <form onSubmit={(e) => { e.preventDefault(); onManualSearch(manualMintAddress); }} className="mt-4 flex gap-2 max-w-md mx-auto">
                <input type="text" value={manualMintAddress} onChange={(e) => setManualMintAddress(e.target.value)} placeholder="Endereço do Ingresso (NFT)" className="w-full bg-white border border-slate-300 rounded-md p-3 text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-indigo-500" />
                <button type="submit" className="bg-indigo-600 p-3 text-white rounded-md hover:bg-indigo-700"><DocumentMagnifyingGlassIcon className="h-6 w-6" /></button>
            </form>
        </div>
    );
};

const RecentValidations = ({ entries }) => (
    <div>
        <h2 className="text-lg font-bold text-slate-800 mb-4">Últimas Validações</h2>
        <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
            {entries.length > 0 ? entries.map((entry) => {
                // ✅ Lógica atualizada: Procura por 'entry.name' OU 'entry.ownerName'
                const displayName = entry.name || entry.ownerName;

                return (
                    <div key={entry.nftMint} className="bg-slate-50 p-3 rounded-lg flex items-center justify-between animate-fade-in border border-slate-200">
                        <div className="flex items-center gap-3">
                            <UserIcon className="h-5 w-5 text-green-500"/>
                            <p className="font-medium text-slate-700">
                                {displayName || `${entry.owner.slice(0, 4)}...${entry.owner.slice(-4)}`}
                            </p>
                        </div>
                        <p className="text-sm text-slate-500">{entry.redeemedAt}</p>
                    </div>
                );
            }) : <p className="text-slate-500 text-center py-4">Nenhum ingresso validado ainda.</p>}
        </div>
    </div>
);

// --- Componente Principal da Página ---

export function ValidatorPage() {
    const { eventAddress } = useParams();
    const [searchParams] = useSearchParams();
    const { connection } = useConnection();
    const { publicKey } = useWallet();
    const anchorWallet = useAnchorWallet();

    const [eventAccount, setEventAccount] = useState(null);
    const [isValidator, setIsValidator] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [ticketData, setTicketData] = useState(null);
    const [scannedMint, setScannedMint] = useState(null);
    const [recentEntries, setRecentEntries] = useState([]);

    const ticketToValidate = searchParams.get('ticket');

    const program = useMemo(() => {
        if (!anchorWallet) return null;
        const provider = new AnchorProvider(connection, anchorWallet, AnchorProvider.defaultOptions());
        return new Program(idl, PROGRAM_ID, provider);
    }, [connection, anchorWallet]);

    const fetchEventAndCheckValidator = useCallback(async () => {
        if (!publicKey || !program) {
            setIsValidator(false);
            if (publicKey) setIsLoading(false);
            return;
        }
        setIsLoading(true);
        try {
            const event = await program.account.event.fetch(new web3.PublicKey(eventAddress));
            setEventAccount(event);
            const validatorPubkeys = event.validators.map(v => v.toString());
            setIsValidator(validatorPubkeys.includes(publicKey.toString()));
        } catch (error) {
            console.error("Erro ao verificar status do validador:", error);
            setIsValidator(false);
        } finally {
            setIsLoading(false);
        }
    }, [publicKey, program, eventAddress]);
    
    useEffect(() => {
        fetchEventAndCheckValidator();
    }, [fetchEventAndCheckValidator]);
    
    // ✅ FUNÇÃO SIMPLIFICADA
    const fetchRecentEntries = useCallback(async () => {
        if (!isValidator) return;
        try {
            const response = await fetch(`${API_URL}/event/${eventAddress}/validated-tickets`);
            if (!response.ok) throw new Error('Falha ao buscar validações da API');
            
            const entriesFromApi = await response.json();
            // Os dados já vêm enriquecidos com o nome, basta setar o estado.
            setRecentEntries(entriesFromApi);

        } catch (error) {
            console.error("Erro ao buscar entradas recentes:", error);
        }
    }, [eventAddress, isValidator]);

    useEffect(() => {
        if (isValidator) {
            fetchRecentEntries();
            const interval = setInterval(fetchRecentEntries, 15000); // Atualiza a cada 15s
            return () => clearInterval(interval);
        }
    }, [isValidator, fetchRecentEntries]);
    
    // ✅ FUNÇÃO SIMPLIFICADA
    const fetchTicketData = useCallback(async (ticketId) => {
        if (!ticketId) return;
        setIsLoading(true);
        try {
            const response = await fetch(`${API_URL}/ticket-data/${ticketId}`);
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Ingresso não encontrado ou inválido.");
            }
            
            const data = await response.json();
            // A 'data' agora JÁ CONTÉM o 'ownerName' vindo da API.
            setTicketData(data);

        } catch (error) {
            toast.error(error.message);
            setScannedMint(null);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        const ticketId = ticketToValidate || scannedMint;
        if (ticketId) {
            fetchTicketData(ticketId);
        }
    }, [ticketToValidate, scannedMint, fetchTicketData]);
    
    const handleRedeemTicket = async () => {
        if (!program || !ticketData || !publicKey) return;
        const loadingToast = toast.loading("Validando ingresso na blockchain...");
        try {
            const owner = new web3.PublicKey(ticketData.owner);
            const nftMint = new web3.PublicKey(ticketData.ticket.nftMint);
            const [ticketPda] = web3.PublicKey.findProgramAddressSync([Buffer.from("ticket"), new web3.PublicKey(eventAddress).toBuffer(), nftMint.toBuffer()], program.programId);
            const nftTokenAccount = await getAssociatedTokenAddress(nftMint, owner);
            
            await program.methods.redeemTicket().accounts({ 
                ticket: ticketPda, 
                event: new web3.PublicKey(eventAddress), 
                validator: publicKey, 
                owner, 
                nftToken: nftTokenAccount, 
                nftMint 
            }).rpc();
            
            toast.success(`Ingresso de ${ticketData.ownerName || 'participante'} validado!`, { id: loadingToast, duration: 5000 });
            
            fetchRecentEntries();
            fetchEventAndCheckValidator();

            setTicketData(null);
            if (ticketToValidate) {
                // Remove o query param da URL sem recarregar a página
                window.history.replaceState(null, '', window.location.pathname);
            } else {
                setScannedMint(null);
            }
        } catch (error) {
            console.error("Erro ao validar ingresso:", error);
            const errorMsg = error.error?.errorMessage || error.message || "Erro desconhecido.";
            toast.error(`Falha na validação: ${errorMsg}`, { id: loadingToast });
        }
    };
    
    // --- Telas de Estado ---

    if (!publicKey) return ( <div className="flex flex-col justify-center items-center h-screen bg-slate-100 text-center p-4"> <ShieldExclamationIcon className="h-16 w-16 text-slate-500" /> <h1 className="mt-4 text-2xl font-bold">Área do Validador</h1> <p className="mt-2 text-slate-600">Conecte sua carteira para continuar.</p> <div className="mt-6"><WalletMultiButton /></div></div>);
    if (isLoading && !ticketData) return <div className="flex justify-center items-center h-screen bg-slate-100"><ClockIcon className="h-12 w-12 text-slate-500 animate-spin"/></div>;
    if (!isValidator) return <div className="text-center py-20 text-red-500"><h1>Acesso Negado</h1><p>A carteira conectada não é um validador autorizado.</p></div>;
    
    // --- Layout Principal ---

    return (
        <div className="bg-slate-50 min-h-screen">
            <header className="bg-white shadow-sm sticky top-0 z-10">
                <div className="container mx-auto px-4 py-4 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <ShieldCheckIcon className="h-8 w-8 text-indigo-600"/>
                        <div>
                            <h1 className="text-xl font-bold text-slate-800">Painel do Validador</h1>
                            <p className="text-sm text-slate-500 font-mono hidden sm:block">{publicKey.toString()}</p>
                            <p className="text-sm text-slate-500 font-mono sm:hidden">{publicKey.toString().slice(0, 4)}...{publicKey.toString().slice(-4)}</p>
                        </div>
                    </div>
                    <WalletMultiButton />
                </div>
            </header>

            {ticketData && (
                <div className="fixed inset-0 bg-black/60 flex justify-center items-center z-50 p-4 animate-fade-in">
                    {/* Modal para validação via link (validador assina) */}
                    {ticketToValidate ? (
                        <div className="w-full max-w-md bg-white p-8 rounded-lg shadow-xl text-center">
                            <TicketIcon className="mx-auto h-12 w-12 text-indigo-600"/>
                            <h2 className="mt-4 text-2xl font-bold">Confirmar Validação</h2>
                            <div className="mt-6 text-left space-y-2 bg-slate-50 p-4 rounded-md border border-slate-200">
                                <p><strong className="text-slate-800">Dono:</strong> {ticketData.ownerName || <span className="font-mono text-xs">{ticketData.owner}</span>}</p>
                                <p className="font-mono text-xs break-all"><strong className="text-slate-800 font-sans text-base">Ingresso:</strong> {ticketData.ticket.nftMint}</p>
                                {ticketData.ticket.redeemed ? <p className="font-bold text-red-500">Status: JÁ VALIDADO!</p> : <p className="font-bold text-green-500">Status: PRONTO PARA VALIDAR</p>}
                            </div>
                            <div className="mt-6 flex flex-col gap-3">
                                <ActionButton onClick={handleRedeemTicket} disabled={ticketData.ticket.redeemed}>Assinar e Concluir Check-in</ActionButton>
                                <button onClick={() => window.history.replaceState(null, '', window.location.pathname)} className="text-slate-600 hover:underline">Cancelar</button>
                            </div>
                        </div>
                    ) : (
                        // Modal para validação via QR Code (participante assina)
                        <div className="w-full max-w-md bg-white p-8 rounded-lg shadow-xl text-center">
                            <QrCodeIcon className="mx-auto h-12 w-12 text-green-600"/>
                            <h2 className="mt-4 text-2xl font-bold">Ingresso Encontrado!</h2>
                            <p className="mt-2 text-slate-600">Copie o link e cole no navegador da carteira do participante para ele assinar a validação.</p>
                            <div className="mt-6 text-left space-y-2 bg-slate-50 p-4 rounded-md">
                                <p><strong className="text-slate-800">Dono:</strong> {ticketData.ownerName || <span className="font-mono text-xs">{ticketData.owner}</span>}</p>
                                <p className="font-mono text-xs break-all"><strong className="text-slate-800 font-sans text-base">Ingresso:</strong> {scannedMint}</p>
                            </div>
                            <div className="mt-6">
                                <label className="text-sm font-semibold text-slate-700 text-left block mb-2">Link de Validação:</label>
                                <div className="flex gap-2">
                                    <input type="text" readOnly value={`${window.location.origin}${window.location.pathname}?ticket=${scannedMint}`} className="w-full text-xs font-mono bg-slate-100 border-slate-300 rounded-md shadow-sm"/>
                                    <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}${window.location.pathname}?ticket=${scannedMint}`); toast.success("Link copiado!"); }} className="p-3 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 flex-shrink-0"><ClipboardDocumentCheckIcon className="h-6 w-6" /></button>
                                </div>
                            </div>
                            <button onClick={() => { setTicketData(null); setScannedMint(null); }} className="mt-6 text-slate-600 hover:underline">Voltar</button>
                        </div>
                    )}
                </div>
            )}

            <main className="container mx-auto p-4 md:p-8 grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow-md">
                    <ScannerView onScan={setScannedMint} onManualSearch={setScannedMint} />
                </div>
                <div className="space-y-8">
                    <div className="bg-white p-6 rounded-lg shadow-md">
                        <h2 className="text-lg font-bold text-slate-800 mb-4">Estatísticas</h2>
                        <div className="space-y-4">
                            <StatCard title="Ingressos Validados" value={recentEntries.length} icon={UserGroupIcon} color="bg-green-500" />
                            <StatCard title="Total Vendido" value={eventAccount?.totalTicketsSold.toString() || '0'} icon={TicketIcon} color="bg-blue-500" />
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-lg shadow-md">
                        <RecentValidations entries={recentEntries} />
                    </div>
                </div>
            </main>
        </div>
    );
}

