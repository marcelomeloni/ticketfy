// src/pages/ValidatorPage.jsx

import { useState, useEffect, useMemo } from 'react';
import { useParams, useSearchParams } from 'react-router-dom'; // ✅ useSearchParams para ler a URL
import { useConnection, useAnchorWallet, useWallet } from '@solana/wallet-adapter-react';
import { Program, AnchorProvider, web3 } from '@coral-xyz/anchor';
import { getAssociatedTokenAddress } from '@solana/spl-token';
import toast from 'react-hot-toast';
import { Html5QrcodeScanner, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import idl from '@/idl/ticketing_system.json';
import { ActionButton } from '@/components/ui/ActionButton';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { QrCodeIcon, ShieldCheckIcon, ShieldExclamationIcon, TicketIcon, ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline';

const PROGRAM_ID = new web3.PublicKey("AHRuW77r9tM8RAX7qbhVyjktgSZueb6QVjDjWXjEoCeA");
const API_URL = "https://gasless-api-ke68.onrender.com";

export function ValidatorPage() {
    const { eventAddress } = useParams();
    const [searchParams] = useSearchParams(); // ✅ Hook para ler parâmetros da URL
    const { connection } = useConnection();
    const { publicKey, wallet } = useWallet();
    const anchorWallet = useAnchorWallet();

    const [isValidator, setIsValidator] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [ticketData, setTicketData] = useState(null);

    // ✅ O estado agora é controlado pelo parâmetro 'ticket' na URL
    const ticketToValidate = searchParams.get('ticket');

    const program = useMemo(() => {
        if (!anchorWallet) return null;
        const provider = new AnchorProvider(connection, anchorWallet, AnchorProvider.defaultOptions());
        return new Program(idl, PROGRAM_ID, provider);
    }, [connection, anchorWallet]);

    // Efeito para buscar dados do evento e verificar permissão do validador (apenas se a carteira estiver conectada)
    useEffect(() => {
        if (!publicKey || !program) {
            setIsValidator(false);
            if (publicKey) setIsLoading(false); // Só para de carregar se a carteira estiver conectada
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
    
    // Efeito para configurar o scanner OU buscar dados do ticket da URL
    useEffect(() => {
        // Se a URL já contém um ingresso para validar, busca os dados
        if (ticketToValidate) {
            const fetchTicketData = async () => {
                setIsLoading(true);
                try {
                    const response = await fetch(`${API_URL}/ticket-data/${ticketToValidate}`);
                    if (!response.ok) throw new Error("Ingresso não encontrado ou inválido.");
                    const data = await response.json();
                    setTicketData(data);
                } catch (error) {
                    toast.error(error.message);
                } finally {
                    setIsLoading(false);
                }
            };
            fetchTicketData();
        } 
        // Se não, e se o usuário for um validador, inicia o scanner
        else if (isValidator) {
            const scanner = new Html5QrcodeScanner('qr-reader', { fps: 10, qrbox: { width: 250, height: 250 } }, false);
            const onScanSuccess = (decodedText) => {
                scanner.clear();
                // ✅ Em vez de setar o estado, agora ele constrói a URL de validação
                const validationUrl = `${window.location.pathname}?ticket=${decodedText}`;
                // E redireciona o usuário para o navegador da carteira
                window.location.href = `https://solflare.com/ul/v1/browse/${encodeURIComponent(window.location.origin + validationUrl)}`;
            };
            scanner.render(onScanSuccess, () => {});
            return () => { scanner.clear().catch(() => {}); };
        }
    }, [isValidator, ticketToValidate]); // Depende do status de validador e do parâmetro na URL
    
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
            // Limpa a tela para o próximo scan
            setTicketData(null);
            // Redireciona para a página de scan limpa (sem o parâmetro na URL)
            window.location.href = window.location.pathname;

        } catch (error) {
            console.error("Erro ao validar ingresso:", error);
            const errorMsg = error.error?.errorMessage || error.message || "Erro desconhecido.";
            toast.error(`Falha na validação: ${errorMsg}`, { id: loadingToast });
        }
    };

    // --- RENDERIZAÇÃO ---

    // Se tem um ticket na URL para validar, mas a carteira não está conectada
    if (ticketToValidate && !publicKey) {
        return (
            <div className="flex flex-col justify-center items-center h-screen bg-slate-100 text-center p-4">
                <ShieldExclamationIcon className="h-16 w-16 text-slate-500" />
                <h1 className="mt-4 text-2xl font-bold text-slate-800">Conecte sua Carteira para Validar</h1>
                <p className="mt-2 text-slate-600">Um ingresso foi escaneado. Conecte sua carteira de validador para aprovar o check-in.</p>
                <div className="mt-6"><WalletMultiButton /></div>
            </div>
        );
    }
    
    // Se tem um ticket na URL e a carteira está conectada
    if (ticketToValidate && publicKey) {
        if (isLoading) return <div className="text-center py-20">Carregando dados do ingresso...</div>;
        if (!isValidator) return <div className="text-center py-20 text-red-500"><h1>Acesso Negado</h1><p>Sua carteira não é um validador autorizado.</p></div>;
        if (!ticketData) return <div className="text-center py-20 text-red-500"><h1>Erro</h1><p>Não foi possível carregar os dados do ingresso.</p></div>;

        const { profile, ticket } = ticketData;
        return (
            <div className="flex justify-center items-center h-screen bg-slate-100 p-4">
                <div className="w-full max-w-md bg-white p-8 rounded-lg shadow-xl text-center">
                    <TicketIcon className="mx-auto h-12 w-12 text-indigo-600"/>
                    <h2 className="mt-4 text-2xl font-bold">Confirmar Validação</h2>
                    <div className="mt-6 text-left space-y-2 bg-slate-50 p-4 rounded-md">
                        <p><strong className="text-slate-800">Nome:</strong> {profile.name}</p>
                        <p className="font-mono text-xs break-all"><strong className="text-slate-800 font-sans text-base">Ingresso:</strong> {ticket.nftMint}</p>
                        {ticket.redeemed ? (
                            <p className="font-bold text-red-500">Status: JÁ VALIDADO!</p>
                        ) : (
                            <p className="font-bold text-green-500">Status: PRONTO PARA VALIDAR</p>
                        )}
                    </div>
                    <div className="mt-6 flex flex-col gap-3">
                        <ActionButton onClick={handleRedeemTicket} disabled={ticket.redeemed}>Confirmar e Validar Entrada</ActionButton>
                        <a href={window.location.pathname} className="text-slate-600 hover:underline">Cancelar (Voltar ao Scanner)</a>
                    </div>
                </div>
            </div>
        )
    }

    // TELA INICIAL DO SCANNER (sem ticket na URL)
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 text-white p-4">
            <div className="text-center mb-8">
                <div className="inline-flex items-center gap-3 bg-green-500/20 text-green-300 py-2 px-6 rounded-full">
                    <ShieldCheckIcon className="h-6 w-6"/><span className="font-bold">Modo Validador Ativo</span>
                </div>
                <h1 className="mt-4 text-3xl font-bold">Aponte a câmera para o QR Code</h1>
                <p className="text-slate-400 mt-2">Use um navegador mobile como o Chrome.</p>
            </div>
            <div id="qr-reader" className="w-full max-w-sm bg-slate-800 p-2 rounded-lg shadow-lg"></div>
        </div>
    );
}
