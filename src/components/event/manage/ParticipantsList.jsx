import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabaseClient'; 
import { exportToCsv } from '@/lib/csvExporter';
import { ParticipantTable } from './ParticipantTable';
import { ArrowDownTrayIcon, UserGroupIcon } from '@heroicons/react/24/outline';
import { ActionButton } from '@/components/ui/ActionButton';
import { AdminCard } from '@/components/ui/AdminCard';

export const ParticipantsList = ({ program, eventAddress, eventName }) => {
    const [participants, setParticipants] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchParticipants = useCallback(async () => {
        if (!program || !eventAddress) return;
        setLoading(true);
        try {
            const allTickets = await program.account.ticket.all([
                { memcmp: { offset: 8, bytes: eventAddress } }
            ]);

            if (allTickets.length === 0) {
                setParticipants([]);
                return;
            }

            const ownerAddresses = [...new Set(allTickets.map(t => t.account.owner.toString()))];

            const { data: profiles, error: supabaseError } = await supabase
                .from('user_profiles')
                .select('name, email, phone, company, sector, role, wallet_address')
                .in('wallet_address', ownerAddresses);

            if (supabaseError) throw supabaseError;

            setParticipants(profiles);

        } catch (error) {
            console.error("Erro ao buscar participantes:", error);
            toast.error("Não foi possível carregar a lista de participantes.");
        } finally {
            setLoading(false);
        }
    }, [program, eventAddress]);

    useEffect(() => {
        fetchParticipants();
    }, [fetchParticipants]);

    return (
        <AdminCard title="Lista de Participantes" icon={UserGroupIcon}>
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-4">
                <p className="text-sm text-slate-500">Veja todos os usuários que adquiriram ingressos para o seu evento.</p>
                <ActionButton 
                    onClick={() => exportToCsv(participants, eventName)}
                    disabled={loading || participants.length === 0}
                    className="bg-green-600 hover:bg-green-700 w-full sm:w-auto flex-shrink-0 flex items-center justify-center"
                >
                    <ArrowDownTrayIcon className="h-5 w-5 mr-2" />
                    Exportar CSV
                </ActionButton>
            </div>
            <ParticipantTable participants={participants} isLoading={loading} />
        </AdminCard>
    );
};