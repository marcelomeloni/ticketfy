// src/components/event/PurchaseCard.jsx

import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import toast from 'react-hot-toast';

import { ActionButton } from '@/components/ui/ActionButton';
import { RegistrationModal } from '@/components/modals/RegistrationModal';
import { TicketSuccessModal } from '@/components/modals/TicketSuccessModal';
import { TierOption } from './TierOption';
import { TicketIcon } from '@heroicons/react/24/outline';

// ✅ URL da sua API
const API_URL = "https://gasless-api-ke68.onrender.com";

export const PurchaseCard = ({ eventAccount, eventAddress, onPurchaseSuccess }) => {
    const { publicKey } = useWallet();
    const [isMinting, setIsMinting] = useState(false);
    const [selectedTierIndex, setSelectedTierIndex] = useState(0);
    const [isRegistered, setIsRegistered] = useState(false); // No futuro, isso pode vir da API
    const [isRegistrationModalOpen, setIsRegistrationModalOpen] = useState(false);
    const [ticketResult, setTicketResult] = useState(null);

    // Lógica para verificar se o usuário já está registrado (pode ser implementada no futuro)
    useEffect(() => {
        setIsRegistered(false);
    }, [publicKey]);

    const handleGetTicket = () => {
        if (publicKey && isRegistered) {
            // Se já tem carteira e cadastro, poderia ir direto para um fluxo de mint
            // Por enquanto, sempre abrimos o modal de cadastro
            setIsRegistrationModalOpen(true);
        } else {
            setIsRegistrationModalOpen(true);
        }
    };

    const handleRegistrationSubmit = async (formData) => {
        if (publicKey) {
            await registerAndMintForConnectedWallet(formData);
        } else {
            await generateWalletAndMintForNewUser(formData);
        }
    };

    // ✅ FLUXO ATUALIZADO PARA USUÁRIO WEB3
    const registerAndMintForConnectedWallet = async (formData) => {
        setIsMinting(true);
        const loadingToast = toast.loading("Cadastrando seu perfil...");
        
        try {
            // Etapa 1: Cadastrar o perfil do usuário (se necessário)
            const registerResponse = await fetch(`${API_URL}/register-user`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    authority: publicKey.toString(),
                    ...formData,
                }),
            });
            const registerData = await registerResponse.json();
            if (!registerResponse.ok) throw new Error(registerData.details || 'Falha ao cadastrar perfil.');
            
            toast.loading("Perfil cadastrado! Finalizando a aquisição do ingresso...", { id: loadingToast });
    
            // Etapa 2: Chamar o novo endpoint que cria o contador e minta o ingresso
            const mintResponse = await fetch(`${API_URL}/mint-for-existing-user`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    eventAddress,
                    buyerAddress: publicKey.toString(),
                    tierIndex: selectedTierIndex,
                }),
            });
            const mintData = await mintResponse.json();
            if (!mintResponse.ok) throw new Error(mintData.details || 'Falha ao resgatar o ingresso.');
    
            // Etapa 3: Mostrar sucesso
            setTicketResult({ mintAddress: mintData.mintAddress });
            setIsRegistrationModalOpen(false);
            toast.success("Ingresso resgatado com sucesso!", { id: loadingToast });
            setTimeout(() => onPurchaseSuccess(), 2000);
    
        } catch (error) {
            console.error("Erro no fluxo Web3:", error);
            toast.error(`Erro: ${error.message}`, { id: loadingToast });
        } finally {
            setIsMinting(false);
        }
    };

    // ✅ FLUXO ATUALIZADO PARA USUÁRIO WEB2
    const generateWalletAndMintForNewUser = async (formData) => {
        setIsMinting(true);
        const loadingToast = toast.loading("Criando sua conta segura e ingresso...");
        try {
            // Chama o endpoint único que faz tudo: cria carteira, registra e minta
            const response = await fetch(`${API_URL}/generate-wallet-and-mint`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    eventAddress,
                    tierIndex: selectedTierIndex,
                    ...formData,
                }),
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.details || 'Ocorreu um erro ao criar sua conta.');
            }
            
            setTicketResult(data);
            setIsRegistrationModalOpen(false);
            toast.success("Ingresso e carteira criados com sucesso!", { id: loadingToast });
            setTimeout(() => onPurchaseSuccess(), 2000);

        } catch (error) {
            console.error("Erro no fluxo Web2:", error);
            toast.error(`Erro: ${error.message}`, { id: loadingToast });
        } finally {
            setIsMinting(false);
        }
    };

    const selectedTier = eventAccount.tiers[selectedTierIndex];
    if (!selectedTier) return null;
    
    const isFree = selectedTier.priceLamports.toNumber() === 0;
    const now = Math.floor(Date.now() / 1000);
    const salesHaveEnded = now > eventAccount.salesEndDate.toNumber();
    const salesHaveNotStarted = now < eventAccount.salesStartDate.toNumber();
    const isSoldOut = selectedTier.ticketsSold >= selectedTier.maxTicketsSupply;
    const isButtonDisabled = isMinting || salesHaveEnded || salesHaveNotStarted || eventAccount.canceled || isSoldOut;

    const getButtonText = () => {
        if (eventAccount.canceled) return "Evento Cancelado";
        if (salesHaveNotStarted) return "Vendas em Breve";
        if (salesHaveEnded) return "Vendas Encerradas";
        if (isSoldOut) return "Esgotado";
        if (!publicKey) return "Pegar Ingresso Grátis Direto";
        if (publicKey && !isRegistered) return "Cadastre-se para Pegar o Ingresso";
        return isFree ? "Pegar Ingresso Grátis" : "Comprar Ingresso";
    };

    return (
        <>
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                 <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center"><TicketIcon className="w-6 h-6 mr-2 text-indigo-500" /> Ingressos</h2>
                 <div className="space-y-3 mb-6">
                     {eventAccount.tiers.map((tier, index) => (
                         <TierOption 
                             key={index} tier={tier} isSelected={selectedTierIndex === index}
                             isSoldOut={tier.ticketsSold >= tier.maxTicketsSupply}
                             onSelect={() => !(tier.ticketsSold >= tier.maxTicketsSupply) && setSelectedTierIndex(index)}
                         />
                     ))}
                 </div>
                 <ActionButton 
                     onClick={handleGetTicket} loading={isMinting} disabled={isButtonDisabled}
                     className={`w-full ${isFree && !isButtonDisabled && 'bg-green-600 hover:bg-green-700'}`}
                 >
                     {getButtonText()}
                 </ActionButton>
            </div>

            <RegistrationModal
                isOpen={isRegistrationModalOpen}
                onClose={() => setIsRegistrationModalOpen(false)}
                onSubmit={handleRegistrationSubmit}
                isLoading={isMinting}
            />

            <TicketSuccessModal
                isOpen={!!ticketResult}
                onClose={() => setTicketResult(null)}
                ticketData={ticketResult}
            />
        </>
    );
};