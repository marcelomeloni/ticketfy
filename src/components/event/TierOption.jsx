import { TicketIcon, XCircleIcon } from '@heroicons/react/24/solid';

export const TierOption = ({ tier, isSelected, isSoldOut, onSelect }) => {
    
    // Função auxiliar para converter valores que podem vir como BN, hex ou número
const getTierValue = (value) => {
    if (!value) return 0;
    
    // Se for objeto Anchor/BigNumber
    if (typeof value === 'object' && value.toNumber) {
        return value.toNumber();
    }
    
    // Se for string
    if (typeof value === 'string') {
        // Remove zeros à esquerda para análise
        const cleanValue = value.replace(/^0+/, '') || '0';
        
        // ✅ CORREÇÃO: Detecta se é hexadecimal (apenas caracteres 0-9, A-F)
        if (/^[0-9A-Fa-f]+$/.test(cleanValue)) {
            const decimalValue = parseInt(cleanValue, 16);
            return decimalValue;
        }
        
        // Se não for hexadecimal, tenta como número decimal
        const numericValue = Number(value);
        return isNaN(numericValue) ? 0 : numericValue;
    }
    
    // Valor numérico direto
    return Number(value) || 0;
};


    const priceInCents = getTierValue(tier.priceBrlCents);
    const ticketsSold = getTierValue(tier.ticketsSold);
    const maxTickets = getTierValue(tier.maxTicketsSupply);
    const priceInBRL = priceInCents / 100;
    const isFree = priceInCents === 0;
    const ticketsRemaining = maxTickets - ticketsSold;

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
                            {ticketsRemaining} ingressos restantes
                            <span className="text-xs text-slate-400 ml-1">
                                ({ticketsSold}/{maxTickets} vendidos)
                            </span>
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

