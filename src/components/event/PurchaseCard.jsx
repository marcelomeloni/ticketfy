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
    const isPaidTier = selectedTier ? Number(selectedTier.priceLamports) > 0 : false;
    
    // Converter lamports para Reais (1 SOL = R$ 100 como exemplo)
    const tierPriceInReais = selectedTier ? (Number(selectedTier.priceLamports) * 0.000000001 * 100).toFixed(2) : 0;

    const handleSelectTier = (index) => {
        setSelectedTierIndex(index);
    };

    const handlePurchaseClick = () => {
        if (selectedTierIndex === null) {
            toast.error("Por favor, selecione um tipo de ingresso.");
            return;
        }

        // Verifica se precisa de carteira externa para ingressos pagos
        if (isPaidTier && !wallet.connected) {
            toast.error("Para ingressos pagos, conecte sua carteira primeiro.");
            return;
        }

        // Verifica se usuário com carteira local está tentando comprar ingresso pago
        if (isPaidTier && wallet.connected && wallet.walletType === 'local') {
            toast.error("Ingressos pagos requerem carteira externa (Phantom, etc.).");
            return;
        }

        setRegistrationModalOpen(true);
    };

    const handleRegistrationSubmit = async (formData) => {
        setPendingFormData(formData);
        setRegistrationModalOpen(false);

        if (isPaidTier) {
            // Para ingressos pagos, abre modal de pagamento
            setPaymentModalOpen(true);
        } else {
            // Para ingressos gratuitos, processa diretamente
            await processTicketPurchase(formData);
        }
    };

    const handlePaymentSuccess = async () => {
        setPaymentModalOpen(false);
        await processTicketPurchase(pendingFormData, true);
    };

    const handleCryptoPayment = () => {
        toast.success('Pagamento com criptomoedas estará disponível em breve!');
        // Aqui você pode implementar a lógica para pagamento com cripto no futuro
    };

    const processTicketPurchase = async (formData, isPaid = false) => {
        setIsLoading(true);
        const toastId = toast.loading(isPaid ? 'Confirmando pagamento...' : 'Processando sua aquisição...');

        try {
            let response;
            let data;

            // CASO 1: Usuário está conectado com carteira externa
            if (wallet.connected && wallet.publicKey) {
                response = await fetch(`${API_URL}/mint-for-existing-user`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        eventAddress,
                        buyerAddress: wallet.publicKey.toString(),
                        tierIndex: selectedTierIndex,
                        ...formData,
                    }),
                });
                data = await response.json();

                if (!response.ok || !data.success) {
                    throw new Error(data.details || 'Falha ao processar a solicitação.');
                }
                
                // Se for pago e usuário com carteira externa, processa transação
                if (isPaid && wallet.walletType === 'adapter' && wallet.sendTransaction) {
                    toast.loading('Aguardando sua aprovação na carteira...', { id: toastId });
                    const buffer = Buffer.from(data.transaction, 'base64');
                    const transaction = Transaction.from(buffer);
                    const signature = await wallet.sendTransaction(transaction, connection);
                    await connection.confirmTransaction(signature, 'confirmed');
                }

            } 
            // CASO 2: Usuário NÃO está conectado (novo usuário)
            else {
                if (isPaid) {
                    // Para novos usuários com ingresso pago (após PIX)
                    response = await fetch(`${API_URL}/generate-wallet-and-mint-paid`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            eventAddress,
                            tierIndex: selectedTierIndex,
                            ...formData,
                            paymentMethod: 'pix', // Indicar que foi pago via PIX
                        }),
                    });
                } else {
                    // Para novos usuários com ingresso gratuito
                    response = await fetch(`${API_URL}/generate-wallet-and-mint`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            eventAddress,
                            tierIndex: selectedTierIndex,
                            ...formData,
                        }),
                    });
                }

                data = await response.json();

                if (!response.ok || !data.success) {
                    throw new Error(data.details || 'Falha ao criar carteira e ingresso.');
                }
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
                isNewUser: !wallet.connected, // Indica se é um novo usuário
            });

            toast.success('Ingresso adquirido com sucesso!', { id: toastId });
            
            // Atualiza os dados do evento
            onPurchaseSuccess();
            
            // Abre modal de sucesso
            setSuccessModalOpen(true);

        } catch (error) {
            console.error("Erro no fluxo de aquisição:", error);
            toast.error(error.message || 'Ocorreu um erro desconhecido.', { id: toastId });
        } finally {
            setIsLoading(false);
        }
    };

    const isSoldOut = eventAccount.totalTicketsSold >= eventAccount.maxTotalSupply;
    const hasAvailableTickets = selectedTier ? 
        selectedTier.ticketsSold < selectedTier.maxTicketsSupply : true;

    return (
        <>
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                    <h2 className="text-2xl font-bold text-slate-900">Ingressos</h2>
                    <span className="text-sm text-slate-600 bg-slate-100 px-3 py-1 rounded-full">
                        {eventAccount.totalTicketsSold} / {eventAccount.maxTotalSupply} vendidos
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

                    {/* Avisos para ingressos pagos */}
                    {selectedTierIndex !== null && isPaidTier && (
                        <div className="mt-4 space-y-3">
                            {!wallet.connected && (
                                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                                    <p className="text-amber-800 text-sm text-center font-medium">
                                        Para ingressos pagos, conecte sua carteira:
                                    </p>
                                    <div className="flex items-center gap-3 mt-3">
                                        <Link 
                                            to="/login" 
                                            className="flex-1 text-center bg-amber-100 text-amber-800 font-semibold py-3 rounded-lg hover:bg-amber-200 transition-colors"
                                        >
                                            Fazer Login
                                        </Link>
                                        <WalletMultiButton 
                                            style={{ 
                                                flex: '1',
                                                backgroundColor: '#f59e0b',
                                                color: 'white',
                                                borderRadius: '0.5rem',
                                                padding: '0.75rem',
                                                justifyContent: 'center'
                                            }} 
                                        />
                                    </div>
                                </div>
                            )}
                            
                            {wallet.connected && wallet.walletType === 'local' && (
                                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                                    <p className="text-red-800 text-sm text-center">
                                        ❌ Ingresos pagos não estão disponíveis para carteira local. 
                                        Conecte uma carteira externa como Phantom ou Solflare.
                                    </p>
                                </div>
                            )}

                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                <p className="text-blue-800 text-sm text-center">
                                    💳 <strong>Pagamento via PIX</strong> - R$ {tierPriceInReais}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Aviso para ingressos gratuitos */}
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

            {/* Modal de Cadastro */}
            <RegistrationModal
                isOpen={isRegistrationModalOpen}
                onClose={() => setRegistrationModalOpen(false)}
                onSubmit={handleRegistrationSubmit}
                isLoading={isLoading}
                tierName={selectedTier?.name}
                isPaid={isPaidTier}
                price={tierPriceInReais}
            />

            {/* Modal de Pagamento PIX */}
            <PaymentModal
                isOpen={isPaymentModalOpen}
                onClose={() => {
                    setPaymentModalOpen(false);
                    toast.info('Compra cancelada. Você pode tentar novamente quando quiser.');
                }}
                onPaymentSuccess={handlePaymentSuccess}
                onCryptoPayment={handleCryptoPayment}
                tierPrice={parseFloat(tierPriceInReais)}
                eventName={metadata.name}
                tierName={selectedTier?.name || 'Ingresso'}
            />

            {/* Modal de Sucesso */}
            <TicketSuccessModal
                isOpen={isSuccessModalOpen}
                onClose={() => setSuccessModalOpen(false)}
                ticketData={ticketData}
            />
        </>
    );
};