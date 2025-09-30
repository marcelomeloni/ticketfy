import { useState } from 'react';
import { useConnection } from '@solana/wallet-adapter-react';
import { Transaction } from '@solana/web3.js';
import toast from 'react-hot-toast';
import { Buffer } from 'buffer';
import { Link } from 'react-router-dom';

import { useAppWallet } from '@/hooks/useAppWallet';
import { TierOption } from '@/components/event/TierOption';
import { ActionButton } from '@/components/ui/ActionButton';
import { RegistrationModal } from '@/components/modals/RegistrationModal';
import { TicketSuccessModal } from '@/components/modals/TicketSuccessModal';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { API_URL } from '@/lib/constants';

export const PurchaseCard = ({ metadata, eventAccount, eventAddress, onPurchaseSuccess }) => {
    const { connection } = useConnection();
    const wallet = useAppWallet();
    
    const [selectedTierIndex, setSelectedTierIndex] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isRegistrationModalOpen, setRegistrationModalOpen] = useState(false);
    const [isSuccessModalOpen, setSuccessModalOpen] = useState(false);
    const [ticketData, setTicketData] = useState(null);

    const handleSelectTier = (index) => {
        setSelectedTierIndex(index);
    };

    const handlePurchaseClick = () => {
        if (selectedTierIndex === null) {
            toast.error("Por favor, selecione um tipo de ingresso.");
            return;
        }
        setRegistrationModalOpen(true);
    };

    const handleRegistrationSubmit = async (formData) => {
        setIsLoading(true);
        setRegistrationModalOpen(false);
        const toastId = toast.loading('Processando sua aquisição...');

        try {
            const selectedTier = eventAccount.tiers[selectedTierIndex];
            const isPaidTier = Number(selectedTier.priceLamports) > 0;

            // CASO 1: Usuário está conectado
            if (wallet.connected && wallet.publicKey) {
                // ... (lógica de compra para usuário conectado)
                if (isPaidTier && wallet.walletType === 'local') {
                    toast.dismiss(toastId);
                    toast.error("Ingressos pagos não estão disponíveis para compra com login local. Por favor, conecte uma carteira externa.");
                    setIsLoading(false);
                    return;
                }

                const response = await fetch(`${API_URL}/mint-for-existing-user`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        eventAddress,
                        buyerAddress: wallet.publicKey.toString(),
                        tierIndex: selectedTierIndex,
                        ...formData,
                    }),
                });
                const data = await response.json();

                if (!response.ok || !data.success) {
                    throw new Error(data.details || 'Falha ao processar a solicitação.');
                }
                
                if (data.isPaid && wallet.walletType === 'adapter' && wallet.sendTransaction) {
                    toast.loading('Aguardando sua aprovação na carteira...', { id: toastId });
                    const buffer = Buffer.from(data.transaction, 'base64');
                    const transaction = Transaction.from(buffer);
                    const signature = await wallet.sendTransaction(transaction, connection);
                    await connection.confirmTransaction(signature, 'confirmed');
                }

                setTicketData({
                    mintAddress: data.mintAddress,
                    eventName: metadata.name,
                    eventDate: metadata.properties.dateTime.start,
                    eventLocation: metadata.properties.location,
                    eventImage: metadata.image,
                });

            } 
            // CASO 2: Usuário NÃO está conectado
            else {
                // ... (lógica de compra para novo usuário)
                if (isPaidTier) {
                    toast.dismiss(toastId);
                    toast.error("Para ingressos pagos, por favor, conecte sua carteira ou faça login primeiro.");
                    setIsLoading(false);
                    return;
                }

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

                if (!response.ok || !data.success) {
                    throw new Error(data.details || 'Falha ao criar carteira e ingresso.');
                }
                
                setTicketData({
                    mintAddress: data.mintAddress,
                    seedPhrase: data.seedPhrase,
                    privateKey: data.privateKey,
                    eventName: metadata.name,
                    eventDate: metadata.properties.dateTime.start,
                    eventLocation: metadata.properties.location,
                    eventImage: metadata.image,
                });
            }

            toast.success('Ingresso adquirido com sucesso!', { id: toastId });
            
            // ✅ PONTO CHAVE 1:
            // Esta função agora chama a `refetchEventDataInBackground` no componente pai.
            // Ela atualiza os dados do evento (ex: ingressos vendidos) SEM disparar a tela de loading.
            onPurchaseSuccess();
            
            // ✅ PONTO CHAVE 2:
            // Como o `onPurchaseSuccess` não remove mais este componente da tela,
            // esta linha agora funciona perfeitamente, abrindo o modal de sucesso.
            setSuccessModalOpen(true);

        } catch (error) {
            console.error("Erro no fluxo de aquisição:", error);
            toast.error(error.message || 'Ocorreu um erro desconhecido.', { id: toastId });
        } finally {
            setIsLoading(false);
        }
    };

    const isSoldOut = eventAccount.totalTicketsSold >= eventAccount.maxTotalSupply;

    return (
        <>
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <h2 className="text-2xl font-bold text-slate-900">Ingressos</h2>
                <div className="mt-6 space-y-4">
                    {eventAccount.tiers.map((tier, index) => (
                        <TierOption
                            key={index} 
                            tier={tier} 
                            isSelected={selectedTierIndex === index}
                            isSoldOut={tier.ticketsSold >= tier.maxTicketsSupply}
                            onSelect={() => handleSelectTier(index)}
                        />
                    ))}
                </div>
                <div className="mt-8">
                    <ActionButton
                        onClick={handlePurchaseClick}
                        loading={isLoading}
                        disabled={isSoldOut || selectedTierIndex === null}
                    >
                        {isSoldOut ? "Esgotado" : "Pegar Ingresso"}
                    </ActionButton>

                    {!wallet.connected && selectedTierIndex !== null && Number(eventAccount.tiers[selectedTierIndex].priceLamports) > 0 &&
                        <div className="mt-4">
                            <p className="text-center text-sm text-slate-600 mb-2">Para ingressos pagos, escolha uma opção:</p>
                            <div className="flex items-center gap-3">
                                <Link to="/login" className="flex-1 text-center bg-slate-200 text-slate-800 font-semibold py-3 rounded-lg hover:bg-slate-300 transition-colors">Entrar</Link>
                                <WalletMultiButton style={{ flex: '1' }} />
                            </div>
                        </div>
                    }
                </div>
            </div>

            <RegistrationModal
                isOpen={isRegistrationModalOpen}
                onClose={() => setRegistrationModalOpen(false)}
                onSubmit={handleRegistrationSubmit}
                isLoading={isLoading}
            />

            <TicketSuccessModal
                isOpen={isSuccessModalOpen}
                onClose={() => setSuccessModalOpen(false)}
                ticketData={ticketData}
            />
        </>
    );
};