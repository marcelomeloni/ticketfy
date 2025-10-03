import { useState, useMemo, useEffect, useCallback } from 'react';
import { useConnection } from '@solana/wallet-adapter-react';
import { Program, AnchorProvider, web3 } from '@coral-xyz/anchor';
import idl from '@/idl/ticketing_system.json';
import toast from 'react-hot-toast'; // Adicionado toast

// 1. Importar componentes adicionais para a nova UI
import { Link } from 'react-router-dom';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { ArrowRightIcon } from '@heroicons/react/24/outline';

import { useAppWallet } from '@/hooks/useAppWallet';
import { CreateEventWizard } from '@/components/event/create/CreateEventWizard';
import { MyEventsList } from '@/components/event/MyEventsList';
import { InfoBox } from '@/components/ui/InfoBox';
import { PROGRAM_ID, API_URL } from '@/lib/constants'; // Garante que API_URL está importado
import { Spinner } from '@/components/ui/Spinner';

const GLOBAL_CONFIG_SEED = Buffer.from("config");
const WHITELIST_SEED = Buffer.from("whitelist");

/**
 * Novo componente de UI para usuários deslogados, com ações claras.
 */
const LoginPrompt = () => (
    <div className="max-w-2xl mx-auto bg-white p-8 rounded-2xl shadow-lg border border-slate-200 text-center">
        <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-indigo-600">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
            </svg>
        </div>
        <h2 className="text-2xl font-bold text-slate-900">Acesso Necessário</h2>
        <p className="mt-2 text-slate-600">Para criar ou gerenciar um evento, você precisa estar conectado.</p>
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link 
                to="/login"
                className="flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 transition-colors duration-200"
            >
                Fazer Login com Usuário
                <ArrowRightIcon className="h-5 w-5" />
            </Link>
             {/* O WalletMultiButton já vem estilizado, mas podemos envolvê-lo para consistência */}
            <div className="w-full sm:w-auto">
                <WalletMultiButton style={{ width: '100%' }} />
            </div>
        </div>
        <p className="mt-6 text-xs text-slate-500">Escolha o método de sua preferência para continuar.</p>
    </div>
);


export function CreateEvent() {
    const { connection } = useConnection();
    const wallet = useAppWallet();
    const [activeTab, setActiveTab] = useState('create');
    const [isAllowed, setIsAllowed] = useState(false);
    const [isLoadingPermissions, setIsLoadingPermissions] = useState(true);

    const provider = useMemo(() => {
        if (!wallet.connected || !wallet.publicKey) return null;
        
        const anchorWallet = {
            publicKey: wallet.publicKey,
            signTransaction: wallet.signTransaction,
            signAllTransactions: wallet.signAllTransactions,
        };
        return new AnchorProvider(connection, anchorWallet, AnchorProvider.defaultOptions());
    }, [connection, wallet]);

    const program = useMemo(() => {
        // CORRIGIDO: Certifica-se de que o programa é sempre inicializado (read-only ou com wallet)
        const readOnlyProvider = new AnchorProvider(connection, {}, AnchorProvider.defaultOptions());
        const effectiveProvider = provider || readOnlyProvider;
        return new Program(idl, PROGRAM_ID, effectiveProvider);
    }, [provider, connection]);

    const checkPermissions = useCallback(async () => {
        if (!wallet.publicKey) {
            setIsLoadingPermissions(false);
            setIsAllowed(false);
            return;
        }
        
        setIsLoadingPermissions(true);
        
        try {
            // ✅ CORREÇÃO: Chama o novo endpoint da API para verificação centralizada
            const response = await fetch(`${API_URL}/check-organizer-permission/${wallet.publicKey.toString()}`);
            const data = await response.json();

            if (!response.ok || !data.success) {
                 // Em caso de falha da API, assume que não está permitido
                setIsAllowed(false);
                return;
            }

            setIsAllowed(data.isAllowed);
            
        } catch (error) {
            console.error("Erro ao verificar permissões via API:", error);
            // Mensagem de erro foi removida do front-end por ser muito intrusiva.
            setIsAllowed(false);
        } finally {
            setIsLoadingPermissions(false);
        }
    }, [wallet.publicKey]); // Removido 'program' das dependências, pois ele é derivado do wallet

    useEffect(() => {
        // A API de permissão deve ser chamada apenas quando a carteira estiver conectada
        if (wallet.connected) {
            checkPermissions();
        } else {
            setIsLoadingPermissions(false);
            setIsAllowed(false);
        }
    }, [wallet.connected, checkPermissions]);

    const renderContent = () => {
        // 2. Substituir o InfoBox pelo novo LoginPrompt
        if (!wallet.connected) {
            return <LoginPrompt />;
        }
        
        if (isLoadingPermissions) {
            return <div className="flex justify-center py-10"><Spinner /></div>;
        }

        if (!isAllowed) {
            return <InfoBox title="Acesso Negado" message="Você precisa ser um administrador ou estar na lista de permissões (whitelist) para criar eventos." status="error" />;
        }
        
        return (
            <div>
                <div className="border-b border-slate-200 mb-8">
                    <nav className="-mb-px flex space-x-8">
                        <TabButton name="Criar Novo Evento" active={activeTab === 'create'} onClick={() => setActiveTab('create')} />
                        <TabButton name="Meus Eventos Criados" active={activeTab === 'manage'} onClick={() => setActiveTab('manage')} />
                    </nav>
                </div>
                <div>
                    {activeTab === 'create' && <CreateEventWizard program={program} wallet={wallet} onEventCreated={() => setActiveTab('manage')} />}
                    {activeTab === 'manage' && <MyEventsList program={program} wallet={wallet} />}
                </div>
            </div>
        );
    };

    return (
        <div className="container mx-auto px-4 py-12">
            <header className="text-center mb-12">
                <h1 className="text-4xl font-bold text-slate-900">Gerenciador de Eventos</h1>
                <p className="mt-2 text-slate-600">Crie e administre seus eventos com facilidade.</p>
            </header>
            {renderContent()}
        </div>
    );
}

const TabButton = ({ name, active, onClick }) => (
    <button onClick={onClick} className={`px-1 py-4 text-sm font-medium transition-colors ${active ? 'border-indigo-500 text-indigo-600 border-b-2' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}>
        {name}
    </button>
);
