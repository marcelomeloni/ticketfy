import { useState } from 'react';
import { web3, BN } from '@coral-xyz/anchor';
import toast from 'react-hot-toast';

import { Step1_MetadataForm } from './Step1_MetadataForm';
import { Step2_OnChainForm } from './Step2_OnChainForm';
import { Step3_UploadAndSubmit } from './Step3_UploadAndSubmit';
import { AdminCard } from '@/components/ui/AdminCard';

const WHITELIST_SEED = Buffer.from("whitelist");
const EVENT_SEED = Buffer.from("event");

export function CreateEventWizard({ program, wallet, onEventCreated }) {
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState(1);

    const [offChainData, setOffChainData] = useState({
        name: '',
        description: '',
        image: '',
        category: 'Música',
        tags: [],
        organizer: { 
            name: '', 
            website: '',
            contactEmail: '',
            organizerLogo: '',
        },
        additionalInfo: { 
            ageRestriction: 'Livre', 
            accessibility: '',
            complementaryHours: 0, 
        },
        properties: {
            location: {
                type: 'Physical',
                venueName: '',
                address: { street: '', number: '', neighborhood: '', city: '', state: '', zipCode: '', country: 'BR' },
                coordinates: { latitude: '', longitude: '' },
                onlineUrl: ''
            },
            dateTime: {
                start: new Date(Date.now() + 3600 * 1000 * 24 * 14),
                end: new Date(Date.now() + 3600 * 1000 * 24 * 14 + 7200000),
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            }
        }
    });

    const [onChainData, setOnChainData] = useState({
        salesStartDate: new Date(),
        salesEndDate: new Date(Date.now() + 3600 * 1000 * 24 * 7),
        royaltyBps: '500',
        maxTicketsPerWallet: '10',
        tiers: [{ name: 'Pista', price: '0.5', maxTicketsSupply: '100' }],
    });

    const [metadataUrl, setMetadataUrl] = useState('');
    const [generatedJson, setGeneratedJson] = useState(null);

    // --- ✅ 1. FUNÇÕES DE VALIDAÇÃO ---
    const validateStep1 = () => {
        const { name, description, image, properties } = offChainData;
        if (!name.trim()) { toast.error("O nome do evento é obrigatório."); return false; }
        if (!description.trim()) { toast.error("A descrição do evento é obrigatória."); return false; }
        try { new URL(image); } catch (_) { toast.error("A URL da imagem principal é inválida."); return false; }

        if (properties.location.type === 'Physical') {
            const { venueName, address } = properties.location;
            if (!venueName.trim() || !address.street.trim() || !address.city.trim() || !address.state.trim()) {
                toast.error("Para eventos presenciais, preencha o nome do local e o endereço.");
                return false;
            }
        }
        if (properties.location.type === 'Online') {
            try { new URL(properties.location.onlineUrl); } 
            catch (_) { toast.error("A URL do evento online é inválida."); return false; }
        }
        if (new Date(properties.dateTime.start) >= new Date(properties.dateTime.end)) {
            toast.error("A data de término do evento deve ser posterior à data de início.");
            return false;
        }
        return true;
    };

    const validateStep2 = () => {
        const { salesStartDate, salesEndDate, tiers, royaltyBps, maxTicketsPerWallet } = onChainData;
        if (new Date(salesStartDate) >= new Date(salesEndDate)) {
            toast.error("A data de fim das vendas deve ser posterior à data de início.");
            return false;
        }
        if (isNaN(parseInt(royaltyBps, 10)) || royaltyBps < 0) {
            toast.error("O valor dos royalties é inválido."); return false;
        }
        if (isNaN(parseInt(maxTicketsPerWallet, 10)) || maxTicketsPerWallet < 0) {
            toast.error("O valor de ingressos máximos por carteira é inválido."); return false;
        }
        for (const tier of tiers) {
            if (!tier.name.trim()) { toast.error("Todos os lotes devem ter um nome."); return false; }
            if (isNaN(parseFloat(tier.price)) || parseFloat(tier.price) < 0) {
                toast.error(`O preço do lote "${tier.name}" é inválido.`); return false;
            }
            if (!/^\d+$/.test(tier.maxTicketsSupply) || parseInt(tier.maxTicketsSupply, 10) <= 0) {
                toast.error(`O fornecimento máximo do lote "${tier.name}" deve ser um número inteiro maior que zero.`); return false;
            }
        }
        return true;
    };

    // --- ✅ 2. FUNÇÕES DE TRANSIÇÃO COM VALIDAÇÃO ---
    const handleGoToStep2 = () => {
        if (validateStep1()) {
            setStep(2);
        }
    };
    
    const handleGenerateJson = () => {
        // Valida ambos os passos antes de gerar o JSON
        if (!validateStep1()) return;
        if (!validateStep2()) return;

        const jsonContent = { ...offChainData, properties: { ...offChainData.properties,
            dateTime: {
                ...offChainData.properties.dateTime,
                start: new Date(offChainData.properties.dateTime.start).toISOString(),
                end: new Date(offChainData.properties.dateTime.end).toISOString(),
            }
        }};
        setGeneratedJson(JSON.stringify(jsonContent, null, 2));
        setStep(3);
        toast.success("Arquivo JSON gerado! Pronto para baixar.");
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (!program || !wallet) return toast.error("Conecte sua carteira.");
        if (!metadataUrl.startsWith('https://')) return toast.error("Por favor, insira uma URL de metadados válida.");

        const loadingToast = toast.loading("Criando evento na blockchain...");
        setLoading(true);
        try {
            const eventId = new BN(Date.now()); 
            
            const [whitelistPda] = web3.PublicKey.findProgramAddressSync([WHITELIST_SEED, wallet.publicKey.toBuffer()], program.programId);
            const [eventPda] = web3.PublicKey.findProgramAddressSync([EVENT_SEED, eventId.toBuffer('le', 8)], program.programId);
            
            const tiersInput = onChainData.tiers.map(tier => ({
                name: tier.name,
                priceLamports: new BN(parseFloat(tier.price) * web3.LAMPORTS_PER_SOL),
                maxTicketsSupply: parseInt(tier.maxTicketsSupply, 10),
            }));
    
            await program.methods
                .createEvent(eventId, metadataUrl, new BN(Math.floor(onChainData.salesStartDate.getTime() / 1000)), new BN(Math.floor(onChainData.salesEndDate.getTime() / 1000)), parseInt(onChainData.royaltyBps, 10), parseInt(onChainData.maxTicketsPerWallet, 10), tiersInput)
                .accounts({
                    whitelistAccount: whitelistPda,
                    eventAccount: eventPda,
                    controller: wallet.publicKey,
                    systemProgram: web3.SystemProgram.programId,
                }).rpc();
    
            toast.success("Evento criado com sucesso!", { id: loadingToast });
            if (onEventCreated) onEventCreated();
        } catch (error) {
            console.error("Erro ao criar evento:", error);
            toast.error(`Erro ao criar evento: ${error.message}`, { id: loadingToast });
        } finally {
            setLoading(false);
        }
    };

    return (
        <AdminCard title="Criar um Novo Evento">
            <form onSubmit={handleSubmit} className="space-y-8">
                <Step1_MetadataForm
                    isActive={step === 1}
                    data={offChainData}
                    setData={setOffChainData}
                    onNextStep={handleGoToStep2} // ✅ USA A FUNÇÃO COM VALIDAÇÃO
                />
                <Step2_OnChainForm
                    isActive={step === 2}
                    data={onChainData}
                    setData={setOnChainData}
                    onGenerateJson={handleGenerateJson} // ✅ USA A FUNÇÃO COM VALIDAÇÃO
                />
                <Step3_UploadAndSubmit
                    isActive={step === 3}
                    generatedJson={generatedJson}
                    metadataUrl={metadataUrl}
                    setMetadataUrl={setMetadataUrl}
                    loading={loading}
                    wallet={wallet}
                />
            </form>
        </AdminCard>
    );
}
