import { useState } from 'react';
import { BN } from '@coral-xyz/anchor';
import toast from 'react-hot-toast';
import { AdminCard } from '@/components/ui/AdminCard';
import { InputField } from '@/components/ui/InputField';
import { ActionButton } from '@/components/ui/ActionButton';

// Componente para exibir e gerenciar um único evento
export function ManageEventCard({ program, eventAccount, eventPublicKey }) {
    const [showAddTier, setShowAddTier] = useState(false);
    const [loading, setLoading] = useState(false);
    
    // Estado para o formulário de novo lote
    const [newTierName, setNewTierName] = useState('');
    const [newTierPrice, setNewTierPrice] = useState('');
    const [newTierSupply, setNewTierSupply] = useState('');

    const handleAddTier = async (event) => {
        event.preventDefault();
        const loadingToast = toast.loading("Adicionando novo lote...");
        setLoading(true);
        try {
          
            const priceBrlCents = new BN(parseFloat(newTierPrice) * 100);
            const maxTicketsSupply = parseInt(newTierSupply, 10);
    
            // 2. Enviar o valor correto (em centavos) para o programa
            await program.methods
                .addTicketTier(newTierName, priceBrlCents, maxTicketsSupply)
                .accounts({
                    event: eventPublicKey,
                    controller: program.provider.wallet.publicKey,
                })
                .rpc();
    
            toast.success("Lote adicionado com sucesso!", { id: loadingToast });
            setShowAddTier(false);
        } catch (error) {
            console.error("Erro ao adicionar lote:", error);
            toast.error(`Erro: ${error.message}`, { id: loadingToast });
        } finally {
            setLoading(false);
        }
    };

    return (
        <AdminCard title={eventAccount.name}>
            <div className="space-y-4">
                <p className="text-sm text-slate-600">{eventAccount.description}</p>
                <div>
                    <h4 className="font-semibold">Lotes Atuais:</h4>
                    <ul className="list-disc list-inside text-slate-700">
                        {eventAccount.tiers.map((tier, i) => (
                            <li key={i}>{tier.name} - {tier.ticketsSold}/{tier.maxTicketsSupply} vendidos</li>
                        ))}
                    </ul>
                </div>
                
                {!showAddTier && (
                    <ActionButton onClick={() => setShowAddTier(true)} variant="secondary">Adicionar Novo Lote</ActionButton>
                )}

                {showAddTier && (
                    <form onSubmit={handleAddTier} className="space-y-4 p-4 border rounded-md mt-4 bg-slate-50">
                        <h4 className="font-semibold">Novo Lote</h4>
                        <InputField 
                    label="Preço (BRL)" 
                    type="number" 
                    value={newTierPrice} 
                    onChange={e => setNewTierPrice(e.target.value)} 
                    required 
                />
                <InputField 
                    label="Quantidade" 
                    type="number" 
                    value={newTierSupply} 
                    onChange={e => setNewTierSupply(e.target.value)} 
                    required 
                />
                        <InputField label="Quantidade" type="number" value={newTierSupply} onChange={e => setNewTierSupply(e.target.value)} required />
                        <div className="flex space-x-2">
                             <ActionButton type="submit" loading={loading}>Confirmar</ActionButton>
                             <ActionButton onClick={() => setShowAddTier(false)} variant="secondary" disabled={loading}>Cancelar</ActionButton>
                        </div>
                    </form>
                )}
            </div>
        </AdminCard>
    );
}