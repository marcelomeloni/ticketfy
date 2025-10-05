import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabaseClient'; 
import { exportToCsv } from '@/lib/csvExporter';
import { ParticipantTable } from './ParticipantTable';
import { ArrowDownTrayIcon, UserGroupIcon } from '@heroicons/react/24/outline';
import { ActionButton } from '@/components/ui/ActionButton';
import { AdminCard } from '@/components/ui/AdminCard';

export const ParticipantsList = ({ eventAddress, eventName }) => {
    const [participants, setParticipants] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchParticipants = useCallback(async () => {
        if (!eventAddress) return;
        setLoading(true);
        try {
            console.log(`[DEBUG] Buscando registros para o evento: ${eventAddress}`);

            const { data: registrations, error } = await supabase
                .from('registrations')
                .select(`
                    registration_details,
                    profiles (
                        name,
                        wallet_address
                    )
                `)
                .eq('event_address', eventAddress);

            if (error) throw error;

            // --- PONTO DE VERIFICAÇÃO 1 ---
            console.log('[DEBUG] Dados brutos recebidos do Supabase:', registrations);

            if (!registrations || registrations.length === 0) {
                console.log('[DEBUG] Nenhum registro encontrado. A lista ficará vazia.');
                setParticipants([]);
                return;
            }

            const formattedParticipants = registrations.map((reg, index) => ({
                id: index,
                participantDetails: reg.registration_details,
                buyerProfile: reg.profiles,
            }));

            // --- PONTO DE VERIFICAÇÃO 2 ---
            console.log('[DEBUG] Dados formatados para a tabela:', formattedParticipants);

            setParticipants(formattedParticipants);

        } catch (error) {
            console.error("Erro detalhado ao buscar participantes:", error);
            toast.error("Não foi possível carregar a lista de participantes.");
        } finally {
            setLoading(false);
        }
    }, [eventAddress]);

    useEffect(() => {
        fetchParticipants();
    }, [fetchParticipants]);

    const handleExport = () => {
        const dataToExport = participants.map(p => ({
            nome_participante: p.participantDetails?.name ?? '',
            email_participante: p.participantDetails?.email ?? '',
            telefone_participante: p.participantDetails?.phone ?? '',
            empresa: p.participantDetails?.company ?? '',
            setor: p.participantDetails?.sector ?? '',
            cargo: p.participantDetails?.role ?? '',
            comprador: p.buyerProfile?.name ?? 'N/A',
            carteira_comprador: p.buyerProfile?.wallet_address ?? 'N/A',
        }));

        // --- PONTO DE VERIFICAÇÃO 3 ---
        console.log('[DEBUG] Dados sendo enviados para o exportador CSV:', dataToExport);
        
        if (dataToExport.length === 0) {
            toast.error("Não há dados para exportar.");
            return;
        }

        exportToCsv(dataToExport, `${eventName}-participantes`);
    };

    return (
        <AdminCard title="Lista de Participantes" icon={UserGroupIcon}>
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-4">
                <p className="text-sm text-slate-500">Veja todos os ingressos vendidos e os dados de cada participante.</p>
                <ActionButton 
                    onClick={handleExport}
                    disabled={loading || participants.length === 0}
                    className="bg-green-600 hover:bg-green-700 w-full sm:w-auto flex-shrink-0"
                >
                    <ArrowDownTrayIcon className="h-5 w-5 mr-2" />
                    Exportar CSV
                </ActionButton>
            </div>
            <ParticipantTable participants={participants} isLoading={loading} />
        </AdminCard>
    );
};