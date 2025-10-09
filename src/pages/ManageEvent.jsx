import { useState, useMemo, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useConnection, useWallet as useSolanaWallet } from '@solana/wallet-adapter-react';
import { Program, AnchorProvider, web3, BN } from '@coral-xyz/anchor';
import toast from 'react-hot-toast';
import { ParticipantsList } from '@/components/event/manage/ParticipantsList'; 
import idl from '@/idl/ticketing_system.json';
import {
    BanknotesIcon, CalendarDaysIcon, ChartBarIcon, ClockIcon, 
    ExclamationTriangleIcon, PlusCircleIcon, TicketIcon, 
    UserPlusIcon, XCircleIcon, ShareIcon, ClipboardDocumentIcon
} from '@heroicons/react/24/outline';
import { PROGRAM_ID, API_URL } from '@/lib/constants';
import { AdminCard } from '@/components/ui/AdminCard';
import { InputField } from '@/components/ui/InputField';
import { ActionButton } from '@/components/ui/ActionButton';
import { Spinner } from '@/components/ui/Spinner';
import { useAuth } from '@/contexts/AuthContext';

// Helper para formatar datas
const formatDate = (timestamp) => {
    if (!timestamp) return 'Data indisponível';
    const date = new Date(timestamp * 1000);
    const options = {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'America/Sao_Paulo' 
    };
    return date.toLocaleString('pt-BR', options);
};

// Helper para status de vendas
const getSaleStatus = (event) => {
    if (!event) return { text: "Carregando...", color: "bg-gray-200" };
    if (event.canceled) return { text: "Cancelado", color: "bg-red-200 text-red-900" };
    const now = Math.floor(Date.now() / 1000);
    if (now > event.salesEndDate) return { text: "Finalizado", color: "bg-blue-200 text-blue-900" };
    if (now < event.salesStartDate) return { text: "Vendas em Breve", color: "bg-yellow-200 text-yellow-900" };
    return { text: "Vendas Abertas", color: "bg-green-200 text-green-900" };
};

export function ManageEvent() {
    const { eventAddress } = useParams();
    const { connection } = useConnection();
    const navigate = useNavigate();
    
    // ✅ DUAS FONTES DE AUTENTICAÇÃO
    const { publicKey: authPublicKey, keypair, isAuthenticated: authAuthenticated, isLoading: authLoading } = useAuth();
    const { publicKey: walletPublicKey, connected: walletConnected, wallet: solanaWallet, signTransaction: walletSignTransaction, signAllTransactions: walletSignAllTransactions } = useSolanaWallet();

    // ✅ ESTADOS - DEFINIR TODOS OS ESTADOS NO TOPO
    const [event, setEvent] = useState(null);
    const [metadata, setMetadata] = useState(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false); 
    const [reserveBalance, setReserveBalance] = useState(0);
    const [validatorAddress, setValidatorAddress] = useState('');
    const [newTier, setNewTier] = useState({ name: '', price: '', maxTicketsSupply: '' });
    const [apiError, setApiError] = useState(null);


    const activeAuth = useMemo(() => {
        if (walletConnected && walletPublicKey) {
            console.log('🔗 Usando wallet externa:', walletPublicKey.toString());
            return {
                type: 'wallet',
                publicKey: walletPublicKey,
                connected: true,
                wallet: solanaWallet
            };
        } else if (authAuthenticated && authPublicKey) {
            console.log('🔐 Usando autenticação local:', authPublicKey.toString());
            return {
                type: 'auth',
                publicKey: authPublicKey,
                connected: true,
                keypair: keypair
            };
        } else {
            console.log('❌ Nenhuma autenticação ativa');
            return {
                type: 'none',
                publicKey: null,
                connected: false
            };
        }
    }, [walletConnected, walletPublicKey, authAuthenticated, authPublicKey, keypair, solanaWallet]);

    // ✅ WALLET COMPATÍVEL COM ANCHOR (para ambas as fontes)
    const wallet = useMemo(() => {
        if (!activeAuth.connected || !activeAuth.publicKey) return null;
        
        if (activeAuth.type === 'wallet') {
            // Wallet externa (Phantom, Solflare, etc)
            return {
                publicKey: activeAuth.publicKey,
                signTransaction: walletSignTransaction,
                signAllTransactions: walletSignAllTransactions
            };
        } else if (activeAuth.type === 'auth' && activeAuth.keypair) {
            // Autenticação local
            return {
                publicKey: activeAuth.publicKey,
                signTransaction: async (transaction) => {
                    transaction.partialSign(activeAuth.keypair);
                    return transaction;
                },
                signAllTransactions: async (transactions) => {
                    return transactions.map(transaction => {
                        transaction.partialSign(activeAuth.keypair);
                        return transaction;
                    });
                }
            };
        }
        
        return null;
    }, [activeAuth, walletSignTransaction, walletSignAllTransactions]);

    // ✅ FUNÇÕES GASLESS PARA USUÁRIOS SEM WALLET
    const handleAddValidatorGasless = async () => {
        if (!validatorAddress) {
            return toast.error("Digite um endereço de carteira válido.");
        }
    
        setActionLoading(true);
        const loadingToast = toast.loading("Adicionando validador via API...");
    
        try {
         
            const userLoginData = localStorage.getItem('solana-local-wallet-credentials');
            
            if (!userLoginData) {
                toast.error("Dados de login não encontrados. Faça login novamente.", { id: loadingToast });
                setActionLoading(false);
                return;
            }
    
            console.log('📤 Enviando dados para API - Add Validator:', {
                eventAddress,
                userLoginData: JSON.parse(userLoginData) // Apenas para debug
            });
    
            const response = await fetch(`${API_URL}/api/events/${eventAddress}/validators/add`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    eventAddress,
                    validatorAddress,
                    userLoginData: userLoginData 
                })
            });
    
            const result = await response.json();
    
            if (result.success) {
                toast.success("Validador adicionado com sucesso via API!", { id: loadingToast });
                await fetchEventData();
                setValidatorAddress('');
            } else {
                toast.error(`Erro: ${result.error}`, { id: loadingToast });
            }
        } catch (error) {
            toast.error(`Erro de rede: ${error.message}`, { id: loadingToast });
        } finally {
            setActionLoading(false);
        }
    };
    
    const handleRemoveValidatorGasless = async (addressToRemove) => {
        setActionLoading(true);
        const loadingToast = toast.loading("Removendo validador via API...");
    
        try {
      
            const userLoginData = localStorage.getItem('solana-local-wallet-credentials');
            
            if (!userLoginData) {
                toast.error("Dados de login não encontrados. Faça login novamente.", { id: loadingToast });
                setActionLoading(false);
                return;
            }
    
            const response = await fetch(`${API_URL}/api/events/${eventAddress}/validators/remove`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    eventAddress,
                    validatorAddress: addressToRemove,
                    userLoginData: userLoginData 
                })
            });
    
            const result = await response.json();
    
            if (result.success) {
                toast.success("Validador removido com sucesso via API!", { id: loadingToast });
                await fetchEventData();
            } else {
                toast.error(`Erro: ${result.error}`, { id: loadingToast });
            }
        } catch (error) {
            toast.error(`Erro de rede: ${error.message}`, { id: loadingToast });
        } finally {
            setActionLoading(false);
        }
    };
    
    const handleCancelEventGasless = async () => {
        if (!window.confirm("Tem certeza que deseja cancelar este evento? Esta ação é irreversível e habilitará reembolsos.")) {
            return;
        }
    
        setActionLoading(true);
        const loadingToast = toast.loading("Cancelando evento via API...");
    
        try {
          
            const userLoginData = localStorage.getItem('solana-local-wallet-credentials');
            
            if (!userLoginData) {
                toast.error("Dados de login não encontrados. Faça login novamente.", { id: loadingToast });
                setActionLoading(false);
                return;
            }
    
            console.log('📤 Enviando dados para API - Cancel Event:', {
                eventAddress,
                userLoginData: JSON.parse(userLoginData) 
            });
    
            const response = await fetch(`${API_URL}/api/events/${eventAddress}/cancel`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    eventAddress: eventAddress,
                    userLoginData: userLoginData 
                })
            });
    
            console.log('📨 Resposta da API:', response.status);
    
            const result = await response.json();
            console.log('📊 Resultado da API:', result);
    
            if (result.success) {
                toast.success("Evento cancelado com sucesso via API!", { id: loadingToast });
                await fetchEventData();
            } else {
                toast.error(`Erro: ${result.error}`, { id: loadingToast });
            }
        } catch (error) {
            console.error('💥 Erro completo:', error);
            toast.error(`Erro de rede: ${error.message}`, { id: loadingToast });
        } finally {
            setActionLoading(false);
        }
    };

    const fetchEventData = useCallback(async () => {
        console.log('🔐 [ManageEvent] Estado da autenticação:', {
            activeAuthType: activeAuth.type,
            publicKey: activeAuth.publicKey?.toString(),
            connected: activeAuth.connected
        });

        if (!eventAddress || !activeAuth.publicKey) {
            console.log('❌ [ManageEvent] Missing eventAddress or publicKey');
            setLoading(false);
            setApiError('Carteira não conectada ou endereço do evento inválido');
            return;
        }
        
        setLoading(true);
        setEvent(null);
        setMetadata(null);
        setApiError(null);
        
        try {
            console.log(`🔍 [ManageEvent] Iniciando busca do evento: ${eventAddress}`);
            console.log(`👤 [ManageEvent] Usuário: ${activeAuth.publicKey.toString()}`);
            console.log(`🌐 [ManageEvent] API URL: ${API_URL}`);
            
            const apiUrl = `${API_URL}/api/events/manage/${eventAddress}/${activeAuth.publicKey.toString()}`;
            console.log(`📡 [ManageEvent] Chamando API: ${apiUrl}`);
            
            const response = await fetch(apiUrl);
            console.log(`📨 [ManageEvent] Resposta recebida - Status: ${response.status}`);
            
            const result = await response.json();
            console.log(`📊 [ManageEvent] Dados da API:`, result);
            
            if (result.success) {
                console.log('✅ [ManageEvent] Dados do evento carregados com sucesso');
                
                setEvent(result.event.account);
                setMetadata(result.event.metadata);
                setReserveBalance(result.event.reserveBalance);
                setApiError(null);
            } else {
                console.error('❌ [ManageEvent] Erro na API:', result.error);
                
                let errorMessage = result.error || "Erro desconhecido";
                if (response.status === 404) {
                    errorMessage = "Evento não encontrado. Verifique se o endereço está correto.";
                } else if (response.status === 403) {
                    errorMessage = "Você não tem permissão para gerenciar este evento. Apenas o criador pode acessar.";
                } else if (response.status === 400) {
                    errorMessage = "Endereço do evento inválido.";
                } else if (response.status === 500) {
                    errorMessage = "Erro interno do servidor. Tente novamente mais tarde.";
                }
                
                setApiError(errorMessage);
                toast.error(errorMessage);
                
                if (response.status === 404 || response.status === 403) {
                    setTimeout(() => navigate('/create-event'), 3000);
                }
            }
        } catch (error) {
            console.error("💥 [ManageEvent] Erro de rede:", error);
            
            const errorMessage = "Erro de conexão com o servidor. Verifique sua conexão e tente novamente.";
            setApiError(errorMessage);
            toast.error(errorMessage);
        } finally {
            setLoading(false);
        }
    }, [eventAddress, activeAuth.publicKey, navigate]);

    useEffect(() => {
        console.log('🔄 [ManageEvent] useEffect triggered');
        console.log('📍 [ManageEvent] eventAddress:', eventAddress);
        console.log('👛 [ManageEvent] activeAuth:', activeAuth);
        console.log('⏳ [ManageEvent] authLoading:', authLoading);
        
        if (activeAuth.connected && activeAuth.publicKey) {
            fetchEventData();
        } else if (!authLoading) {
            setLoading(false);
            setApiError('Usuário não autenticado. Faça login para gerenciar eventos.');
        }
    }, [fetchEventData, activeAuth, authLoading]);

    const program = useMemo(() => {
        if (!wallet) {
            console.log('❌ [ManageEvent] Wallet não disponível para criar program');
            return null;
        }
        const provider = new AnchorProvider(connection, wallet, AnchorProvider.defaultOptions());
        return new Program(idl, PROGRAM_ID, provider);
    }, [connection, wallet]);

    const handleTransaction = async (methodBuilder, successMessage) => {
        if (!program || !activeAuth.publicKey) {
            toast.error("Carteira não conectada");
            return;
        }

        setActionLoading(true);
        const loadingToast = toast.loading("Processando transação...");
        try {
            const tx = await methodBuilder.rpc();
            console.log("Transação bem-sucedida:", tx);
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
        if (!program || !activeAuth.publicKey || !newTier.name || !newTier.price || !newTier.maxTicketsSupply) {
            return toast.error("Preencha todos os campos do novo lote.");
        }
        
        const priceInCents = Math.round(parseFloat(newTier.price) * 100);
        if (isNaN(priceInCents)) {
            return toast.error("Preço inválido");
        }

        const maxSupply = parseInt(newTier.maxTicketsSupply, 10);
        if (isNaN(maxSupply)) {
            return toast.error("Quantidade inválida");
        }

        const method = program.methods
            .addTicketTier(
                newTier.name,
                new BN(priceInCents),
                maxSupply
            )
            .accounts({ 
                event: new web3.PublicKey(eventAddress), 
                controller: activeAuth.publicKey 
            });
            
        handleTransaction(method, "Novo lote adicionado com sucesso!");
        setNewTier({ name: '', price: '', maxTicketsSupply: '' });
    };
    

    const handleAddValidator = () => {
        if (activeAuth.type === 'wallet') {
            // Usuário com wallet externa - usa transação normal
            if (!program || !activeAuth.publicKey || !validatorAddress) {
                return toast.error("Digite um endereço de carteira válido.");
            }
            
            try {
                const validatorPubkey = new web3.PublicKey(validatorAddress);
                const method = program.methods
                    .addValidator(validatorPubkey)
                    .accounts({ 
                        event: new web3.PublicKey(eventAddress), 
                        controller: activeAuth.publicKey 
                    });
                handleTransaction(method, "Validador adicionado com sucesso!");
                setValidatorAddress('');
            } catch(e) { 
                toast.error("Endereço de carteira inválido.") 
            }
        } else {
            // Usuário sem wallet - usa API gasless
            handleAddValidatorGasless();
        }
    };
    
    const handleRemoveValidator = (addressToRemove) => {
        if (activeAuth.type === 'wallet') {
            // Usuário com wallet externa - usa transação normal
            if (!program || !activeAuth.publicKey) return;
            
            try {
                const validatorPubkey = new web3.PublicKey(addressToRemove);
                const method = program.methods
                    .removeValidator(validatorPubkey)
                    .accounts({ 
                        event: new web3.PublicKey(eventAddress), 
                        controller: activeAuth.publicKey 
                    });
                handleTransaction(method, "Validador removido com sucesso!");
            } catch(e) {
                toast.error("Erro ao remover validador.");
            }
        } else {
            // Usuário sem wallet - usa API gasless
            handleRemoveValidatorGasless(addressToRemove);
        }
    };

    const handleCancelEvent = () => {
        if (activeAuth.type === 'wallet') {
            // Usuário com wallet externa - usa transação normal
            if (!program || !activeAuth.publicKey) return;
            
            if (!window.confirm("Tem certeza que deseja cancelar este evento? Esta ação é irreversível e habilitará reembolsos.")) {
                return;
            }
            
            const method = program.methods
                .cancelEvent()
                .accounts({ 
                    event: new web3.PublicKey(eventAddress), 
                    controller: activeAuth.publicKey 
                });
            handleTransaction(method, "Evento cancelado com sucesso!");
        } else {
            // Usuário sem wallet - usa API gasless
            handleCancelEventGasless();
        }
    };

    const totalRevenueBrl = useMemo(() => {
        if (!event || !Array.isArray(event.tiers)) return 0;
        
        const totalCents = event.tiers.reduce((total, tier) => {
            if (!tier || typeof tier.priceBrlCents === 'undefined') return total;
            
            const priceCents = tier.priceBrlCents;
            const ticketsSold = tier.ticketsSold || 0;
            return total + (ticketsSold * priceCents);
        }, 0);
        
        return totalCents / 100;
    }, [event]);

    // ✅ LOADING MELHORADO - considerar ambos os tipos de loading
    if (authLoading || loading) {
        return (
            <div className="flex justify-center items-center h-screen">
                <div className="text-center">
                    <Spinner size="lg" />
                    <p className="mt-4 text-slate-600">
                        {authLoading ? 'Verificando autenticação...' : 'Carregando dados do evento...'}
                    </p>
                    <p className="text-sm text-slate-500 mt-2">Endereço: {eventAddress}</p>
                    <p className="text-xs text-slate-400 mt-1">
                        Tipo de autenticação: {activeAuth.type === 'wallet' ? 'Wallet Externa' : activeAuth.type === 'auth' ? 'Login Local' : 'Nenhum'}
                    </p>
                </div>
            </div>
        );
    }

    // ✅ TELA DE ERRO DE AUTENTICAÇÃO MELHORADA
    if (!activeAuth.connected || !activeAuth.publicKey) {
        return (
            <div className="container mx-auto px-4 py-12">
                <div className="text-center py-20 max-w-2xl mx-auto">
                    <div className="text-red-500 mb-6">
                        <ExclamationTriangleIcon className="h-16 w-16 mx-auto" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900 mb-4">
                        Autenticação Necessária
                    </h2>
                    <p className="text-slate-600 mb-6">
                        Você precisa conectar uma carteira ou fazer login para gerenciar eventos.
                    </p>
                    <div className="space-y-4">
                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <Link 
                                to="/login" 
                                className="inline-block px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-center"
                            >
                                Fazer Login Local
                            </Link>
                            <button 
                                onClick={() => window.location.reload()}
                                className="inline-block px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-center"
                            >
                                Conectar Wallet
                            </button>
                        </div>
                        <div className="text-xs text-slate-500 mt-4">
                            <p>Endereço do evento: {eventAddress}</p>
                            <p>Status: Não autenticado</p>
                            <p>Wallet conectada: {walletConnected ? 'Sim' : 'Não'}</p>
                            <p>Login local: {authAuthenticated ? 'Sim' : 'Não'}</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Tela de erro melhorada
    if (!event || apiError) {
        return (
            <div className="container mx-auto px-4 py-12">
                <div className="text-center py-20 max-w-2xl mx-auto">
                    <div className="text-red-500 mb-6">
                        <ExclamationTriangleIcon className="h-16 w-16 mx-auto" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900 mb-4">
                        {apiError ? "Erro ao carregar evento" : "Evento não encontrado"}
                    </h2>
                    <p className="text-slate-600 mb-6">
                        {apiError || "O evento solicitado não existe ou você não tem permissão para visualizá-lo."}
                    </p>
                    <div className="space-y-4">
                        <Link 
                            to="/create-event" 
                            className="inline-block px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                        >
                            Voltar para Meus Eventos
                        </Link>
                        <div className="text-xs text-slate-500 mt-4">
                            <p>Endereço do evento: {eventAddress}</p>
                            <p>Usuário: {activeAuth.publicKey?.toString()}</p>
                            <p>Tipo de autenticação: {activeAuth.type === 'wallet' ? 'Wallet Externa' : 'Login Local'}</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    const totalTicketsSold = event.totalTicketsSold || 0;
    const totalSupply = Array.isArray(event.tiers) 
        ? event.tiers.reduce((sum, tier) => sum + (tier.maxTicketsSupply || 0), 0) 
        : 0;
        
    const now = Math.floor(Date.now() / 1000);
    const canAddTiers = !event.canceled && now <= event.salesEndDate;
    const validatorLink = `${window.location.origin}/event/${eventAddress}/validate`;

    const handleCopyLink = () => {
        navigator.clipboard.writeText(validatorLink);
        toast.success("Link para validadores copiado!");
    };

    const solToBrl = 150;
    const reserveBalanceSOL = reserveBalance / web3.LAMPORTS_PER_SOL;
    const reserveBalanceBRL = reserveBalanceSOL * solToBrl;

    return (
        <div className="container mx-auto px-4 py-12 bg-slate-50 min-h-screen">
            {/* ✅ HEADER COM INDICAÇÃO DO TIPO DE AUTENTICAÇÃO */}
            <header className="mb-8">
                <div className="flex justify-between items-start mb-4">
                    <Link to="/create-event" className="text-sm text-indigo-600 hover:underline">
                        &larr; Voltar para Meus Eventos
                    </Link>
                    <div className="bg-slate-100 px-3 py-1 rounded-full text-xs text-slate-600">
                        {activeAuth.type === 'wallet' ? '🔗 Wallet Conectada' : '🔐 Login Local'}
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-4">
                    <h1 className="text-4xl font-bold text-slate-900">
                        {metadata?.name || "Carregando nome..."}
                    </h1>
                    <span className={`px-3 py-1 text-sm font-semibold rounded-full ${getSaleStatus(event).color}`}>
                        {getSaleStatus(event).text}
                    </span>
                </div>
                {metadata?.description && (
                    <p className="mt-2 text-slate-600 max-w-4xl">
                        {metadata.description}
                    </p>
                )}
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <StatCard 
                    icon={BanknotesIcon} 
                    title="Receita em Custódia" 
                    value={totalRevenueBrl.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    color="text-green-600"
                    subtitle={`Saldo reserva: ${reserveBalanceBRL.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`}
                />
                <StatCard 
                    icon={TicketIcon} 
                    title="Ingressos Vendidos" 
                    value={`${totalTicketsSold} / ${totalSupply}`}
                    color="text-indigo-600"
                    subtitle={`${totalSupply > 0 ? ((totalTicketsSold / totalSupply) * 100).toFixed(1) : 0}% ocupado`}
                />
                <StatCard 
                    icon={ChartBarIcon} 
                    title="Progresso de Vendas" 
                    value={`${totalSupply > 0 ? ((totalTicketsSold / totalSupply) * 100).toFixed(1) : 0}%`}
                    color="text-blue-600"
                    subtitle={`${totalTicketsSold} vendidos`}
                />
                <StatCard 
                    icon={ClockIcon} 
                    title="Fim das Vendas" 
                    value={formatDate(event.salesEndDate)}
                    color="text-orange-600"
                    subtitle={event.salesStartDate ? `Início: ${formatDate(event.salesStartDate)}` : ''}
                />
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                    <AdminCard title="Vendas por Lote">
                        <div className="space-y-4">
                            {Array.isArray(event.tiers) && event.tiers.length > 0 ? (
                                event.tiers.map((tier, index) => (
                                    <TierProgress key={index} tier={tier} />
                                ))
                            ) : (
                                <p className="text-sm text-slate-500 text-center py-4">
                                    Nenhum lote criado para este evento ainda.
                                </p>
                            )}
                        </div>
                    </AdminCard>
                    
                    <AdminCard title="Adicionar Novo Lote" icon={PlusCircleIcon}>
                         {canAddTiers ? (
                             <div className="space-y-4">
                                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                     <InputField 
                                         label="Nome do Lote" 
                                         placeholder="Ex: Lote 2" 
                                         value={newTier.name} 
                                         onChange={e => setNewTier({...newTier, name: e.target.value})} 
                                     />
                                     <InputField 
                                         label="Preço (BRL)" 
                                         type="number" 
                                         placeholder="30.00" 
                                         value={newTier.price} 
                                         onChange={e => setNewTier({...newTier, price: e.target.value})} 
                                     />
                                     <InputField 
                                         label="Quantidade" 
                                         type="number" 
                                         placeholder="500" 
                                         value={newTier.maxTicketsSupply} 
                                         onChange={e => setNewTier({...newTier, maxTicketsSupply: e.target.value})} 
                                     />
                                 </div>
                                 <ActionButton 
                                     onClick={handleAddTier} 
                                     loading={actionLoading}
                                     disabled={!newTier.name || !newTier.price || !newTier.maxTicketsSupply}
                                 >
                                     Adicionar Lote
                                 </ActionButton>
                             </div>
                         ) : (
                             <p className="text-sm text-slate-500 text-center py-4">
                                 Não é possível adicionar novos lotes a um evento que já teve suas vendas encerradas ou foi cancelado.
                             </p>
                         )}
                     </AdminCard>

                    <ParticipantsList 
                        program={program} 
                        eventAddress={eventAddress}
                        eventName={metadata?.name || 'Evento'}
                    />
                </div>

                <div className="space-y-8">
                    <AdminCard title="Gerenciar Validadores" icon={UserPlusIcon}>
                        <div className="space-y-4">
                            <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
                                <label className="text-sm font-semibold text-indigo-800 flex items-center gap-2">
                                    <ShareIcon className="h-5 w-5" />
                                    Link para Validadores
                                </label>
                                <p className="text-xs text-indigo-700 mt-1 mb-2">
                                    Envie este link para a equipe que fará o check-in no dia do evento.
                                </p>
                                <div className="flex items-center gap-2">
                                    <input 
                                        type="text" 
                                        readOnly 
                                        value={validatorLink} 
                                        className="w-full text-xs font-mono bg-white border-slate-300 rounded-md shadow-sm p-2"
                                    />
                                    <button 
                                        onClick={handleCopyLink} 
                                        className="p-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 flex-shrink-0 transition-colors"
                                    >
                                        <ClipboardDocumentIcon className="h-5 w-5" />
                                    </button>
                                </div>
                            </div>
                            
                            <div>
                                <InputField 
                                    label="Endereço da Carteira" 
                                    value={validatorAddress} 
                                    onChange={e => setValidatorAddress(e.target.value)} 
                                    placeholder="Cole o endereço da carteira aqui" 
                                />
                                <ActionButton 
                                    onClick={handleAddValidator} 
                                    loading={actionLoading} 
                                    className="mt-2 w-full"
                                    disabled={!validatorAddress}
                                >
                                    Adicionar Validador
                                </ActionButton>
                            </div>
                            
                            <div className="space-y-2">
                                <h4 className="text-sm font-semibold text-slate-600 pt-2 border-t">
                                    Validadores Atuais:
                                </h4>
                                {Array.isArray(event.validators) && event.validators.length > 0 ? (
                                    event.validators.map((v, index) => (
                                        <div key={index} className="flex items-center justify-between bg-slate-100 p-2 rounded">
                                            <p className="text-xs font-mono break-all pr-2">
                                                {v.toString ? v.toString() : String(v)}
                                            </p>
                                            <button 
                                                onClick={() => handleRemoveValidator(v.toString ? v.toString() : String(v))} 
                                                className="text-red-500 hover:text-red-700 flex-shrink-0 transition-colors" 
                                                disabled={actionLoading}
                                                title="Remover validador"
                                            >
                                                <XCircleIcon className="h-5 w-5"/>
                                            </button>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-sm text-slate-500 text-center py-2">
                                        Nenhum validador cadastrado.
                                    </p>
                                )}
                            </div>
                        </div>
                    </AdminCard>
                    
                    <AdminCard title="Zona de Perigo" icon={ExclamationTriangleIcon}>
                        <p className="text-sm text-slate-600 mb-4">
                            Cancelar o evento é uma ação irreversível e habilitará reembolsos para todos os participantes.
                        </p>
                        <ActionButton 
                            onClick={handleCancelEvent} 
                            loading={actionLoading} 
                            disabled={event.canceled} 
                            className="w-full bg-red-600 hover:bg-red-700 disabled:bg-red-300 flex items-center justify-center transition-colors"
                        >
                            <XCircleIcon className="h-5 w-5 mr-2"/>
                            {event.canceled ? 'Evento Já Cancelado' : 'Cancelar Evento'}
                        </ActionButton>
                        
                        {event.canceled && (
                            <p className="mt-3 text-sm text-red-600 font-medium text-center">
                                ⚠️ Este evento está cancelado
                            </p>
                        )}
                    </AdminCard>
                </div>
            </div>
        </div>
    );
}

const StatCard = ({ icon: Icon, title, value, color, subtitle }) => (
    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-start space-x-4">
        <div className={`p-3 rounded-lg bg-indigo-100 ${color}`}>
             <Icon className="h-6 w-6" />
        </div>
        <div className="flex-1">
            <p className="text-sm font-medium text-slate-500">{title}</p>
            <p className="text-2xl font-bold text-slate-900">{value}</p>
            {subtitle && (
                <p className="text-xs text-slate-500 mt-1">{subtitle}</p>
            )}
        </div>
    </div>
);

const TierProgress = ({ tier }) => {
    if (!tier || typeof tier.priceBrlCents === 'undefined') {
        return (
            <div className="p-4 border rounded-lg bg-slate-100 text-sm text-slate-500">
                Dados do lote indisponíveis ou inválidos.
            </div>
        );
    }

    const priceBrlCents = tier.priceBrlCents;
    const maxTicketsSupply = tier.maxTicketsSupply || 0;
    const ticketsSold = tier.ticketsSold || 0;
    
    const progress = maxTicketsSupply > 0 ? (ticketsSold / maxTicketsSupply) * 100 : 0;
    const priceInBrl = priceBrlCents / 100;
    const revenueInBrl = (ticketsSold * priceBrlCents) / 100;

    return (
        <div className="p-4 border rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors">
            <div className="flex justify-between items-center mb-2">
                <div>
                    <p className="font-bold text-slate-800">{tier.name}</p>
                    <p className="text-xs text-slate-500">
                        Preço: {priceInBrl.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </p>
                </div>
                <div className="text-right">
                    <p className="font-semibold text-indigo-600">
                        {ticketsSold} / {maxTicketsSupply}
                    </p>
                    <p className="text-xs text-slate-500">
                        Receita: {revenueInBrl.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </p>
                </div>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2">
                <div 
                    className="bg-indigo-500 h-2 rounded-full transition-all duration-300" 
                    style={{ width: `${progress}%` }}
                ></div>
            </div>
            <div className="flex justify-between text-xs text-slate-500 mt-1">
                <span>{progress.toFixed(1)}% vendido</span>
                <span>{maxTicketsSupply - ticketsSold} restantes</span>
            </div>
        </div>
    );
};