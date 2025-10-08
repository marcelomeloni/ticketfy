// hooks/useUserRegistrations.js
import { useState, useEffect } from 'react';
import { useAppWallet } from './useAppWallet';
import { supabase } from '@/lib/supabaseClient';

export const useUserRegistrations = () => {
    const { publicKey, connected } = useAppWallet();
    const [registrations, setRegistrations] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchUserRegistrations = async () => {
            if (!publicKey || !connected) {
                setRegistrations([]);
                setError(null);
                return;
            }

            setIsLoading(true);
            setError(null);
            
            try {
                console.log('[REGISTRATIONS] Buscando registros para:', publicKey.toString());
                
                // ✅ CORREÇÃO: Buscar o profile usando o wallet_address correto
                const { data: profile, error: profileError } = await supabase
                    .from('profiles')
                    .select('id')
                    .eq('wallet_address', publicKey.toString())
                    .maybeSingle(); // ✅ Usar maybeSingle em vez de single

                if (profileError) {
                    console.error('[REGISTRATIONS] Erro ao buscar perfil:', profileError);
                    setError(profileError);
                    setRegistrations([]);
                    return;
                }

                if (!profile) {
                    console.log('[REGISTRATIONS] Perfil não encontrado para esta carteira');
                    setRegistrations([]);
                    return;
                }

                console.log('[REGISTRATIONS] Perfil encontrado, ID:', profile.id);

                // ✅ CORREÇÃO: Buscar registrations com query mais robusta
                const { data: userRegistrations, error: regError } = await supabase
                    .from('registrations')
                    .select('*')
                    .eq('profile_id', profile.id);

                if (regError) {
                    console.error('[REGISTRATIONS] Erro ao buscar registrations:', regError);
                    setError(regError);
                    setRegistrations([]);
                    return;
                }

                console.log('[REGISTRATIONS] Registros encontrados:', userRegistrations?.length || 0);
                setRegistrations(userRegistrations || []);

            } catch (error) {
                console.error('[REGISTRATIONS] Erro geral:', error);
                setError(error);
                setRegistrations([]);
            } finally {
                setIsLoading(false);
            }
        };

        fetchUserRegistrations();
    }, [publicKey, connected]);

    return { registrations, isLoading, error };
};
