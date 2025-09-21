import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useConnection, useAnchorWallet, useWallet } from '@solana/wallet-adapter-react';
import { Program, AnchorProvider, web3 } from '@coral-xyz/anchor';
import { getAssociatedTokenAddress } from '@solana/spl-token';
import toast from 'react-hot-toast';
import { Html5QrcodeScanner } from 'html5-qrcode';
import idl from '@/idl/ticketing_system.json';
import { ActionButton } from '@/components/ui/ActionButton';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { DocumentMagnifyingGlassIcon, ClipboardDocumentCheckIcon, ShieldCheckIcon, ShieldExclamationIcon, TicketIcon, QrCodeIcon, ClockIcon, UserIcon } from '@heroicons/react/24/outline';

const PROGRAM_ID = new web3.PublicKey("AHRuW77r9tM8RAX7qbhVyjktgSZueb6QVjDjWXjEoCeA");
const API_URL = "https://gasless-api-ke68.onrender.com";

// --- Componentes Modulares para UI ---

const DashboardStats = ({ validatedCount, totalCount }) => (
    <div className="w-full max-w-sm bg-slate-800/50 p-4 rounded-lg flex justify-around text-center mb-8 border border-slate-700">
        <div>
            <p className="text-slate-400 text-sm font-semibold">Validados</p>
            <p className="text-3xl font-bold text-green-400">{validatedCount}</p>
        </div>
        <div>
            <p className="text-slate-400 text-sm font-semibold">Total Vendido</p>
            <p className="text-3xl font-bold text-white">{totalCount}</p>
        </div>
    </div>
);

const ScannerView = ({ onScan, onManualSearch }) => {
    const [manualMintAddress, setManualMintAddress] = useState('');
    useEffect(() => {
        const scanner = new Html5QrcodeScanner('qr-reader-container', { fps: 10, qrbox: { width: 250, height: 250 } }, false);
        const handleSuccess = (decodedText) => {
            try {
                scanner.clear();
                onScan(decodedText);
            } catch (e) { console.error("Falha ao limpar o scanner:", e); }
        };
        scanner.render(handleSuccess, () => {});
        return () => {
            // Garante que o scanner seja limpo ao desmontar o componente
            if (scanner && scanner.getState()) {
                scanner.clear().catch(() => {});
            }
        };
    }, [onScan]);

    return (
        <div className="w-full max-w-sm text-center">
            <h1 className="text-3xl font-bold">Aponte para o QR Code</h1>
            <div id="qr-reader-container" className="w-full bg-slate-800 p-2 mt-4 rounded-lg shadow-lg border border-slate-700"></div>
            <div className="my-8 flex items-center w-full">
                <div className="flex-grow border-t border-slate-700"></div>
                <span className="flex-shrink mx-4 text-slate-500 font-bold">OU</span>
                <div className="flex-grow border-t border-slate-700"></div>
            </div>
            <h2 className="text-xl font-bold">Insira o código manualmente</h2>
            <form onSubmit={(e) => { e.preventDefault(); onManualSearch(manualMintAddress); }} className="mt-4 flex gap-2">
                <input type="text" value={manualMintAddress} onChange={(e) => setManualMintAddress(e.target.value)} placeholder="Endereço do Ingresso (NFT)" className="w-full bg-slate-800 border border-slate-600 rounded-md p-3 text-white placeholder-slate-500 focus:ring-2 focus:ring-indigo-500" />
                <button type="submit" className="bg-indigo-600 p-3 rounded-md hover:bg-indigo-700"><DocumentMagnifyingGlassIcon className="h-6 w-6" /></button>
            </form>
        </div>
    );
};

const RecentValidations = ({ entries }) => (
    <div className="w-full max-w-sm mt-12">
        <h3 className="text-xl font-bold text-white mb-4 text-center">Últimas Validações</h3>
        <div className="space-y-3 max-h-60 overflow-y-auto pr-2 bg-slate-800/30 p-4 rounded-lg border border-slate-700">
            {entries.length > 0 ? entries.map((entry) => (
                <div key={entry.nftMint} className="bg-slate-800 p-3 rounded-lg flex items-center justify-between animate-fade-in">
                    <div className="flex items-center gap-3">
                        <UserIcon className="h-5 w-5 text-green-400"/>
                        <p className="font-medium text-slate-200">{entry.name}</p>
                    </div>
                    <p className="text-sm text-slate-400">{entry.redeemedAt}</p>
                </div>
            )) : <p className="text-slate-500 text-center py-4">Nenhum ingresso validado ainda.</p>}
        </div>
    </div>
);

const WalletChoiceScreen = ({ scannedMint, ticketData, onCancel }) => {
    const validationUrl = `${window.location.origin}${window.location.pathname}?ticket=${scannedMint}`;
    const handleCopyLink = () => { navigator.clipboard.writeText(validationUrl); toast.success("Link de validação copiado!"); };
    
    return (
        <div className="flex justify-center items-center h-screen bg-slate-100 p-4">
            <div className="w-full max-w-md bg-white p-8 rounded-lg shadow-xl text-center">
                <QrCodeIcon className="mx-auto h-12 w-12 text-green-600"/>
                <h2 className="mt-4 text-2xl font-bold">Ingresso Encontrado!</h2>
                <p className="mt-2 text-slate-600">Copie o link abaixo e cole no navegador da sua carteira para assinar a validação.</p>
                <div className="mt-6 text-left space-y-2 bg-slate-50 p-4 rounded-md">
                    <p><strong className="text-slate-800">Nome:</strong> {ticketData.profile.name}</p>
                    <p className="font-mono text-xs break-all"><strong className="text-slate-800 font-sans text-base">Ingresso:</strong> {scannedMint}</p>
                </div>
                <div className="mt-6">
                    <label className="text-sm font-semibold text-slate-700 text-left block mb-2">Link de Validação:</label>
                    <div className="flex gap-2">
                         <input type="text" readOnly value={validationUrl} className="w-full text-xs font-mono bg-slate-100 border-slate-300 rounded-md shadow-sm"/>
                         <button onClick={handleCopyLink} className="p-3 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 flex-shrink-0"><ClipboardDocumentCheckIcon className="h-6 w-6" /></button>
                    </div>
                </div>
                <button onClick={onCancel} className="mt-6 text-slate-600 hover:underline">Voltar</button>
            </div>
        </div>
    );
};

const ConfirmationScreen = ({ ticketData, onConfirm, onCancel }) => {
    const { profile, ticket } = ticketData;
    return (
        <div className="flex justify-center items-center h-screen bg-slate-100 p-4">
            <div className="w-full max-w-md bg-white p-8 rounded-lg shadow-xl text-center">
                <TicketIcon className="mx-auto h-12 w-12 text-indigo-600"/>
                <h2 className="mt-4 text-2xl font-bold">Confirmar Validação Final</h2>
                <div className="mt-6 text-left space-y-2 bg-slate-50 p-4 rounded-md">
                    <p><strong className="text-slate-800">Nome:</strong> {profile.name}</p>
                    <p className="font-mono text-xs break-all"><strong className="text-slate-800 font-sans text-base">Ingresso:</strong> {ticket.nftMint}</p>
                    {ticket.redeemed ? <p className="font-bold text-red-500">Status: JÁ VALIDADO!</p> : <p className="font-bold text-green-500">Status: PRONTO PARA VALIDAR</p>}
                </div>
                <div className="mt-6 flex flex-col gap-3">
                    <ActionButton onClick={onConfirm} disabled={ticket.redeemed}>Assinar e Concluir Check-in</ActionButton>
                    <a href={window.location.pathname} className="text-slate-600 hover:underline">Cancelar</a>
                </div>
            </div>
        </div>
    );
};

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
    
    const fetchRecentEntries = useCallback(async () => {
        if (!isValidator) return;
        try {
            const response = await fetch(`${API_URL}/event/${eventAddress}/validated-tickets`);
            if (response.ok) {
                const data = await response.json();
                setRecentEntries(data);
            }
        } catch (error) {
            console.error("Erro ao buscar entradas recentes:", error);
        }
    }, [eventAddress, isValidator]);

    useEffect(() => {
        if (isValidator) {
            fetchRecentEntries();
            const interval = setInterval(fetchRecentEntries, 15000);
            return () => clearInterval(interval);
        }
    }, [isValidator, fetchRecentEntries]);
    
    const fetchTicketData = useCallback(async (ticketId) => {
        if (!ticketId) return;
        setIsLoading(true);
        try {
            const response = await fetch(`${API_URL}/ticket-data/${ticketId}`);
            if (!response.ok) throw new Error("Ingresso não encontrado ou inválido.");
            const data = await response.json();
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
            const signature = await program.methods.redeemTicket().accounts({ ticket: ticketPda, event: new web3.PublicKey(eventAddress), validator: publicKey, owner, nftToken: nftTokenAccount, nftMint }).rpc();
            
            toast.success(`Ingresso validado!`, { id: loadingToast, duration: 5000 });
            
            const newEntry = { name: ticketData.profile.name, redeemedAt: new Date().toLocaleTimeString('pt-BR'), nftMint: ticketData.ticket.nftMint };
            setRecentEntries(prev => [newEntry, ...prev]);

            setTicketData(null);
            if (ticketToValidate) {
                window.location.href = window.location.pathname;
            } else {
                setScannedMint(null);
            }
        } catch (error) {
            console.error("Erro ao validar ingresso:", error);
            const errorMsg = error.error?.errorMessage || error.message || "Erro desconhecido.";
            toast.error(`Falha na validação: ${errorMsg}`, { id: loadingToast });
        }
    };
    
    // --- Renderização Principal ---

    if (!publicKey) return ( <div className="flex flex-col justify-center items-center h-screen bg-slate-100 text-center p-4"> <ShieldExclamationIcon className="h-16 w-16 text-slate-500" /> <h1 className="mt-4 text-2xl font-bold">Área do Validador</h1> <p className="mt-2 text-slate-600">Conecte sua carteira para continuar.</p> <div className="mt-6"><WalletMultiButton /></div></div>);
    if (isLoading && !ticketData) return <div className="flex justify-center items-center h-screen"><ClockIcon className="h-12 w-12 animate-spin"/></div>;
    if (!isValidator) return <div className="text-center py-20 text-red-500"><h1>Acesso Negado</h1><p>A carteira conectada não é um validador autorizado.</p></div>;

    if (ticketData) {
        if (scannedMint && !ticketToValidate) {
             return <WalletChoiceScreen scannedMint={scannedMint} ticketData={ticketData} onCancel={() => { setTicketData(null); setScannedMint(null); }} />;
        }
        if (ticketToValidate) {
            return <ConfirmationScreen ticketData={ticketData} onConfirm={handleRedeemTicket} onCancel={() => window.location.href = window.location.pathname} />;
        }
    }

    return (
        <div className="flex flex-col items-center min-h-screen bg-slate-900 text-white p-4 py-8">
            <header className="text-center mb-8 w-full max-w-sm">
                <div className="inline-flex items-center gap-3 bg-green-500/20 text-green-300 py-2 px-6 rounded-full">
                    <ShieldCheckIcon className="h-6 w-6"/><span className="font-bold">Modo Validador Ativo</span>
                </div>
                <p className="text-sm text-slate-400 mt-4 font-mono">{publicKey.toString()}</p>
            </header>
            <DashboardStats validatedCount={recentEntries.length} totalCount={eventAccount?.totalTicketsSold.toString() || '0'} />
            <ScannerView onScan={setScannedMint} onManualSearch={setScannedMint} />
            <RecentValidations entries={recentEntries} />
        </div>
    );
}
