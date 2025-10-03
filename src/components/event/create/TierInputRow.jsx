import { InputField } from '@/components/ui/InputField';
import { TrashIcon } from '@heroicons/react/24/outline';

export function TierInputRow({ index, tier, onChange, onRemove, showRemoveButton }) {
    return (
        <div className="flex items-end space-x-3 p-3 bg-slate-50 rounded-md border">
            <InputField 
                label="Nome do Lote" 
                placeholder="Ex: Pista" 
                value={tier.name} 
                onChange={e => onChange(index, 'name', e.target.value)} 
                required 
            />
            {/* CORRIGIDO: O label agora é "Preço (R$)" */}
            <InputField 
                label="Preço (R$)" 
                type="number" 
                step="0.01" 
                placeholder="30.00" 
                value={tier.price} 
                onChange={e => onChange(index, 'price', e.target.value)} 
                required 
            />
            <InputField 
                label="Quantidade" 
                type="number" 
                min="1" 
                placeholder="100" 
                value={tier.maxTicketsSupply} 
                onChange={e => onChange(index, 'maxTicketsSupply', e.target.value)} 
                required 
            />
            {showRemoveButton && (
                <button type="button" onClick={() => onRemove(index)} className="p-2 text-red-500 hover:text-red-700">
                    <TrashIcon className="h-6 w-6" />
                </button>
            )}
        </div>
    );
}
