// src/components/admin/CreateEventWizard.jsx

import { useState } from 'react';

import toast from 'react-hot-toast';

import { Step1_MetadataForm } from './Step1_MetadataForm';
import { Step2_OnChainForm } from './Step2_OnChainForm';
import { Step3_UploadAndSubmit } from './Step3_UploadAndSubmit';
import { AdminCard } from '@/components/ui/AdminCard';
import { API_URL } from '@/lib/constants';
import { useAuth } from '@/contexts/AuthContext';

export function CreateEventWizard({ program, onEventCreated }) {
    const { publicKey } = useAuth();
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState(1);
    const [generatedJson, setGeneratedJson] = useState(null);

    const [offChainData, setOffChainData] = useState({
        name: '',
        description: '',
        image: null, // Começa como null
        category: 'Música',
        tags: [],
        organizer: { name: '', website: '', contactEmail: '', organizerLogo: null },
        additionalInfo: { ageRestriction: 'Livre', accessibility: '', complementaryHours: 0 },
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
                end: new Date(Date.now() + 3600 * 1000 * 24 * 14 + 7200000), // Adiciona 2 horas ao início
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            }
        }
    });

    const [onChainData, setOnChainData] = useState({
        salesStartDate: new Date(),
        salesEndDate: new Date(Date.now() + 3600 * 1000 * 24 * 7), // 7 dias a partir de agora
        royaltyBps: '500',
        maxTicketsPerWallet: '10',
        tiers: [{ name: 'Pista', price: '30.00', maxTicketsSupply: '100' }],
    });

    const validateStep1 = () => {
        const { name, description, image, properties } = offChainData;
        if (!name.trim()) { toast.error("O nome do evento é obrigatório."); return false; }
        if (!description.trim()) { toast.error("A descrição do evento é obrigatória."); return false; }
        if (!image) { toast.error("A imagem principal do evento é obrigatória."); return false; }
        if (properties.location.type === 'Physical') {
            const { venueName, address } = properties.location;
            if (!venueName.trim() || !address.street.trim() || !address.city.trim() || !address.state.trim()) {
                toast.error("Para eventos presenciais, preencha o nome do local e o endereço completo.");
                return false;
            }
        }
        if (properties.location.type === 'Online' && !properties.location.onlineUrl.trim()) {
            toast.error("A URL do evento online é obrigatória."); return false;
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
        if (parseInt(royaltyBps, 10) < 0 || parseInt(royaltyBps, 10) > 10000) {
            toast.error("Os royalties devem ser entre 0 e 10000."); return false;
        }
        if (parseInt(maxTicketsPerWallet, 10) < 1) {
            toast.error("O máximo de ingressos por carteira deve ser pelo menos 1."); return false;
        }
        for (const tier of tiers) {
            if (!tier.name.trim()) { toast.error("Todos os lotes devem ter um nome."); return false; }
            if (parseFloat(tier.price) < 0) {
                toast.error(`O preço em R$ do lote "${tier.name}" é inválido.`); return false;
            }
            if (parseInt(tier.maxTicketsSupply, 10) <= 0) {
                toast.error(`O fornecimento do lote "${tier.name}" deve ser maior que zero.`); return false;
            }
        }
        return true;
    };

    const handleGoToStep2 = () => { if (validateStep1()) setStep(2); };

    const handleGoToStep3 = () => {
        if (!validateStep2()) return;
        const previewData = { ...offChainData,
            image: offChainData.image instanceof File ? `[Arquivo: ${offChainData.image.name}]` : offChainData.image,
            organizer: {
                ...offChainData.organizer,
                organizerLogo: offChainData.organizer.organizerLogo instanceof File ? `[Arquivo: ${offChainData.organizer.organizerLogo.name}]` : offChainData.organizer.organizerLogo
            }
        };
        setGeneratedJson(JSON.stringify({ offChain: previewData, onChain: onChainData }, null, 2));
        setStep(3);
        toast.success("Dados prontos para envio!");
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (!validateStep1() || !validateStep2()) return;
        
        if (!publicKey) {
            return toast.error("Faça login para criar o evento.");
        }
    
        console.log('--- Iniciando submit ---');
        console.log('Public Key do usuário:', publicKey.toString());
    
        const loadingToast = toast.loading("Iniciando criação do evento...");
        setLoading(true);
    
        try {
            // Recuperar as credenciais do localStorage para enviar ao backend
            const savedCredentials = localStorage.getItem('solana-local-wallet-credentials');
            if (!savedCredentials) {
                throw new Error("Credenciais de login não encontradas. Faça login novamente.");
            }
    
            const finalFormData = new FormData();
            
            // Upload de arquivos
            const isImageValid = offChainData.image && (offChainData.image instanceof File || offChainData.image instanceof Blob);
            if (isImageValid) {
                finalFormData.append('image', offChainData.image);
            } else {
                console.error('Imagem inválida no momento do submit:', offChainData.image);
                throw new Error("A imagem principal do evento é inválida. Por favor, selecione-a novamente.");
            }
            
            if (offChainData.organizer.organizerLogo && (offChainData.organizer.organizerLogo instanceof File || offChainData.organizer.organizerLogo instanceof Blob)) {
                finalFormData.append('organizerLogo', offChainData.organizer.organizerLogo);
            }
    
            // Preparar dados para JSON
            const offChainDataForJson = JSON.parse(JSON.stringify(offChainData));
            if (isImageValid) offChainDataForJson.image = '[FILE_UPLOADED]';
            if (offChainData.organizer.organizerLogo) offChainDataForJson.organizer.organizerLogo = '[FILE_UPLOADED]';
    
            // Adicionar dados ao FormData
            finalFormData.append('offChainData', JSON.stringify(offChainDataForJson));
            finalFormData.append('onChainData', JSON.stringify(onChainData));
            finalFormData.append('controller', publicKey.toString());
            
            // ✅ ENVIAR CREDENCIAIS PARA O BACKEND DERIVAR A KEYPAIR
            finalFormData.append('userLoginData', savedCredentials);
    
            toast.loading("Enviando para o servidor e blockchain...", { id: loadingToast });
            
            const response = await fetch(`${API_URL}/api/events/create-full-event`, {
                method: 'POST',
                body: finalFormData,
            });
    
            const result = await response.json();
            
            if (!response.ok || !result.success) {
                throw new Error(result.error || "Falha ao criar o evento no servidor.");
            }
    
            toast.success("Evento criado com sucesso!", { id: loadingToast, duration: 5000 });
            
            console.log('✅ Evento criado! Authority:', result.authority);
            console.log('✅ Endereço do evento:', result.eventAddress);
            
            if (onEventCreated) onEventCreated();
    
        } catch (error) {
            console.error("❌ Erro no processo de criação do evento:", error);
            toast.error(`Erro: ${error.message}`, { id: loadingToast });
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
                    onNextStep={handleGoToStep2}
                />
                <Step2_OnChainForm
                    isActive={step === 2}
                    data={onChainData}
                    setData={setOnChainData}
                    onGenerateJson={handleGoToStep3}
                />
                <Step3_UploadAndSubmit
                    isActive={step === 3}
                    generatedJson={generatedJson}
                    loading={loading}
                />
            </form>
        </AdminCard>
    );
}