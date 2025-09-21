import { useState, useEffect, useMemo } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useConnection, useAnchorWallet, useWallet } from '@solana/wallet-adapter-react';
import { Program, AnchorProvider, web3 } from '@coral-xyz/anchor';
import { getAssociatedTokenAddress } from '@solana/spl-token';
import toast from 'react-hot-toast';
import { Html5QrcodeScanner } from 'html5-qrcode';
import idl from '@/idl/ticketing_system.json';
import { ActionButton } from '@/components/ui/ActionButton';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { DocumentMagnifyingGlassIcon, QrCodeIcon, ShieldCheckIcon, ShieldExclamationIcon, TicketIcon } from '@heroicons/react/24/outline';

const PROGRAM_ID = new web3.PublicKey("AHRuW77r9tM8RAX7qbhVyjktgSZueb6QVjDjWXjEoCeA");
const API_URL = "https://gasless-api-ke68.onrender.com";

export function ValidatorPage() {
    const { eventAddress } = useParams();
    const [searchParams] = useSearchParams();
    const { connection } = useConnection();
    const { publicKey } = useWallet();
    const anchorWallet = useAnchorWallet();

    const [isValidator, setIsValidator] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [ticketData, setTicketData] = useState(null);
    const [scannedMint, setScannedMint] = useState(null);
    const [manualMintAddress, setManualMintAddress] = useState('');

    const ticketToValidate = searchParams.get('ticket');

    const program = useMemo(() => {
        if (!anchorWallet) return null;
        const provider = new AnchorProvider(connection, anchorWallet, AnchorProvider.defaultOptions());
        return new Program(idl, PROGRAM_ID, provider);
    }, [connection, anchorWallet]);

    // Efeito para verificar permissão do validador
    useEffect(() => {
        if (!publicKey || !program) {
            setIsValidator(false);
            if (publicKey) setIsLoading(false);
            return;
        }
        const checkValidatorStatus = async () => {
            setIsLoading(true);
            try {
                const event = await program.account.event.fetch(new web3.PublicKey(eventAddress));
                const validatorPubkeys = event.validators.map(v => v.toString());
                setIsValidator(validatorPubkeys.includes(publicKey.toString()));
            } catch (error) {
                console.error("Erro ao verificar status do validador:", error);
                setIsValidator(false);
            } finally {
                setIsLoading(false);
            }
        };
        checkValidatorStatus();
    }, [publicKey, program, eventAddress]);

    // Efeito para buscar dados do ingresso (seja da URL ou do scan)
    useEffect(() => {
        const ticketId = ticketToValidate || scannedMint;
        if (ticketId) {
            const fetchTicketData = async () => {
                setIsLoading(true);
                try {
                    const response = await fetch(`${API_URL}/ticket-data/${ticketId}`);
                    if (!response.ok) throw new Error("Ingresso não encontrado ou inválido.");
                    const data = await response.json();
                    setTicketData(data);
                } catch (error) {
                    toast.error(error.message);
                    setScannedMint(null); // Limpa para evitar loops de erro
                } finally {
                    setIsLoading(false);
                }
            };
            fetchTicketData();
        }
    }, [ticketToValidate, scannedMint]);

    // Efeito para iniciar o scanner de câmera
    useEffect(() => {
        // Só inicia o scanner se for validador e não houver um ticket sendo processado
        if (isValidator && !ticketToValidate && !scannedMint) {
            const scanner = new Html5QrcodeScanner('qr-reader', { fps: 10, qrbox: { width: 250, height: 250 } }, false);
            const onScanSuccess = (decodedText) => {
                scanner.clear().catch(() => {});
                setScannedMint(decodedText); // Define o ingresso escaneado para a próxima etapa
            };
            scanner.render(onScanSuccess, () => {}); // Ignora erros de "QR não encontrado"
            return () => { scanner.clear().catch(() => {}); };
        }
    }, [isValidator, ticketToValidate, scannedMint]);

    const handleManualSearch = (e) => {
        e.preventDefault();
        if (manualMintAddress.trim()) {
            setScannedMint(manualMintAddress.trim());
        } else {
            toast.error("Por favor, insira um endereço de ingresso.");
        }
    };

    const handleRedeemTicket = async () => {
        if (!program || !ticketData || !publicKey) return;
        const loadingToast = toast.loading("Validando ingresso na blockchain...");
        try {
            const owner = new web3.PublicKey(ticketData.owner);
            const nftMint = new web3.PublicKey(ticketData.ticket.nftMint);
            const [ticketPda] = web3.PublicKey.findProgramAddressSync(
                [Buffer.from("ticket"), new web3.PublicKey(eventAddress).toBuffer(), nftMint.toBuffer()],
                program.programId
            );
            const nftTokenAccount = await getAssociatedTokenAddress(nftMint, owner);
            const signature = await program.methods
                .redeemTicket()
                .accounts({
                    ticket: ticketPda, event: new web3.PublicKey(eventAddress),
                    validator: publicKey, owner: owner,
                    nftToken: nftTokenAccount, nftMint: nftMint,
                })
                .rpc();
            toast.success(`Ingresso validado!`, { id: loadingToast, duration: 5000 });
            setTicketData(null);
            window.location.href = window.location.pathname; // Redireciona para a página de scan limpa
        } catch (error) {
            console.error("Erro ao validar ingresso:", error);
            const errorMsg = error.error?.errorMessage || error.message || "Erro desconhecido.";
            toast.error(`Falha na validação: ${errorMsg}`, { id: loadingToast });
        }
    };

    // --- RENDERIZAÇÃO CONDICIONAL ---

    // 1. Tela para escolher a carteira após escanear
    if (scannedMint && !ticketToValidate && ticketData) {
        const validationUrl = `${window.location.origin}${window.location.pathname}?ticket=${scannedMint}`;
        const solflareUrl = `https://solflare.com/ul/v1/browse/${encodeURIComponent(validationUrl)}`;
        const phantomUrl = `https://phantom.app/ul/v1/browse/${encodeURIComponent(validationUrl)}#v=1`;

        return (
            <div className="flex justify-center items-center h-screen bg-slate-100 p-4">
                <div className="w-full max-w-md bg-white p-8 rounded-lg shadow-xl text-center">
                    <QrCodeIcon className="mx-auto h-12 w-12 text-green-600"/>
                    <h2 className="mt-4 text-2xl font-bold">Ingresso Escaneado!</h2>
                    <p className="mt-2 text-slate-600">Agora, abra em sua carteira para assinar e confirmar a validação.</p>
                    <div className="mt-6 text-left space-y-2 bg-slate-50 p-4 rounded-md">
                        <p><strong className="text-slate-800">Nome:</strong> {ticketData.profile.name}</p>
                        <p className="font-mono text-xs break-all"><strong className="text-slate-800 font-sans text-base">Ingresso:</strong> {scannedMint}</p>
                    </div>
                    <div className="mt-6 flex flex-col gap-3">
                        <a href={solflareUrl} className="block w-full text-center bg-purple-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-purple-700">Validar com Solflare</a>
                        <a href={phantomUrl} className="block w-full text-center bg-indigo-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-indigo-700">Validar com Phantom</a>
                    </div>
                     <button onClick={() => { setTicketData(null); setScannedMint(null); }} className="mt-4 text-slate-600 hover:underline">
                        Voltar para o Scanner
                    </button>
                </div>
            </div>
        );
    }

    // 2. Tela de confirmação final (quando a URL já tem o ticket)
    if (ticketToValidate) {
        if (!publicKey) return ( <div className="flex flex-col justify-center items-center h-screen bg-slate-100 text-center p-4"> <ShieldExclamationIcon className="h-16 w-16" /> <h1 className="mt-4 text-2xl font-bold">Conecte sua Carteira para Validar</h1> <div className="mt-6"><WalletMultiButton /></div> </div> );
        if (isLoading) return <div className="text-center py-20">Carregando...</div>;
        if (!isValidator) return <div className="text-center py-20 text-red-500"><h1>Acesso Negado</h1><p>Sua carteira não é um validador.</p></div>;
        if (!ticketData) return <div className="text-center py-20 text-red-500"><h1>Erro</h1><p>Não foi possível carregar o ingresso.</p></div>;

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
                        <ActionButton onClick={handleRedeemTicket} disabled={ticket.redeemed}>Assinar e Concluir Check-in</ActionButton>
                        <a href={window.location.pathname} className="text-slate-600 hover:underline">Cancelar</a>
                    </div>
                </div>
            </div>
        );
    }

    // 3. Tela inicial do scanner e busca manual
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 text-white p-4">
            <div className="text-center mb-8">
                <div className="inline-flex items-center gap-3 bg-green-500/20 text-green-300 py-2 px-6 rounded-full">
                    <ShieldCheckIcon className="h-6 w-6"/><span className="font-bold">Modo Validador Ativo</span>
                </div>
            </div>
            
            <div className="w-full max-w-sm text-center">
                <h1 className="text-3xl font-bold">Aponte para o QR Code</h1>
                <div id="qr-reader" className="w-full bg-slate-800 p-2 mt-4 rounded-lg shadow-lg"></div>
            </div>
            
            <div className="my-8 flex items-center w-full max-w-sm">
                <div className="flex-grow border-t border-slate-700"></div>
                <span className="flex-shrink mx-4 text-slate-500 font-bold">OU</span>
                <div className="flex-grow border-t border-slate-700"></div>
            </div>

            <div className="w-full max-w-sm text-center">
                <h2 className="text-xl font-bold">Insira o código manualmente</h2>
                <form onSubmit={handleManualSearch} className="mt-4 flex gap-2">
                    <input 
                        type="text"
                        value={manualMintAddress}
                        onChange={(e) => setManualMintAddress(e.target.value)}
                        placeholder="Endereço do Ingresso (NFT)"
                        className="w-full bg-slate-800 border border-slate-600 rounded-md p-3 text-white placeholder-slate-500 focus:ring-2 focus:ring-indigo-500"
                    />
                    <button type="submit" className="bg-indigo-600 p-3 rounded-md hover:bg-indigo-700">
                        <DocumentMagnifyingGlassIcon className="h-6 w-6"/>
                    </button>
                </form>
            </div>
        </div>
    );
}
