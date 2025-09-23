import { web3 } from '@coral-xyz/anchor';
export const TierOption = ({ tier, isSelected, isSoldOut, onSelect }) => {
    const isFree = tier.priceLamports.toNumber() === 0;
    return (
        <div 
            onClick={onSelect}
            className={`p-4 border-2 rounded-lg transition-all ${isSelected ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200'} ${isSoldOut ? 'bg-slate-100 opacity-60 cursor-not-allowed' : 'cursor-pointer hover:border-indigo-400'}`}
        >
            <div className="flex justify-between items-center">
                <div>
                    <p className="font-bold text-slate-800">{tier.name}</p>
                    <p className="text-sm text-slate-500">{tier.maxTicketsSupply - tier.ticketsSold} restantes</p>
                </div>
                {isSoldOut 
                    ? <span className="font-bold text-red-500">Esgotado</span>
                    : isFree
                        ? <span className="text-xl font-bold text-green-600">Grátis</span>
                        : <p className="text-xl font-bold text-indigo-600">{(tier.priceLamports.toNumber() / web3.LAMPORTS_PER_SOL).toFixed(2)} SOL</p>
                }
            </div>
        </div>
    );
};