// hooks/useUserRegistrations.js
import { useState, useEffect } from 'react';
import { useAppWallet } from './useAppWallet';
import { supabase } from '@/lib/supabaseClient';

export const useUserRegistrations = () => {
    const { publicKey, connected } = useAppWallet();
    const [registrations, setRegistrations] = useState([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        const fetchUserRegistrations = async () => {
            if (!publicKey || !connected) {
                setRegistrations([]);
                return;
            }

            setIsLoading(true);
            try {
                console.log('[REGISTRATIONS] Buscando registros para:', publicKey.toString());
                
                // Busca o profile_id baseado no wallet_address
                const { data: profile, error: profileError } = await supabase
                    .from('profiles')
                    .select('id')
                    .eq('wallet_address', publicKey.toString())
                    .single();

                if (profileError || !profile) {
                    console.log('[REGISTRATIONS] Perfil não encontrado');
                    setRegistrations([]);
                    return;
                }

                // Busca todos os registrations desse usuário
                const { data: userRegistrations, error: regError } = await supabase
                    .from('registrations')
                    .select('*')
                    .eq('profile_id', profile.id);

                if (regError) {
                    console.error('[REGISTRATIONS] Erro ao buscar registrations:', regError);
                    setRegistrations([]);
                    return;
                }

                console.log('[REGISTRATIONS] Registros encontrados:', userRegistrations?.length || 0);
                setRegistrations(userRegistrations || []);

            } catch (error) {
                console.error('[REGISTRATIONS] Erro geral:', error);
                setRegistrations([]);
            } finally {
                setIsLoading(false);
            }
        };

        fetchUserRegistrations();
    }, [publicKey, connected]);

    return { registrations, isLoading };
};
