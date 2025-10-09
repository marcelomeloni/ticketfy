// hooks/useTicketCalculations.js
import { useMemo } from 'react';

export const useTicketCalculations = (eventAccount) => {
    return useMemo(() => {
        const getTierValue = (value) => {
            if (!value) return 0;
            
            if (typeof value === 'object' && value.toNumber) {
                return value.toNumber();
            }
            
            if (typeof value === 'string') {
                const cleanValue = value.replace(/^0+/, '') || '0';
                
                // Detecta hexadecimal (apenas caracteres hex)
                if (/^[0-9A-Fa-f]+$/.test(cleanValue)) {
                    return parseInt(cleanValue, 16);
                }
                
                const numericValue = Number(value);
                return isNaN(numericValue) ? 0 : numericValue;
            }
            
            return Number(value) || 0;
        };

        const totalTicketsSold = eventAccount?.tiers?.reduce((total, tier) => {
            return total + getTierValue(tier.ticketsSold);
        }, 0) || 0;

        const maxTotalSupply = eventAccount?.tiers?.reduce((total, tier) => {
            return total + getTierValue(tier.maxTicketsSupply);
        }, 0) || 0;

        return {
            totalTicketsSold,
            maxTotalSupply,
            getTierValue
        };
    }, [eventAccount]);
};