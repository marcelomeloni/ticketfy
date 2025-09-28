// src/components/event/PurchaseCard.jsx

import { useState } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { Transaction } from '@solana/web3.js';
import toast from 'react-hot-toast';

import { TierOption } from '@/components/event/TierOption';
import { ActionButton } from '@/components/ui/ActionButton';
import { RegistrationModal } from '@/components/modals/RegistrationModal';
import { TicketSuccessModal } from '@/components/modals/TicketSuccessModal';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

import {  API_URL } from '@/lib/constants';
export const PurchaseCard = ({ metadata, eventAccount, eventAddress, onPurchaseSuccess }) => {
    const { connection } = useConnection();
    const { publicKey, sendTransaction } = useWallet();
    
    const [selectedTierIndex, setSelectedTierIndex] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isRegistrationModalOpen, setRegistrationModalOpen] = useState(false);
    const [isSuccessModalOpen, setSuccessModalOpen] = useState(false);
    const [ticketData, setTicketData] = useState(null);

    const handleSelectTier = (index) => {
        // Apenas permite a seleção de ingressos gratuitos se a carteira não estiver conectada
        if (!publicKey) {
            const selectedTier = eventAccount.tiers[index];
            if (selectedTier.priceLamports.toNumber() > 0) {
                toast.error("Conecte sua carteira para comprar um ingresso pago.");
                return;
            }
        }
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
            let response;
            let data;

           
            if (publicKey) {
                // --- FLUXO 1: USUÁRIO WEB3 (CARTEIRA CONECTADA) ---
                console.log('Iniciando fluxo para usuário com carteira...');
                response = await fetch(`${API_URL}/mint-for-existing-user`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        eventAddress,
                        buyerAddress: publicKey.toString(),
                        tierIndex: selectedTierIndex,
                        ...formData,
                    }),
                });
                data = await response.json();

                if (!response.ok || !data.success) {
                    throw new Error(data.details || 'Falha ao processar a solicitação.');
                }
                
                if (data.isPaid) {
                    // Lógica para ingresso pago 
                    toast.loading('Aguardando sua aprovação na carteira...', { id: toastId });
                    const buffer = Buffer.from(data.transaction, 'base64');
                    const transaction = Transaction.from(buffer);
                    const signature = await sendTransaction(transaction, connection);
                    await connection.confirmTransaction(signature, 'confirmed');
                }

                 setTicketData({
                    mintAddress: data.mintAddress,
                    eventName: metadata.name,
                    eventDate: metadata.properties.dateTime.start,
                    eventLocation: metadata.properties.location.venueName || 'Online'
                    // Nenhuma seedPhrase aqui, pois o usuário já tem sua carteira
                });

            } else {
                // --- FLUXO 2: USUÁRIO WEB2 (SEM CARTEIRA CONECTADA) ---
                console.log('Iniciando fluxo de onboarding para usuário sem carteira...');
                response = await fetch(`${API_URL}/generate-wallet-and-mint`, {
                     method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        eventAddress,
                        tierIndex: selectedTierIndex,
                        ...formData,
                    }),
                });
                data = await response.json();

                if (!response.ok || !data.success) {
                    throw new Error(data.details || 'Falha ao criar carteira e ingresso.');
                }
                
                // O backend já fez tudo, pegamos os dados, incluindo a seed phrase
                setTicketData({
                    mintAddress: data.mintAddress,
                    seedPhrase: data.seedPhrase, // A chave secreta para o novo usuário
                    eventName: metadata.name,
                    eventDate: metadata.properties.dateTime.start,
                    eventLocation: metadata.properties.location.venueName || 'Online'
                });
            }

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

    const isSoldOut = eventAccount.totalTicketsSold >= eventAccount.maxTotalSupply;

    return (
        <>
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <h2 className="text-2xl font-bold text-slate-900">Ingressos</h2>
                <div className="mt-6 space-y-4">
                    {eventAccount.tiers.map((tier, index) => (
                        <TierOption
                            key={index} tier={tier} isSelected={selectedTierIndex === index}
                            isSoldOut={tier.ticketsSold >= tier.max_tickets_supply}
                            onSelect={() => handleSelectTier(index)}
                        />
                    ))}
                </div>
                <div className="mt-8">
                     {/* BOTÃO SEMPRE APARECE, A LÓGICA DECIDE O QUE FAZER */}
                    <ActionButton
                        onClick={handlePurchaseClick}
                        loading={isLoading}
                        disabled={isSoldOut || selectedTierIndex === null}
                    >
                        {isSoldOut ? "Esgotado" : "Pegar Ingresso"}
                    </ActionButton>

                    {/* Mensagem para conectar a carteira se nenhum ingresso gratuito for selecionado */}
                    {!publicKey && selectedTierIndex !== null && eventAccount.tiers[selectedTierIndex].priceLamports.toNumber() > 0 &&
                        <div className="mt-4">
                             <p className="text-center text-sm text-slate-600 mb-2">Para ingressos pagos, conecte sua carteira:</p>
                             <WalletMultiButton style={{ width: '100%', backgroundColor: '#4f46e5', display: 'flex', justifyContent: 'center', borderRadius: '0.5rem', padding: '0.75rem 1rem' }} />
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