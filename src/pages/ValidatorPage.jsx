// src/pages/ValidatorPage.jsx

import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useConnection, useAnchorWallet, useWallet } from '@solana/wallet-adapter-react';
import { Program, AnchorProvider, web3 } from '@coral-xyz/anchor';
import { getAssociatedTokenAddress } from '@solana/spl-token';
import toast from 'react-hot-toast';
import { Html5QrcodeScanner } from 'html5-qrcode';
import idl from '@/idl/ticketing_system.json';
import { ActionButton } from '@/components/ui/ActionButton';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { QrCodeIcon, ShieldCheckIcon, ShieldExclamationIcon, TicketIcon } from '@heroicons/react/24/outline';

const PROGRAM_ID = new web3.PublicKey("AHRuW77r9tM8RAX7qbhVyjktgSZueb6QVjDjWXjEoCeA"); // Use seu Program ID
const API_URL = "https://gasless-api-ke68.onrender.com";

export function ValidatorPage() {
    const { eventAddress } = useParams();
    const { connection } = useConnection();
    const { publicKey, wallet } = useWallet();
    const anchorWallet = useAnchorWallet();

    const [eventAccount, setEventAccount] = useState(null);
    const [isValidator, setIsValidator] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [scannedMint, setScannedMint] = useState(null);
    const [scannedTicketData, setScannedTicketData] = useState(null);

    const program = useMemo(() => {
        const provider = new AnchorProvider(connection, anchorWallet || {}, AnchorProvider.defaultOptions());
        return new Program(idl, PROGRAM_ID, provider);
    }, [connection, anchorWallet]);

    // Efeito para buscar dados do evento e verificar permissão do validador
    useEffect(() => {
        const checkValidatorStatus = async () => {
            if (!publicKey || !program) {
                setIsValidator(false);
                setIsLoading(false);
                return;
            }
            try {
                const event = await program.account.event.fetch(new web3.PublicKey(eventAddress));
                setEventAccount(event);
                const validatorPubkeys = event.validators.map(v => v.toString());
                if (validatorPubkeys.includes(publicKey.toString())) {
                    setIsValidator(true);
                } else {
                    setIsValidator(false);
                }
            } catch (error) {
                console.error("Erro ao verificar status do validador:", error);
                setIsValidator(false);
            } finally {
                setIsLoading(false);
            }
        };
        checkValidatorStatus();
    }, [publicKey, program, eventAddress]);
    
    // Efeito para configurar o scanner de QR Code
    useEffect(() => {
        if (!isValidator) return;

        const scanner = new Html5QrcodeScanner(
            'qr-reader', 
            { fps: 10, qrbox: 250 }, 
            false
        );

        const onScanSuccess = (decodedText, decodedResult) => {
            scanner.clear();
            setScannedMint(decodedText);
        };

        scanner.render(onScanSuccess, console.error);

        return () => {
            if (scanner && scanner.getState()) {
                scanner.clear().catch(console.error);
            }
        };
    }, [isValidator]);

    // Efeito para buscar dados do ingresso escaneado
    useEffect(() => {
        const fetchTicketData = async () => {
            if (!scannedMint) return;
            try {
                const response = await fetch(`${API_URL}/ticket-data/${scannedMint}`);
                if (!response.ok) throw new Error("Ingresso não encontrado.");
                const data = await response.json();
                setScannedTicketData(data);
            } catch (error) {
                toast.error(error.message);
                setScannedMint(null); // Limpa para permitir novo scan
            }
        };
        fetchTicketData();
    }, [scannedMint]);
    
    // Função para chamar a instrução `redeemTicket`
    const handleRedeemTicket = async () => {
        if (!program || !scannedTicketData || !publicKey) return;

        const loadingToast = toast.loading("Validando ingresso na blockchain...");
        try {
            const owner = new web3.PublicKey(scannedTicketData.owner);
            const nftMint = new web3.PublicKey(scannedTicketData.ticket.nftMint);
            
            const [ticketPda] = web3.PublicKey.findProgramAddressSync(
                [Buffer.from("ticket"), new web3.PublicKey(eventAddress).toBuffer(), nftMint.toBuffer()],
                program.programId
            );
            const nftTokenAccount = await getAssociatedTokenAddress(nftMint, owner);

            const signature = await program.methods
                .redeemTicket()
                .accounts({
                    ticket: ticketPda,
                    event: new web3.PublicKey(eventAddress),
                    validator: publicKey,
                    owner: owner,
                    nftToken: nftTokenAccount,
                    nftMint: nftMint,
                })
                .rpc();

            toast.success(`Ingresso validado! Tx: ${signature.substring(0, 10)}...`, { id: loadingToast, duration: 5000 });
            setScannedMint(null);
            setScannedTicketData(null);

        } catch (error) {
            console.error("Erro ao validar ingresso:", error);
            const errorMsg = error.error?.errorMessage || error.message || "Erro desconhecido.";
            toast.error(`Falha na validação: ${errorMsg}`, { id: loadingToast });
        }
    };


    if (!publicKey) {
        return (
            <div className="flex flex-col justify-center items-center h-screen bg-slate-100 text-center">
                <ShieldExclamationIcon className="h-16 w-16 text-slate-500" />
                <h1 className="mt-4 text-2xl font-bold text-slate-800">Área do Validador</h1>
                <p className="mt-2 text-slate-600">Por favor, conecte sua carteira para continuar.</p>
                <div className="mt-6">
                    <WalletMultiButton />
                </div>
            </div>
        );
    }

    if (isLoading) return <div className="text-center py-20">Verificando permissões...</div>;
    
    if (!isValidator) {
        return <div className="text-center py-20 text-red-500"><h1>Acesso Negado</h1><p>A carteira conectada não tem permissão para validar ingressos para este evento.</p></div>;
    }

    if (scannedTicketData) {
        const { profile, ticket } = scannedTicketData;
        return (
            <div className="flex justify-center items-center h-screen bg-slate-100 p-4">
                <div className="w-full max-w-md bg-white p-8 rounded-lg shadow-xl text-center">
                    <TicketIcon className="mx-auto h-12 w-12 text-indigo-600"/>
                    <h2 className="mt-4 text-2xl font-bold">Confirmar Validação</h2>
                    <div className="mt-6 text-left space-y-2 bg-slate-50 p-4 rounded-md">
                        <p><strong className="text-slate-800">Nome:</strong> {profile.name}</p>
                        <p><strong className="text-slate-800">Celular:</strong> {profile.phone}</p>
                        <p><strong className="text-slate-800">Ingresso:</strong> {ticket.nftMint.substring(0,10)}...</p>
                        {ticket.redeemed ? (
                            <p className="font-bold text-red-500">Status: JÁ VALIDADO!</p>
                        ) : (
                            <p className="font-bold text-green-500">Status: PRONTO PARA VALIDAR</p>
                        )}
                    </div>
                    <div className="mt-6 flex flex-col gap-3">
                        <ActionButton onClick={handleRedeemTicket} disabled={ticket.redeemed}>
                            Confirmar e Validar Entrada
                        </ActionButton>
                        <button onClick={() => { setScannedTicketData(null); setScannedMint(null); }} className="text-slate-600 hover:underline">
                            Cancelar (Escanear outro)
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 text-white p-4">
            <div className="text-center mb-8">
                <div className="inline-flex items-center gap-3 bg-green-500/20 text-green-300 py-2 px-6 rounded-full">
                    <ShieldCheckIcon className="h-6 w-6"/>
                    <span className="font-bold">Modo Validador Ativo</span>
                </div>
                <h1 className="mt-4 text-3xl font-bold">Aponte a câmera para o QR Code</h1>
            </div>
            <div id="qr-reader" className="w-full max-w-sm bg-slate-800 p-4 rounded-lg shadow-lg"></div>
        </div>
    );
}