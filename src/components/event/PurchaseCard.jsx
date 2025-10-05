import { useState } from 'react';
import { useConnection } from '@solana/wallet-adapter-react';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';

import { useAppWallet } from '@/hooks/useAppWallet';
import { TierOption } from '@/components/event/TierOption';
import { ActionButton } from '@/components/ui/ActionButton';
import { RegistrationModal } from '@/components/modals/RegistrationModal';
import { PaymentModal } from '@/components/modals/PaymentModal';
import { TicketSuccessModal } from '@/components/modals/TicketSuccessModal';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { API_URL } from '@/lib/constants';

export const PurchaseCard = ({ metadata, eventAccount, eventAddress, onPurchaseSuccess }) => {
    const { connection } = useConnection();
    const wallet = useAppWallet();
    
    const [selectedTierIndex, setSelectedTierIndex] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isRegistrationModalOpen, setRegistrationModalOpen] = useState(false);
    const [isPaymentModalOpen, setPaymentModalOpen] = useState(false);
    const [isSuccessModalOpen, setSuccessModalOpen] = useState(false);
    const [ticketData, setTicketData] = useState(null);
    const [pendingFormData, setPendingFormData] = useState(null);

    const selectedTier = selectedTierIndex !== null ? eventAccount.tiers[selectedTierIndex] : null;
    
    // O Anchor serializa BN como string hexadecimal. Convertemos para decimal.
    const hexPriceString = selectedTier?.priceBrlCents || '0';
    const priceInCents = parseInt(hexPriceString, 16) || 0;
    
    // O ingresso é pago se o preço decimal for maior que zero.
    const isPaidTier = priceInCents > 0;
    
    // Calcula o preço em Reais (BRL)
    const tierPriceInReais = (priceInCents / 100).toFixed(2);
    
    // Calcula o fornecimento total somando todos os tiers
    const maxTotalSupply = eventAccount.tiers.reduce((total, tier) => total + Number(tier.maxTicketsSupply), 0);

    const handleSelectTier = (index) => {
        setSelectedTierIndex(index);
    };

    const handlePurchaseClick = () => {
        if (selectedTierIndex === null) {
            toast.error("Por favor, selecione um tipo de ingresso.");
            return;
        }

        // Se o preço for zero, mas o organizador espera que seja pago, é um erro de configuração
        if (isPaidTier && priceInCents === 0) {
            toast.error("Erro: Preço inválido (R$ 0,00). Verifique a configuração do evento.");
            return;
        }
        
        // Abre o modal de registro para todos os usuários, independentemente do tipo de carteira.
        setRegistrationModalOpen(true);
    };

    const handleRegistrationSubmit = async (formData) => {
        setPendingFormData(formData);
        setRegistrationModalOpen(false);

        if (isPaidTier) {
            // Para ingressos pagos, abre o modal de pagamento PIX.
            setPaymentModalOpen(true);
        } else {
            // Para ingressos gratuitos, processa diretamente.
            await processTicketPurchase(formData);
        }
    };

    const handlePaymentSuccess = async () => {
        setPaymentModalOpen(false);
        // Após o sucesso do PIX, processa a compra com os dados do formulário salvos.
        await processTicketPurchase(pendingFormData, true);
    };

    const processTicketPurchase = async (formData, isPaid = false) => {
        setIsLoading(true);
        const toastId = toast.loading('Processando sua aquisição...');

        try {
            let response;
            let data;
            
            const priceBRLCents = isPaid ? priceInCents : 0;

            // CASO 1: Usuário está conectado com carteira (local OU externa).
            // A API vai lidar com a lógica de "usuário existente" para ambos os casos.
            if (wallet.connected && wallet.publicKey) {
                response = await fetch(`${API_URL}/api/tickets/mint-for-existing-user`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        eventAddress,
                        buyerAddress: wallet.publicKey.toString(),
                        tierIndex: selectedTierIndex,
                        priceBRLCents: priceBRLCents,
                        ...formData,
                    }),
                });
            } 
            // CASO 2: Usuário NÃO está conectado (comprando como convidado/novo usuário).
            else {
                const endpoint = isPaid ? '/api/tickets/generate-wallet-and-mint-paid' : '/api/tickets/generate-wallet-and-mint';
                response = await fetch(`${API_URL}${endpoint}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        eventAddress,
                        tierIndex: selectedTierIndex,
                        priceBRLCents: priceBRLCents,
                        paymentMethod: isPaid ? 'pix' : undefined,
                        ...formData,
                    }),
                });
            }

            data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.details || 'Falha ao processar a solicitação.');
            }

            // Prepara dados para o modal de sucesso
            setTicketData({
                mintAddress: data.mintAddress,
                seedPhrase: data.seedPhrase,
                privateKey: data.privateKey,
                eventName: metadata.name,
                eventDate: metadata.properties.dateTime.start,
                eventLocation: metadata.properties.location,
                eventImage: metadata.image,
                isNewUser: !wallet.connected, // Se não estava conectado, é um novo usuário
                registrationId: data.registrationId,
            });

            toast.success('Ingresso adquirido com sucesso!', { id: toastId });
            onPurchaseSuccess();
            setSuccessModalOpen(true);

        } catch (error) {
            console.error("Erro no fluxo de aquisição:", error);
            toast.error(error.message || 'Ocorreu um erro desconhecido.', { id: toastId });
        } finally {
            setIsLoading(false);
        }
    };

    const isSoldOut = eventAccount.totalTicketsSold >= maxTotalSupply;
    const hasAvailableTickets = selectedTier ? 
        selectedTier.ticketsSold < selectedTier.maxTicketsSupply : true;

    return (
        <>
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                    <h2 className="text-2xl font-bold text-slate-900">Ingressos</h2>
                    <span className="text-sm text-slate-600 bg-slate-100 px-3 py-1 rounded-full">
                        {eventAccount.totalTicketsSold} / {maxTotalSupply} vendidos
                    </span>
                </div>
                
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
                        disabled={isSoldOut || selectedTierIndex === null || !hasAvailableTickets}
                        className="w-full"
                    >
                        {isSoldOut ? "Ingressos Esgotados" : 
                            !hasAvailableTickets ? "Lote Esgotado" : 
                            isPaidTier ? "Comprar Ingresso" : "Pegar Ingresso Grátis"}
                    </ActionButton>

                    {/* LÓGICA DE AVISOS SIMPLIFICADA */}
                    {selectedTierIndex !== null && isPaidTier && (
                        <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
                            <p className="text-blue-800 text-sm text-center">
                                💳 <strong>Pagamento via PIX</strong> - R$ {tierPriceInReais}
                            </p>
                        </div>
                    )}

                    {selectedTierIndex !== null && !isPaidTier && (
                        <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4">
                            <p className="text-green-800 text-sm text-center">
                                ✅ <strong>Ingresso Gratuito</strong> - Preencha seus dados para receber
                            </p>
                        </div>
                    )}
                </div>

                {/* Informações adicionais */}
                <div className="mt-6 pt-6 border-t border-slate-200">
                    <div className="grid grid-cols-2 gap-4 text-sm text-slate-600">
                        <div className="text-center">
                            <div className="font-semibold">🎫 Ticket NFT</div>
                            <div className="text-xs">Colecionável digital</div>
                        </div>
                        <div className="text-center">
                            <div className="font-semibold">📧 Envio por E-mail</div>
                            <div className="text-xs">Dados da carteira</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modais */}
            <RegistrationModal
                isOpen={isRegistrationModalOpen}
                onClose={() => setRegistrationModalOpen(false)}
                onSubmit={handleRegistrationSubmit}
                isLoading={isLoading}
                tierName={selectedTier?.name}
                isPaid={isPaidTier}
                price={tierPriceInReais}
            />

            <PaymentModal
                isOpen={isPaymentModalOpen}
                onClose={() => {
                    setPaymentModalOpen(false);
                    toast('Compra cancelada. Você pode tentar novamente quando quiser.');
                }}
                onPaymentSuccess={handlePaymentSuccess}
                tierPrice={parseFloat(tierPriceInReais)}
                eventName={metadata.name}
                tierName={selectedTier?.name || 'Ingresso'}
                // Passando dados do formulário para o modal de pagamento
                formData={pendingFormData}
                eventAddress={eventAddress}
                tierIndex={selectedTierIndex}
            />

            <TicketSuccessModal
                isOpen={isSuccessModalOpen}
                onClose={() => setSuccessModalOpen(false)}
                ticketData={ticketData}
            />
        </>
    );
};
