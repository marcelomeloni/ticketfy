import { useState, useMemo, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useConnection, useAnchorWallet } from '@solana/wallet-adapter-react';
import { Program, AnchorProvider, web3, BN } from '@coral-xyz/anchor';
import toast from 'react-hot-toast';
import { ParticipantsList } from '@/components/event/manage/ParticipantsList'; 
import idl from '@/idl/ticketing_system.json';
import {
    BanknotesIcon, CalendarDaysIcon, ChartBarIcon, ClockIcon, ExclamationTriangleIcon, PlusCircleIcon, TicketIcon, UserPlusIcon, XCircleIcon, ShareIcon, ClipboardDocumentIcon
} from '@heroicons/react/24/outline';
import { PROGRAM_ID, API_URL } from '@/lib/constants';
// Supondo que estes componentes de UI existam em seus respectivos arquivos
import { AdminCard } from '@/components/ui/AdminCard';
import { InputField } from '@/components/ui/InputField';
import { ActionButton } from '@/components/ui/ActionButton';
import { Spinner } from '@/components/ui/Spinner';

const PROGRAM_ADDRESS = "6BpG2uYeLSgHEynoT7VrNb6BpHSiwXPyayvECgCaizL5";
const REFUND_RESERVE_SEED = Buffer.from("refund_reserve");

// Helper para formatar datas
const formatDate = (timestamp) => {
    const options = {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'America/Sao_Paulo' 
    };
    return new Date(timestamp * 1000).toLocaleString('pt-BR', options);
};

// Helper para status de vendas
const getSaleStatus = (event) => {
    if (!event) return { text: "Carregando...", color: "bg-gray-200" };
    if (event.canceled) return { text: "Cancelado", color: "bg-red-200 text-red-900" };
    const now = Math.floor(Date.now() / 1000);
    if (now > event.salesEndDate.toNumber()) return { text: "Finalizado", color: "bg-blue-200 text-blue-900" };
    if (now < event.salesStartDate.toNumber()) return { text: "Vendas em Breve", color: "bg-yellow-200 text-yellow-900" };
    return { text: "Vendas Abertas", color: "bg-green-200 text-green-900" };
};

export function ManageEvent() {
    const { eventAddress } = useParams();
    const { connection } = useConnection();
    const wallet = useAnchorWallet();

    const [event, setEvent] = useState(null);
    const [metadata, setMetadata] = useState(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [reserveBalance, setReserveBalance] = useState(0);
    const [validatorAddress, setValidatorAddress] = useState('');
    const [newTier, setNewTier] = useState({ name: '', price: '', maxTicketsSupply: '' });

    const program = useMemo(() => {
        if (!wallet) return null;
        const provider = new AnchorProvider(connection, wallet, AnchorProvider.defaultOptions());
        return new Program(idl, PROGRAM_ID, provider);
    }, [connection, wallet]);

    const fetchEventData = useCallback(async () => {
        if (!program || !eventAddress) return;
        try {
            const eventPubkey = new web3.PublicKey(eventAddress);
            const eventAccount = await program.account.event.fetch(eventPubkey);
            setEvent(eventAccount);

            if (eventAccount.metadataUri) {
                const response = await fetch(eventAccount.metadataUri);
                if (response.ok) {
                    const data = await response.json();
                    setMetadata(data);
                } else {
                    setMetadata({ name: "Nome do Evento Indisponível" });
                }
            }

            const [refundReservePda] = web3.PublicKey.findProgramAddressSync(
                [REFUND_RESERVE_SEED, eventPubkey.toBuffer()],
                program.programId
            );
            const balance = await connection.getBalance(refundReservePda);
            setReserveBalance(balance);

        } catch (error) {
            console.error("Erro ao buscar dados do evento:", error);
            toast.error("Não foi possível carregar os dados do evento.");
        }
    }, [program, eventAddress, connection]);

    useEffect(() => {
        setLoading(true);
        fetchEventData().finally(() => setLoading(false));
    }, [fetchEventData]);

    const handleTransaction = async (methodBuilder, successMessage) => {
        setActionLoading(true);
        const loadingToast = toast.loading("Processando transação...");
        try {
            const tx = await methodBuilder.rpc();
            toast.success(successMessage, { id: loadingToast });
            await fetchEventData();
        } catch (error) {
            console.error("Erro na transação:", error);
            const errorMessage = error.error?.errorMessage || error.message || 'Falha na transação.';
            toast.error(`Erro: ${errorMessage}`, { id: loadingToast });
        } finally {
            setActionLoading(false);
        }
    };

    const handleAddTier = () => {
        if (!program || !wallet || !newTier.name || !newTier.price || !newTier.maxTicketsSupply) {
            return toast.error("Preencha todos os campos do novo lote.");
        }
        const method = program.methods
            .addTicketTier(
                newTier.name,
                new BN(parseFloat(newTier.price) * web3.LAMPORTS_PER_SOL),
                parseInt(newTier.maxTicketsSupply, 10)
            )
            .accounts({ event: new web3.PublicKey(eventAddress), controller: wallet.publicKey });
        handleTransaction(method, "Novo lote adicionado com sucesso!");
        setNewTier({ name: '', price: '', maxTicketsSupply: '' });
    };
    
    const handleAddValidator = () => {
        if (!program || !wallet || !validatorAddress) return;
        try {
            const method = program.methods
                .addValidator(new web3.PublicKey(validatorAddress))
                .accounts({ event: new web3.PublicKey(eventAddress), controller: wallet.publicKey });
            handleTransaction(method, "Validador adicionado com sucesso!");
            setValidatorAddress('');
        } catch(e) { toast.error("Endereço de carteira inválido.") }
    };
    
    const handleRemoveValidator = (addressToRemove) => {
        if (!program || !wallet) return;
        const method = program.methods
            .removeValidator(new web3.PublicKey(addressToRemove))
            .accounts({ event: new web3.PublicKey(eventAddress), controller: wallet.publicKey });
        handleTransaction(method, "Validador removido com sucesso!");
    };

    const handleCancelEvent = () => {
        if (!program || !wallet) return;
        if (!window.confirm("Tem certeza que deseja cancelar este evento? Esta ação é irreversível e habilitará reembolsos.")) return;
        const method = program.methods
            .cancelEvent()
            .accounts({ event: new web3.PublicKey(eventAddress), controller: wallet.publicKey });
        handleTransaction(method, "Evento cancelado com sucesso!");
    };
    
    const handleWithdraw = async () => {
        if (!program || !wallet) return;
        const method = program.methods.withdrawFunds().accounts({
            event: new web3.PublicKey(eventAddress),
            controller: wallet.publicKey,
            refundReserve: web3.PublicKey.findProgramAddressSync(
                [REFUND_RESERVE_SEED, (new web3.PublicKey(eventAddress)).toBuffer()],
                program.programId
            )[0],
            systemProgram: web3.SystemProgram.programId,
        });
        handleTransaction(method, "Fundos sacados com sucesso!");
    };
    
    if (loading) return <div className="flex justify-center py-20"><Spinner /></div>;
    if (!event) return <div className="text-center text-red-500 py-20">Erro: Evento não encontrado.</div>;

    const totalTicketsSold = event.totalTicketsSold || 0;
    const totalSupply = Array.isArray(event.tiers) ? event.tiers.reduce((sum, tier) => sum + tier.maxTicketsSupply, 0) : 0;
    const now = Math.floor(Date.now() / 1000);
    const canWithdraw = !event.canceled && now > event.salesEndDate.toNumber() && reserveBalance > 0;
    const canAddTiers = !event.canceled && now <= event.salesEndDate.toNumber();
    const validatorLink = `${window.location.origin}/event/${eventAddress}/validate`;

    const handleCopyLink = () => {
        navigator.clipboard.writeText(validatorLink);
        toast.success("Link para validadores copiado!");
    };

    return (
        <div className="container mx-auto px-4 py-12 bg-slate-50 min-h-screen">
            <header className="mb-8">
                <Link to="/create-event" className="text-sm text-indigo-600 hover:underline mb-4 block">&larr; Voltar para Meus Eventos</Link>
                <div className="flex flex-wrap items-center gap-4">
                    <h1 className="text-4xl font-bold text-slate-900">{metadata?.name || "Carregando nome..."}</h1>
                    <span className={`px-3 py-1 text-sm font-semibold rounded-full ${getSaleStatus(event).color}`}>{getSaleStatus(event).text}</span>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <StatCard 
                    icon={BanknotesIcon} 
                    title="Receita em Custódia" 
                    value={`${(reserveBalance / web3.LAMPORTS_PER_SOL).toFixed(4)} SOL`}
                    color="text-green-600"
                />
                <StatCard 
                    icon={TicketIcon} 
                    title="Ingressos Vendidos" 
                    value={`${totalTicketsSold} / ${totalSupply}`}
                    color="text-indigo-600"
                />
                <StatCard 
                    icon={ChartBarIcon} 
                    title="Progresso de Vendas" 
                    value={`${totalSupply > 0 ? ((totalTicketsSold / totalSupply) * 100).toFixed(1) : 0}%`}
                    color="text-blue-600"
                />
                <StatCard 
                    icon={ClockIcon} 
                    title="Fim das Vendas" 
                    value={formatDate(event.salesEndDate.toNumber())}
                    color="text-orange-600"
                />
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                
                    <AdminCard title="Vendas por Lote">
                        <div className="space-y-4">
                            {Array.isArray(event.tiers) && event.tiers.map((tier, index) => (
                                <TierProgress key={index} tier={tier} />
                            ))}
                        </div>
                    </AdminCard>
                    
                    <AdminCard title="Adicionar Novo Lote" icon={PlusCircleIcon}>
                         {canAddTiers ? (
                             <div className="space-y-4">
                                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                     <InputField label="Nome do Lote" placeholder="Ex: Lote 2" value={newTier.name} onChange={e => setNewTier({...newTier, name: e.target.value})} />
                                     <InputField label="Preço (SOL)" type="number" placeholder="1.5" value={newTier.price} onChange={e => setNewTier({...newTier, price: e.target.value})} />
                                     <InputField label="Quantidade" type="number" placeholder="500" value={newTier.maxTicketsSupply} onChange={e => setNewTier({...newTier, maxTicketsSupply: e.target.value})} />
                                 </div>
                                 <ActionButton onClick={handleAddTier} loading={actionLoading}>Adicionar Lote</ActionButton>
                             </div>
                         ) : (
                             <p className="text-sm text-slate-500">Não é possível adicionar novos lotes a um evento que já teve suas vendas encerradas ou foi cancelado.</p>
                         )}
                    </AdminCard>
                    <ParticipantsList 
                        program={program} 
                        eventAddress={eventAddress}
                        eventName={metadata?.name || 'evento'}
                    />
                </div>

                <div className="space-y-8">
                    <AdminCard title="Financeiro" icon={BanknotesIcon}>
                        <p className="text-sm text-slate-600 mb-2">Saldo em custódia disponível para saque após o término do evento.</p>
                        <p className="text-3xl font-bold text-slate-800 mb-4">
                            {(reserveBalance / web3.LAMPORTS_PER_SOL).toFixed(4)} SOL
                        </p>
                        <ActionButton onClick={handleWithdraw} loading={actionLoading} disabled={!canWithdraw} className="w-full">
                            Sacar Fundos
                        </ActionButton>
                        {!canWithdraw && <p className="text-xs text-center mt-2 text-slate-500">O saque estará disponível após {formatDate(event.salesEndDate.toNumber())}.</p>}
                    </AdminCard>
                    
                    <AdminCard title="Gerenciar Validadores" icon={UserPlusIcon}>
                        <div className="space-y-4">
                            <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
                                <label className="text-sm font-semibold text-indigo-800 flex items-center gap-2">
                                    <ShareIcon className="h-5 w-5" />
                                    Link para Validadores
                                </label>
                                <p className="text-xs text-indigo-700 mt-1 mb-2">Envie este link para a equipe que fará o check-in no dia do evento.</p>
                                <div className="flex items-center gap-2">
                                    <input 
                                        type="text" 
                                        readOnly 
                                        value={validatorLink} 
                                        className="w-full text-xs font-mono bg-white border-slate-300 rounded-md shadow-sm"
                                    />
                                    <button onClick={handleCopyLink} className="p-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 flex-shrink-0">
                                        <ClipboardDocumentIcon className="h-5 w-5" />
                                    </button>
                                </div>
                            </div>

                            <div>
                                <InputField label="Endereço da Carteira" value={validatorAddress} onChange={e => setValidatorAddress(e.target.value)} placeholder="Cole o endereço da carteira aqui" />
                                <ActionButton onClick={handleAddValidator} loading={actionLoading} className="mt-2 w-full">Adicionar Validador</ActionButton>
                            </div>
                            <div className="space-y-2">
                                <h4 className="text-sm font-semibold text-slate-600 pt-2 border-t">Validadores Atuais:</h4>
                                {Array.isArray(event.validators) && event.validators.length > 0 ? (
                                    event.validators.map(v => (
                                        <div key={v.toString()} className="flex items-center justify-between bg-slate-100 p-2 rounded">
                                            <p className="text-xs font-mono break-all pr-2">{v.toString()}</p>
                                            <button onClick={() => handleRemoveValidator(v.toString())} className="text-red-500 hover:text-red-700 flex-shrink-0" disabled={actionLoading}>
                                                <XCircleIcon className="h-5 w-5"/>
                                            </button>
                                        </div>
                                    ))
                                ) : <p className="text-sm text-slate-500">Nenhum validador cadastrado.</p>}
                            </div>
                        </div>
                    </AdminCard>
                    
                    <AdminCard title="Zona de Perigo" icon={ExclamationTriangleIcon}>
    <p className="text-sm text-slate-600 mb-4">Cancelar o evento é uma ação irreversível e habilitará reembolsos.</p>
   
    <ActionButton 
        onClick={handleCancelEvent} 
        loading={actionLoading} 
        disabled={event.canceled} 
        className="w-full bg-red-600 hover:bg-red-700 disabled:bg-red-300 flex items-center justify-center"
    >
        <XCircleIcon className="h-5 w-5 mr-2"/>
        {event.canceled ? 'Evento Já Cancelado' : 'Cancelar Evento'}
    </ActionButton>
</AdminCard>
                </div>
            </div>
        </div>
    );
}

// Componentes Auxiliares
const StatCard = ({ icon: Icon, title, value, color }) => (
    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-start space-x-4">
        <div className={`p-3 rounded-lg bg-indigo-100 ${color}`}>
             <Icon className="h-6 w-6" />
        </div>
        <div>
            <p className="text-sm font-medium text-slate-500">{title}</p>
            <p className="text-2xl font-bold text-slate-900">{value}</p>
        </div>
    </div>
);

const TierProgress = ({ tier }) => {
    const progress = tier.maxTicketsSupply > 0 ? (tier.ticketsSold / tier.maxTicketsSupply) * 100 : 0;
    const revenue = (tier.ticketsSold * tier.priceLamports.toNumber()) / web3.LAMPORTS_PER_SOL;
    return (
        <div className="p-4 border rounded-lg bg-slate-50">
            <div className="flex justify-between items-center mb-2">
                <div>
                    <p className="font-bold text-slate-800">{tier.name}</p>
                    <p className="text-xs text-slate-500">
                        Preço: {(tier.priceLamports.toNumber() / web3.LAMPORTS_PER_SOL).toFixed(2)} SOL
                    </p>
                </div>
                <div className="text-right">
                    <p className="font-semibold text-indigo-600">{tier.ticketsSold} / {tier.maxTicketsSupply}</p>
                    <p className="text-xs text-slate-500">Receita: {revenue.toFixed(2)} SOL</p>
                </div>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2">
                <div className="bg-indigo-500 h-2 rounded-full" style={{ width: `${progress}%` }}></div>
            </div>
        </div>
    );
};
