import { useState } from 'react';
import { web3, BN } from '@coral-xyz/anchor';
import toast from 'react-hot-toast';
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { TrashIcon, PlusCircleIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import { CheckCircleIcon } from '@heroicons/react/24/solid';

import { AdminCard } from '@/components/ui/AdminCard';
import { InputField } from '@/components/ui/InputField';
import { ActionButton } from '@/components/ui/ActionButton';


const WHITELIST_SEED = Buffer.from("whitelist");
const EVENT_SEED = Buffer.from("event");

export function CreateEventForm({ program, wallet, onEventCreated }) {
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState(1);

   
    const [offChainData, setOffChainData] = useState({
        name: '',
        description: '',
        image: '', 
        properties: {
            location: {
                venueName: '',
                address: {
                    street: '',
                    number: '',
                    city: '',
                    state: '',
                }
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
        royaltyBps: '500', // 5%
        maxTicketsPerWallet: '10',
        tiers: [{ name: 'Pista', price: '0.5', maxTicketsSupply: '100' }],
    });

    
    const [metadataUrl, setMetadataUrl] = useState('');
    const [generatedJson, setGeneratedJson] = useState(null);

    // --- FUNÇÕES DE LÓGICA ---

    const handleOffChainChange = (path, value) => {
        setOffChainData(prev => {
            const keys = path.split('.');
            const new_data = JSON.parse(JSON.stringify(prev)); 
            let current = new_data;
            for (let i = 0; i < keys.length - 1; i++) {
                current = current[keys[i]];
            }
            current[keys[keys.length - 1]] = value;
            return new_data;
        });
    };
    
    const handleOnChainChange = (field, value) => {
        setOnChainData(prev => ({ ...prev, [field]: value }));
    };

    const handleTierChange = (index, field, value) => {
        const newTiers = [...onChainData.tiers];
        newTiers[index][field] = value;
        handleOnChainChange('tiers', newTiers);
    };

    const addTier = () => handleOnChainChange('tiers', [...onChainData.tiers, { name: '', price: '', maxTicketsSupply: '' }]);
    const removeTier = (index) => {
        if (onChainData.tiers.length <= 1) return;
        handleOnChainChange('tiers', onChainData.tiers.filter((_, i) => i !== index));
    };

   
    const handleGenerateJson = () => {
      
        if (!offChainData.name || !offChainData.description || !offChainData.image) {
            return toast.error("Preencha Nome, Descrição e URL da Imagem para gerar os metadados.");
        }
        const jsonContent = {
            ...offChainData,
            // Formata as datas para o padrão ISO 8601, recomendado para metadados
            properties: {
                ...offChainData.properties,
                dateTime: {
                    ...offChainData.properties.dateTime,
                    start: offChainData.properties.dateTime.start.toISOString(),
                    end: offChainData.properties.dateTime.end.toISOString(),
                }
            }
        };
        setGeneratedJson(JSON.stringify(jsonContent, null, 2));
        setStep(3);
        toast.success("Arquivo JSON gerado! Pronto para baixar.");
    };

    // Dispara o download do arquivo JSON gerado
    const handleDownloadJson = () => {
        if (!generatedJson) return;
        const blob = new Blob([generatedJson], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'metadata.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (!program || !wallet) return toast.error("Conecte sua carteira.");
        if (!metadataUrl.startsWith('https://')) return toast.error("Por favor, insira uma URL de metadados válida.");

        const loadingToast = toast.loading("Criando evento na blockchain...");
        setLoading(true);
        try {
            const eventId = new BN(Math.floor(Date.now() * Math.random()));
            
            const [whitelistPda] = web3.PublicKey.findProgramAddressSync(
                [WHITELIST_SEED, wallet.publicKey.toBuffer()],
                program.programId
            );
            
            const [eventPda] = web3.PublicKey.findProgramAddressSync(
                [EVENT_SEED, eventId.toBuffer('le', 8)],
                program.programId
            );
            
            const tiersInput = onChainData.tiers.map(tier => ({
                name: tier.name,
                priceLamports: new BN(parseFloat(tier.price) * web3.LAMPORTS_PER_SOL),
                maxTicketsSupply: parseInt(tier.maxTicketsSupply, 10),
            }));
    
            // Chamada para o contrato com a assinatura simplificada
            await program.methods
                .createEvent(
                    eventId, 
                    metadataUrl,
                    new BN(Math.floor(onChainData.salesStartDate.getTime() / 1000)),
                    new BN(Math.floor(onChainData.salesEndDate.getTime() / 1000)),
                    parseInt(onChainData.royaltyBps, 10),
                    parseInt(onChainData.maxTicketsPerWallet, 10),
                    tiersInput
                )
                .accounts({
                    whitelistAccount: whitelistPda,
                    eventAccount: eventPda,
                    controller: wallet.publicKey,
                    systemProgram: web3.SystemProgram.programId,
                })
                .rpc();
    
            toast.success("Evento criado com sucesso!", { id: loadingToast });
            if (onEventCreated) onEventCreated();
        } catch (error) {
            console.error("Erro ao criar evento:", error);
            toast.error(`Erro ao criar evento: ${error.message}`, { id: loadingToast });
        } finally {
            setLoading(false);
        }
    };
    
    // Renderização do formulário em passos
    return (
        <AdminCard title="Criar um Novo Evento">
            <form onSubmit={handleSubmit} className="space-y-8">
                
                {/* --- PASSO 1: DADOS OFF-CHAIN --- */}
                <Step title="Passo 1: Informações do Evento (para os Metadados)" isActive={step >= 1} isComplete={step > 1}>
                    <p className="text-sm text-slate-500 mb-4">
                        Estes dados serão públicos e usados para exibir os detalhes do seu evento. Eles serão salvos em um arquivo JSON.
                    </p>
                    <div className="space-y-4">
                        <InputField label="Nome do Evento" value={offChainData.name} onChange={e => handleOffChainChange('name', e.target.value)} required />
                        <InputField as="textarea" label="Descrição" value={offChainData.description} onChange={e => handleOffChainChange('description', e.target.value)} required />
                        <InputField label="URL da Imagem Principal" placeholder="https://gateway.pinata.cloud/ipfs/..." value={offChainData.image} onChange={e => handleOffChainChange('image', e.target.value)} required 
                            helperText="Faça o upload da imagem em um serviço como Pinata ou NFT.Storage e cole o link aqui." />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <InputField label="Local (Ex: Estádio Beira-Rio)" value={offChainData.properties.location.venueName} onChange={e => handleOffChainChange('properties.location.venueName', e.target.value)} />
                            <InputField label="Endereço" value={offChainData.properties.location.address.street} onChange={e => handleOffChainChange('properties.location.address.street', e.target.value)} />
                            <InputField label="Cidade" value={offChainData.properties.location.address.city} onChange={e => handleOffChainChange('properties.location.address.city', e.target.value)} />
                            <InputField label="Estado (UF)" value={offChainData.properties.location.address.state} onChange={e => handleOffChainChange('properties.location.address.state', e.target.value)} />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <DatePickerField label="Início do Evento" selected={offChainData.properties.dateTime.start} onChange={date => handleOffChainChange('properties.dateTime.start', date)} />
                            <DatePickerField label="Fim do Evento" selected={offChainData.properties.dateTime.end} onChange={date => handleOffChainChange('properties.dateTime.end', date)} />
                        </div>
                    </div>
                     {step === 1 && <ActionButton type="button" onClick={() => setStep(2)} className="mt-6 w-full">Próximo Passo: Configurações On-Chain</ActionButton>}
                </Step>

                {/* --- PASSO 2: DADOS ON-CHAIN --- */}
                <Step title="Passo 2: Configurações On-Chain (regras do contrato)" isActive={step >= 2} isComplete={step > 2} disabled={step < 2}>
                    <p className="text-sm text-slate-500 mb-4">
                        Estas são as regras que serão gravadas permanentemente na blockchain e governarão seu evento.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        <DatePickerField label="Início das Vendas" selected={onChainData.salesStartDate} onChange={date => handleOnChainChange('salesStartDate', date)} />
                        <DatePickerField label="Fim das Vendas" selected={onChainData.salesEndDate} onChange={date => handleOnChainChange('salesEndDate', date)} />
                    </div>
                    {/* Lotes de Ingressos */}
                    <div className="space-y-4">
                        {onChainData.tiers.map((tier, index) => (
                            <div key={index} className="flex items-end space-x-3 p-3 bg-slate-50 rounded-md border">
                                <InputField label="Nome do Lote" placeholder="Ex: Pista - Lote 1" value={tier.name} onChange={e => handleTierChange(index, 'name', e.target.value)} required />
                                <InputField label="Preço (SOL)" type="number" step="0.01" placeholder="0.5" value={tier.price} onChange={e => handleTierChange(index, 'price', e.target.value)} required />
                                <InputField label="Quantidade" type="number" min="1" placeholder="100" value={tier.maxTicketsSupply} onChange={e => handleTierChange(index, 'maxTicketsSupply', e.target.value)} required />
                                {onChainData.tiers.length > 1 && (
                                    <button type="button" onClick={() => removeTier(index)} className="p-2 text-red-500 hover:text-red-700"><TrashIcon className="h-6 w-6" /></button>
                                )}
                            </div>
                        ))}
                        <button type="button" onClick={addTier} className="flex items-center space-x-2 text-sm text-indigo-600 hover:text-indigo-800 font-medium">
                            <PlusCircleIcon className="h-5 w-5" /><span>Adicionar Lote</span>
                        </button>
                    </div>
                    {step === 2 && <ActionButton type="button" onClick={handleGenerateJson} className="mt-6 w-full">Gerar Arquivo de Metadados</ActionButton>}
                </Step>

                {/* --- PASSO 3: UPLOAD E SUBMISSÃO --- */}
                <Step title="Passo 3: Faça o Upload e Crie o Evento" isActive={step >= 3} isComplete={false} disabled={step < 3}>
                    <p className="text-sm text-slate-500 mb-4">
                        Seu arquivo de metadados está pronto. Siga as instruções abaixo para finalizar.
                    </p>
                    <div className="p-4 border-l-4 border-indigo-500 bg-indigo-50 rounded-md space-y-4">
                        <p><strong>1. Baixe o arquivo de metadados:</strong></p>
                        <ActionButton type="button" onClick={handleDownloadJson} disabled={!generatedJson} className="w-auto bg-green-600 hover:bg-green-700">
                            <ArrowDownTrayIcon className="h-5 w-5 mr-2" /> Baixar metadata.json
                        </ActionButton>
                        
                        <p><strong>2. Faça o upload desse arquivo</strong> em um serviço como <a href="https://pinata.cloud" target="_blank" rel="noopener noreferrer" className="font-bold underline">Pinata</a> ou <a href="https://nft.storage" target="_blank" rel="noopener noreferrer" className="font-bold underline">NFT.Storage</a>.</p>
                        
                        <p><strong>3. Cole a URL final abaixo:</strong></p>
                        <InputField label="URL Final dos Metadados" placeholder="https://gateway.pinata.cloud/ipfs/..." value={metadataUrl} onChange={e => setMetadataUrl(e.target.value)} required />
                    </div>

                    {generatedJson && (
                        <div className="mt-4">
                            <h4 className="font-semibold text-sm mb-2">Pré-visualização do JSON:</h4>
                            <pre className="bg-slate-800 text-white p-4 rounded-md text-xs overflow-x-auto">
                                <code>{generatedJson}</code>
                            </pre>
                        </div>
                    )}
                    
                    <div className="pt-4">
                        <ActionButton type="submit" loading={loading} disabled={!wallet?.publicKey || loading || !metadataUrl} className="w-full">
                            {wallet?.publicKey ? "Criar Evento na Blockchain" : "Conecte a Carteira"}
                        </ActionButton>
                    </div>
                </Step>
            </form>
        </AdminCard>
    );
}

// Componente auxiliar para o DatePicker
const DatePickerField = ({ label, selected, onChange }) => (
    <div>
        <label className="block text-sm font-medium text-slate-600 mb-1">{label}</label>
        <DatePicker selected={selected} onChange={onChange} showTimeSelect timeFormat="HH:mm" timeIntervals={15} dateFormat="dd/MM/yyyy, HH:mm"
            className="w-full bg-slate-50 border border-slate-300 rounded-md shadow-sm text-slate-800 p-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
    </div>
);

// Componente auxiliar para os Passos
const Step = ({ title, isActive, isComplete, disabled, children }) => (
    <div className={`p-6 border rounded-lg transition-all ${isActive ? 'border-indigo-500 bg-white' : 'border-slate-200 bg-slate-50'} ${disabled ? 'opacity-50' : ''}`}>
        <h3 className="font-semibold text-xl mb-1 flex items-center">
            {isComplete && <CheckCircleIcon className="h-6 w-6 text-green-500 mr-2" />}
            {title}
        </h3>
        <div className={isActive ? 'block' : 'hidden'}>
            {children}
        </div>
    </div>
);