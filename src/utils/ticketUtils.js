// utils/ticketUtils.js
import { supabase } from '@/lib/supabaseClient';

/**
 * Busca registrationId para um mint_address específico
 */
export const getRegistrationIdByMint = async (mintAddress, walletAddress) => {
    if (!mintAddress || !walletAddress) {
        console.log('[TICKET_UTILS] Mint address ou wallet address não fornecidos');
        return null;
    }

    try {
        console.log(`[TICKET_UTILS] Buscando registrationId para mint: ${mintAddress}`);
        
        // Busca o profile do usuário
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('id')
            .eq('wallet_address', walletAddress)
            .maybeSingle();

        if (profileError || !profile) {
            console.error('[TICKET_UTILS] Erro ao buscar perfil:', profileError);
            return null;
        }

        // Busca o registration específico para este mint_address
        const { data: registration, error: regError } = await supabase
            .from('registrations')
            .select('id')
            .eq('mint_address', mintAddress)
            .eq('profile_id', profile.id)
            .maybeSingle();

        if (regError) {
            console.error('[TICKET_UTILS] Erro ao buscar registration:', regError);
            return null;
        }

        console.log(`[TICKET_UTILS] RegistrationId encontrado: ${registration?.id || 'NÃO ENCONTRADO'}`);
        return registration?.id || null;

    } catch (error) {
        console.error('[TICKET_UTILS] Erro geral:', error);
        return null;
    }
};
