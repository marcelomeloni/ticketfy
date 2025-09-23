import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import toast from 'react-hot-toast';

// Assumindo que estes caminhos estão corretos no seu projeto
import { supabase } from '@/lib/supabaseClient'; 
import { ActionButton } from '@/components/ui/ActionButton';
import { RegistrationModal } from '@/components/modals/RegistrationModal';
import { TicketSuccessModal } from '@/components/modals/TicketSuccessModal';
import { TierOption } from '@/components/event/TierOption';
import { TicketIcon } from '@heroicons/react/24/outline';

const API_URL = "https://gasless-api-ke68.onrender.com";

export const PurchaseCard = ({ metadata, eventAccount, eventAddress, onPurchaseSuccess }) => {
    const { publicKey } = useWallet();
    const [isMinting, setIsMinting] = useState(false);
    const [selectedTierIndex, setSelectedTierIndex] = useState(0);
    const [isRegistrationModalOpen, setIsRegistrationModalOpen] = useState(false);
    const [ticketResult, setTicketResult] = useState(null);

    const handleGetTicket = () => {
        setIsRegistrationModalOpen(true);
    };

    const handleRegistrationSubmit = async (formData) => {
        setIsMinting(true);
        const loadingToast = toast.loading("A processar o seu pedido...");

        try {
            // Distingue o fluxo com base na conexão da carteira
            if (publicKey) {
                await mintForConnectedWallet(formData, loadingToast);
            } else {
                await generateWalletAndMintForNewUser(formData, loadingToast);
            }

            // Lógica de sucesso unificada
            setIsRegistrationModalOpen(false);
            toast.success("Ingresso adquirido com sucesso!", { id: loadingToast });
            setTimeout(() => onPurchaseSuccess(), 2000);

        } catch (error) {
            console.error("Erro no fluxo de aquisição:", error);
            toast.error(`Erro: ${error.message}`, { id: loadingToast });
        } finally {
            setIsMinting(false);
        }
    };

    // Fluxo para utilizador com carteira já conectada
    const mintForConnectedWallet = async (formData, loadingToast) => {
        // Passo 1: Salvar/Atualizar no Supabase
        await supabase
            .from('user_profiles')
            .upsert({ wallet_address: publicKey.toString(), ...formData }, { onConflict: 'wallet_address' });
        
        toast.loading("Perfil salvo! A adquirir o seu ingresso...", { id: loadingToast });

        // Passo 2: Chamar o endpoint único que regista (se necessário) e faz o mint
        const response = await fetch(`${API_URL}/mint-for-existing-user`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                eventAddress,
                buyerAddress: publicKey.toString(),
                tierIndex: selectedTierIndex,
                ...formData, // Envia os dados caso o perfil precise ser criado on-chain
            }),
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.details || 'Falha ao resgatar o ingresso.');
        }

        setTicketResult({
            mintAddress: data.mintAddress,
            seedPhrase: null,
            eventName: metadata.name,
            eventDate: metadata.properties?.dateTime?.start,
            eventLocation: metadata.properties?.location?.venueName,
        });
    };

    // Fluxo para novo utilizador sem carteira
    const generateWalletAndMintForNewUser = async (formData, loadingToast) => {
        toast.loading("A criar a sua conta segura e ingresso...", { id: loadingToast });
        
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
            throw new Error(data.details || 'Ocorreu um erro ao criar a sua conta.');
        }

        // Salva no Supabase depois de a API retornar a nova carteira
        await supabase
            .from('user_profiles')
            .upsert({ wallet_address: data.publicKey, ...formData }, { onConflict: 'wallet_address' });

        setTicketResult({
            ...data,
            eventName: metadata.name,
            eventDate: metadata.properties?.dateTime?.start,
            eventLocation: metadata.properties?.location?.venueName,
        });
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
        return isFree ? "Obter Ingresso Grátis" : "Comprar Ingresso";
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

