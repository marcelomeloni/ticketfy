import { ActionButton } from '@/components/ui/ActionButton';
import { Step } from './common/Step';
import { DatePickerField } from './common/DatePickerField';
import { TierInputRow } from './TierInputRow';
import { PlusCircleIcon } from '@heroicons/react/24/outline';
import { InputField } from '@/components/ui/InputField';
import { useMemo } from 'react';


export function Step2_OnChainForm({ isActive, data, setData, onGenerateJson }) {
    // ✅ 1. Lógica para determinar se o passo foi completado
    const isComplete = useMemo(() => {
        // Validação básica para garantir que todos os campos de tier essenciais estejam preenchidos
        return data.tiers.every(t => t.name && t.price && t.maxTicketsSupply && parseFloat(t.price) >= 0);
    }, [data]);

    if (!isActive) {
        return <Step title="Passo 2: Configurações On-Chain" disabled={true} isComplete={isComplete} />;
    }

    const handleDataChange = (field, value) => {
        setData(prev => ({ ...prev, [field]: value }));
    };

    const handleTierChange = (index, field, value) => {
        const newTiers = [...data.tiers];
        newTiers[index][field] = value;
        handleDataChange('tiers', newTiers);
    };

    const addTier = () => handleDataChange('tiers', [...data.tiers, { name: '', price: '', maxTicketsSupply: '' }]);
    const removeTier = (index) => {
        if (data.tiers.length <= 1) return;
        handleDataChange('tiers', data.tiers.filter((_, i) => i !== index));
    };

    return (
        <Step title="Passo 2: Configurações On-Chain (regras do contrato)" isActive={true}>
            <p className="text-sm text-slate-500 mb-4">Estas são as regras que serão gravadas permanentemente na blockchain e governarão seu evento.</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <DatePickerField label="Início das Vendas" selected={data.salesStartDate} onChange={date => handleDataChange('salesStartDate', date)} />
                <DatePickerField label="Fim das Vendas" selected={data.salesEndDate} onChange={date => handleDataChange('salesEndDate', date)} />
            </div>

            <div className="space-y-4">
                {/* ✅ IMPORTANTE: Se o seu TierInputRow tem uma lógica específica para o preço, ela deve ser mantida.
                   A mudança de lógica de SOL para BRL foi feita no CreateEventWizard.js, mas a label deve ser clara aqui. 
                   Assumindo que TierInputRow já está adaptado para BRL: */}
                {data.tiers.map((tier, index) => (
                    <TierInputRow 
                        key={index} 
                        index={index} 
                        tier={tier} 
                        onChange={handleTierChange} 
                        onRemove={removeTier} 
                        showRemoveButton={data.tiers.length > 1}
                    />
                ))}
                <button type="button" onClick={addTier} className="flex items-center space-x-2 text-sm text-indigo-600 hover:text-indigo-800 font-medium">
                    <PlusCircleIcon className="h-5 w-5" /><span>Adicionar Lote</span>
                </button>
            </div>
            
            <h4 className="font-semibold text-md pt-6">Configurações Adicionais</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                {/* Nota: Este Royalty BPS é a taxa que o ORGANIZADOR GANHA na REVANDA (marketplace) */}
                <InputField 
                    label="Royalties de Revenda (BPS, ex: 500 = 5%)" 
                    type="number" 
                    value={data.royaltyBps} 
                    onChange={(e) => handleDataChange('royaltyBps', e.target.value)} 
                    required 
                />
                <InputField 
                    label="Max Ingressos por Carteira" 
                    type="number" 
                    placeholder="0 para ilimitado" 
                    value={data.maxTicketsPerWallet} 
                    onChange={(e) => handleDataChange('maxTicketsPerWallet', e.target.value)} 
                    required 
                />
            </div>

            {/* ✅ 2. O botão agora chama a função que contém a validação */}
            <ActionButton type="button" onClick={onGenerateJson} className="mt-6 w-full">Gerar Arquivo de Metadados</ActionButton>
        </Step>
    );
}
