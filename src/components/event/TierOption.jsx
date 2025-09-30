import { web3 } from '@coral-xyz/anchor';
import { TicketIcon, XCircleIcon } from '@heroicons/react/24/solid';

export const TierOption = ({ tier, isSelected, isSoldOut, onSelect }) => {
    // ✅ CORREÇÃO: `tier.priceLamports` agora é um número/string da API.
    // Usamos Number() para garantir que é um número antes de comparar.
    const isFree = Number(tier.priceLamports) === 0;

    return (
        <div 
            onClick={!isSoldOut ? onSelect : undefined}
            className={`p-6 rounded-2xl border-2 transition-all duration-300 ${
                isSelected 
                    ? 'border-blue-500 bg-blue-50 shadow-lg scale-105' 
                    : 'border-slate-200 bg-white hover:border-blue-300 hover:shadow-md'
            } ${
                isSoldOut 
                    ? 'bg-slate-100 opacity-60 cursor-not-allowed grayscale' 
                    : 'cursor-pointer hover:scale-105'
            }`}
        >
            <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                    <h3 className="text-xl font-bold text-slate-900 mb-2">{tier.name}</h3>
                    <div className="flex items-center gap-2 text-slate-600">
                        <TicketIcon className="h-4 w-4" />
                        <span className="text-sm font-medium">
                            {tier.maxTicketsSupply - tier.ticketsSold} ingressos restantes
                        </span>
                    </div>
                </div>
                
                <div className="text-right">
                    {isSoldOut ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-bold">
                            <XCircleIcon className="h-4 w-4" />
                            Esgotado
                        </span>
                    ) : isFree ? (
                        <span className="text-2xl font-bold bg-gradient-to-r from-green-500 to-emerald-600 bg-clip-text text-transparent">
                            Grátis
                        </span>
                    ) : (
                        <div className="text-right">
                            <p className="text-2xl font-bold text-blue-600">
                                {/* ✅ CORREÇÃO: Usamos Number() aqui também para a conversão. */}
                                {(Number(tier.priceLamports) / web3.LAMPORTS_PER_SOL).toFixed(2)} SOL
                            </p>
                            <p className="text-sm text-slate-500">+ taxas</p>
                        </div>
                    )}
                </div>
            </div>
            
            {!isSoldOut && (
                <div className={`mt-4 p-3 rounded-xl text-center font-semibold text-sm ${
                    isSelected 
                        ? 'bg-blue-500 text-white' 
                        : 'bg-slate-100 text-slate-700'
                }`}>
                    {isSelected ? '✓ Selecionado' : 'Clique para selecionar'}
                </div>
            )}
        </div>
    );
};

