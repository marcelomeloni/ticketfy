import { web3 } from '@coral-xyz/anchor';
import { TicketIcon, XCircleIcon } from '@heroicons/react/24/solid';

// Esta página renderiza as opções de tier/preço de ingresso
export const TierOption = ({ tier, isSelected, isSoldOut, onSelect }) => {
    
    // ✅ CORREÇÃO CRÍTICA: Converte o valor HEX (ex: '0bb8') para Decimal (ex: 3000 em centavos).
    const hexPriceString = tier?.priceBrlCents || '0';
    const priceInCents = parseInt(hexPriceString, 16) || 0; 
    const priceInBRL = priceInCents / 100;

    // O ingresso só é grátis se o valor decimal for exatamente 0.
    const isFree = priceInCents === 0;

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
            minimumFractionDigits: 2,
        }).format(amount);
    };

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
                            {/* Exibe quantos foram vendidos (tier.ticketsSold) */}
                            {tier.maxTicketsSupply - tier.ticketsSold} ingressos restantes
                            <span className="text-xs text-slate-400 ml-1">({tier.ticketsSold}/{tier.maxTicketsSupply} vendidos)</span>
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
                                {/* Exibe o preço formatado em BRL */}
                                {formatCurrency(priceInBRL)}
                            </p>
                            <p className="text-sm text-slate-500">Valor do Ingresso</p> 
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
