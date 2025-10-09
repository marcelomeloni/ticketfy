// src/components/event/create/CreateEventWizard.jsx
import { useState } from 'react';
import toast from 'react-hot-toast';
import { useConnection } from '@solana/wallet-adapter-react';
import { PublicKey, SystemProgram, Transaction } from '@solana/web3.js';
import * as anchor from '@coral-xyz/anchor';

import { Step1_MetadataForm } from './Step1_MetadataForm';
import { Step2_OnChainForm } from './Step2_OnChainForm';
import { Step3_UploadAndSubmit } from './Step3_UploadAndSubmit';
import { AdminCard } from '@/components/ui/AdminCard';
import { API_URL } from '@/lib/constants';
import { useAppWallet } from '@/hooks/useAppWallet';

// Seeds para PDAs
const WHITELIST_SEED = Buffer.from("whitelist");
const EVENT_SEED = Buffer.from("event");

export function CreateEventWizard({ program, onEventCreated, eventAddress }) {
    const { connection } = useConnection();
    const wallet = useAppWallet();
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState(1);
    const [generatedJson, setGeneratedJson] = useState(null);
    const [localEventAddress, setLocalEventAddress] = useState(eventAddress || null);
    const [eventImageUrl, setEventImageUrl] = useState(null);

    const [offChainData, setOffChainData] = useState({
        name: '',
        description: '',
        image: null,
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
        tiers: [{ name: 'Pista', price: '30.00', maxTicketsSupply: '100' }],
    });

    // ✅ FUNÇÃO PARA BUSCAR DETALHES DO EVENTO VIA API
    const fetchEventDetails = async (eventAddress) => {
        try {
            console.log('🔍 Buscando detalhes do evento na API...');
            const response = await fetch(`${API_URL}/api/events/${eventAddress}/fast`);
            const data = await response.json();
            
            if (data.success && data.event) {
                console.log('📥 Dados completos do evento:', data.event);
                
                // ✅ PROCURA A IMAGEM EM DIFERENTES CAMPOS DA RESPOSTA
                const imageUrl = 
                    data.event.imageUrl || 
                    data.event.metadata?.image ||
                    data.event.offChainMetadata?.image;
                    
                if (imageUrl) {
                    console.log('🖼️ URL da imagem encontrada via API:', imageUrl);
                    return imageUrl;
                } else {
                    console.log('🔍 Campos de imagem na resposta:', {
                        imageUrl: data.event.imageUrl,
                        metadataImage: data.event.metadata?.image,
                        hasMetadata: !!data.event.metadata,
                        allFields: Object.keys(data.event)
                    });
                }
            } else {
                console.warn('❌ API retornou sucesso false:', data);
            }
        } catch (error) {
            console.error('❌ Erro ao buscar detalhes do evento:', error);
        }
        return null;
    };

    const validateStep1 = () => {
        const { name, description, image, properties } = offChainData;
        if (!name.trim()) { 
            toast.error("O nome do evento é obrigatório."); 
            return false; 
        }
        if (!description.trim()) { 
            toast.error("A descrição do evento é obrigatória."); 
            return false; 
        }
        if (!image) { 
            toast.error("A imagem principal do evento é obrigatória."); 
            return false; 
        }
        if (properties.location.type === 'Physical') {
            const { venueName, address } = properties.location;
            if (!venueName.trim() || !address.street.trim() || !address.city.trim() || !address.state.trim()) {
                toast.error("Para eventos presenciais, preencha o nome do local e o endereço completo.");
                return false;
            }
        }
        if (properties.location.type === 'Online' && !properties.location.onlineUrl.trim()) {
            toast.error("A URL do evento online é obrigatória."); 
            return false;
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
            toast.error("Os royalties devem ser entre 0 e 10000."); 
            return false;
        }
        if (parseInt(maxTicketsPerWallet, 10) < 1) {
            toast.error("O máximo de ingressos por carteira deve ser pelo menos 1."); 
            return false;
        }
        for (const tier of tiers) {
            if (!tier.name.trim()) { 
                toast.error("Todos os lotes devem ter um nome."); 
                return false; 
            }
            if (parseFloat(tier.price) < 0) {
                toast.error(`O preço em R$ do lote "${tier.name}" é inválido.`); 
                return false;
            }
            if (parseInt(tier.maxTicketsSupply, 10) <= 0) {
                toast.error(`O fornecimento do lote "${tier.name}" deve ser maior que zero.`); 
                return false;
            }
        }
        return true;
    };

    const handleGoToStep2 = () => { 
        if (validateStep1()) setStep(2); 
    };

    const handleGoToStep3 = () => {
        if (!validateStep2()) return;
        const previewData = { 
            ...offChainData,
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

    // ✅ FLUXO SIMPLIFICADO: Se for adapter, usa o backend para preparar transação
    const createEventWithAdapter = async () => {
        if (!wallet.publicKey || !wallet.signTransaction) {
            throw new Error("Carteira não conectada ou não suporta assinatura");
        }

        console.log('🦊 Criando evento com assinatura da extensão...');

        const finalFormData = new FormData();
        
        // Upload de arquivos
        const isImageValid = offChainData.image && (offChainData.image instanceof File || offChainData.image instanceof Blob);
        if (isImageValid) {
            finalFormData.append('image', offChainData.image);
        } else {
            throw new Error("A imagem principal do evento é obrigatória.");
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
        finalFormData.append('controller', wallet.publicKey.toString());
        finalFormData.append('walletType', 'adapter');

        // ✅ PARA EXTENSÃO: Não enviar userLoginData, apenas indicar que é adapter
        finalFormData.append('userLoginData', JSON.stringify({
            loginType: 'adapter',
            publicKey: wallet.publicKey.toString(),
            walletType: 'adapter'
        }));

        console.log('📤 Enviando dados para o backend...');
        const response = await fetch(`${API_URL}/api/events/create-full-event`, {
            method: 'POST',
            body: finalFormData,
        });

        const result = await response.json();
        
        if (!response.ok || !result.success) {
            throw new Error(result.error || "Falha ao criar o evento no servidor.");
        }

        console.log('📥 Resposta do backend:', result);

        // ✅ VERIFICAR SE O BACKEND RETORNOU UMA TRANSAÇÃO PARA ASSINAR
        if (result.transaction) {
            console.log('🦊 Backend retornou transação para assinatura no frontend...');
            console.log('📦 Dados do evento preparados:', {
                eventPda: result.eventPda,
                eventId: result.eventId,
                metadataUrl: result.metadataUrl
            });

            try {
                // Desserializar a transação
                console.log('🔧 Desserializando transação...');
                const transaction = Transaction.from(Buffer.from(result.transaction, 'base64'));
                
                console.log('✍️ Solicitando assinatura da carteira...');
                // Assinar com a carteira
                const signedTransaction = await wallet.signTransaction(transaction);
                console.log('✅ Transação assinada pela carteira!');
                
                // Enviar transação assinada para o backend
                console.log('📤 Enviando transação assinada para o backend...');
                const sendResponse = await fetch(`${API_URL}/api/events/send-signed-transaction`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        signedTransaction: Buffer.from(signedTransaction.serialize()).toString('base64')
                    }),
                });

                const sendResult = await sendResponse.json();
                console.log('📥 Resposta do envio da transação:', sendResult);
                
                if (!sendResponse.ok || !sendResult.success) {
                    throw new Error(sendResult.error || "Falha ao enviar transação assinada.");
                }

                console.log('🎉 Transação confirmada na blockchain!');
                console.log('📝 Assinatura:', sendResult.signature);

                // Combinar os resultados
                return {
                    ...result,
                    signature: sendResult.signature,
                    eventAddress: result.eventPda,
                    authority: wallet.publicKey.toString(),
                    message: "Evento criado com assinatura da carteira!"
                };

            } catch (signError) {
                console.error('❌ Erro ao assinar transação:', signError);
                throw new Error(`Falha ao assinar transação: ${signError.message}`);
            }
        } else {
            // Se não há transação para assinar, retornar o resultado normal
            console.log('✅ Evento criado sem necessidade de assinatura adicional');
            return result;
        }
    };

    // ✅ FLUXO PARA LOGIN LOCAL (backend faz tudo)
    const createEventWithBackend = async () => {
        console.log('🔐 Criando evento com assinatura do backend...');

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
            throw new Error("A imagem principal do evento é obrigatória.");
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
        finalFormData.append('controller', wallet.publicKey.toString());
        finalFormData.append('walletType', wallet.walletType);
        
        // Enviar credenciais para o backend derivar a keypair
        finalFormData.append('userLoginData', savedCredentials);

        const response = await fetch(`${API_URL}/api/events/create-full-event`, {
            method: 'POST',
            body: finalFormData,
        });

        const result = await response.json();
        
        if (!response.ok || !result.success) {
            throw new Error(result.error || "Falha ao criar o evento no servidor.");
        }

        return result;
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (!validateStep1() || !validateStep2()) return;
        
        if (!wallet.connected || !wallet.publicKey) {
            return toast.error("Faça login para criar o evento.");
        }

        console.log('--- Iniciando submit ---');
        console.log('Public Key:', wallet.publicKey.toString());
        console.log('Tipo de carteira:', wallet.walletType);

        const loadingToast = toast.loading("Iniciando criação do evento...");
        setLoading(true);

        try {
            let result;

            if (wallet.walletType === 'adapter') {
                console.log('🎯 Usando fluxo para carteira externa...');
                toast.loading("Preparando transação...", { id: loadingToast });
                result = await createEventWithAdapter();
                
                // Atualizar o toast durante o processo
                if (result.signature) {
                    toast.loading("Confirmando transação na blockchain...", { id: loadingToast });
                }
            } else {
                console.log('🎯 Usando fluxo com backend...');
                toast.loading("Processando no servidor...", { id: loadingToast });
                result = await createEventWithBackend();
            }

            // ✅ DEBUG: VER TODOS OS DADOS QUE O BACKEND RETORNA
            console.log('📥 RESPOSTA COMPLETA DO BACKEND:', JSON.stringify(result, null, 2));
            
            toast.success("Evento criado com sucesso!", { 
                id: loadingToast, 
                duration: 5000 
            });
            
            console.log('✅ Evento criado!');
            console.log('✅ Authority:', result.authority);
            console.log('✅ Endereço do evento:', result.eventAddress);
            console.log('✅ Transação:', result.signature);
            
            // ✅ SOLUÇÃO 2: BUSCAR URL DA IMAGEM VIA API DE DETALHES
            console.log('🔄 Buscando URL da imagem via API de detalhes...');
            let imageUrl = await fetchEventDetails(result.eventAddress);

            if (imageUrl) {
                setEventImageUrl(imageUrl);
                console.log('🖼️ URL da imagem encontrada via API:', imageUrl);
            } else {
                console.warn('⚠️ Não foi possível obter a URL da imagem via API');
                // ✅ TENTATIVA ALTERNATIVA: Verificar se há imageUrl no resultado direto
                if (result.imageUrl) {
                    setEventImageUrl(result.imageUrl);
                    console.log('🖼️ Usando imageUrl do resultado direto:', result.imageUrl);
                } else {
                    console.log('🔍 Campos disponíveis no resultado:', Object.keys(result));
                }
            }
            
            setLocalEventAddress(result.eventAddress);

        } catch (error) {
            console.error("❌ Erro no processo de criação do evento:", error);
            toast.error(`Erro: ${error.message}`, { 
                id: loadingToast,
                duration: 7000 
            });
        } finally {
            setLoading(false);
        }
    };

    const getWalletStatusBadge = () => {
        const baseClasses = "px-3 py-1 rounded-full text-xs font-medium";
        
        switch (wallet.walletType) {
            case 'adapter':
                return <span className={`${baseClasses} bg-green-100 text-green-800`}>Carteira Externa</span>;
            case 'local':
                return <span className={`${baseClasses} bg-blue-100 text-blue-800`}>Login Usuário/Senha</span>;
            case 'seedphrase':
                return <span className={`${baseClasses} bg-purple-100 text-purple-800`}>Seed Phrase</span>;
            case 'privateKey':
                return <span className={`${baseClasses} bg-orange-100 text-orange-800`}>Private Key</span>;
            default:
                return <span className={`${baseClasses} bg-gray-100 text-gray-800`}>Não Conectado</span>;
        }
    };

    return (
        <AdminCard title="Criar um Novo Evento">
            {/* Status da Carteira */}
            <div className="mb-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                        <h3 className="text-sm font-semibold text-slate-700">Status da Conexão</h3>
                        <div className="flex items-center gap-2 mt-1">
                            <div className={`w-2 h-2 rounded-full ${wallet.connected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                            <p className="text-sm text-slate-600">
                                {wallet.connected ? 'Conectado' : 'Desconectado'}
                            </p>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-sm font-medium text-slate-700">Método de Login</p>
                        <div className="mt-1">
                            {getWalletStatusBadge()}
                        </div>
                    </div>
                </div>
                {wallet.connected && wallet.publicKey && (
                    <div className="mt-3 pt-3 border-t border-slate-200">
                        <p className="text-xs text-slate-500 break-all">
                            <strong>Public Key:</strong> {wallet.publicKey.toString()}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                            <strong>Fluxo:</strong> {wallet.walletType === 'adapter' 
                                ? 'Assinatura pela extensão' 
                                : 'Assinatura pelo servidor'}
                        </p>
                    </div>
                )}
            </div>

            {/* Formulário do Wizard */}
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
                    walletType={wallet.walletType}
                    eventAddress={localEventAddress}
                    eventImageUrl={eventImageUrl}
                />
            </form>
        </AdminCard>
    );
}