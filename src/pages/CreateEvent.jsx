// src/components/event/CreateEvent.jsx
import { useState, useMemo, useEffect } from 'react';
import { useConnection } from '@solana/wallet-adapter-react';
import { Program, AnchorProvider } from '@coral-xyz/anchor';
import { Link } from 'react-router-dom';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { ArrowRightIcon } from '@heroicons/react/24/outline';

import { useAppWallet } from '@/hooks/useAppWallet';
import { CreateEventWizard } from '@/components/event/create/CreateEventWizard';
import { MyEventsList } from '@/components/event/MyEventsList';
import { InfoBox } from '@/components/ui/InfoBox';
import { PROGRAM_ID, API_URL } from '@/lib/constants';
import idl from '@/idl/ticketing_system.json';

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
                Fazer Login
                <ArrowRightIcon className="h-5 w-5" />
            </Link>
            <div className="w-full sm:w-auto">
                <WalletMultiButton style={{ width: '100%' }} />
            </div>
        </div>
        <div className="mt-6 text-sm text-slate-600">
            <p>Métodos de login suportados:</p>
            <div className="flex flex-wrap justify-center gap-4 mt-2">
                <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs">Extensão (Phantom)</span>
                <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">Username/Senha</span>
                <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-xs">Seed Phrase</span>
                <span className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-xs">Private Key</span>
            </div>
        </div>
    </div>
);

export function CreateEvent() {
    const { connection } = useConnection();
    const wallet = useAppWallet();
    const [activeTab, setActiveTab] = useState('create');
    const [isAllowed, setIsAllowed] = useState(false);
    const [isLoadingPermissions, setIsLoadingPermissions] = useState(true);
    const [eventAddress, setEventAddress] = useState(null);

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
        if (!provider) {
             const readOnlyProvider = new AnchorProvider(connection, {}, AnchorProvider.defaultOptions());
             return new Program(idl, PROGRAM_ID, readOnlyProvider);
        }
        return new Program(idl, PROGRAM_ID, provider);
    }, [provider, connection]);

    // Verificar permissões para todos os tipos de login
    useEffect(() => {
        const checkPermissions = async () => {
            if (!wallet.publicKey) {
                setIsLoadingPermissions(false);
                setIsAllowed(false);
                return;
            }
            
            setIsLoadingPermissions(true);
            
            try {
                console.log("Verificando permissões para:", wallet.publicKey.toString(), "Tipo:", wallet.walletType);
                
                const response = await fetch(`${API_URL}/api/tickets/check-organizer-permission/${wallet.publicKey.toString()}`);
                
                if (!response.ok) {
                    throw new Error('Falha ao verificar permissões');
                }
                
                const result = await response.json();
                
                if (result.success) {
                    setIsAllowed(result.isAllowed);
                    console.log("Permissão concedida:", result.isAllowed);
                } else {
                    setIsAllowed(false);
                    console.log("Permissão negada");
                }
            } catch (error) {
                console.error("Erro ao verificar permissões:", error);
                setIsAllowed(false);
            } finally {
                setIsLoadingPermissions(false);
            }
        };

        checkPermissions();
    }, [wallet.publicKey, wallet.walletType]);

    const renderContent = () => {
        if (!wallet.connected) {
            return <LoginPrompt />;
        }
        
        if (isLoadingPermissions) {
            return (
                <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                    <p className="mt-2 text-slate-500">Verificando permissões...</p>
                    <p className="text-sm text-slate-400">
                        Conectado como: {wallet.publicKey?.toString().slice(0, 8)}... 
                        ({wallet.walletType})
                    </p>
                </div>
            );
        }

        if (!isAllowed) {
            return (
                <InfoBox 
                    title="Acesso Negado" 
                    message="Você precisa ser um administrador ou estar na lista de permissões (whitelist) para criar eventos." 
                    status="error" 
                />
            );
        }
        
        return (
            <div>
                <div className="border-b border-slate-200 mb-8">
                    <nav className="-mb-px flex space-x-8">
                        <TabButton 
                            name="Criar Novo Evento" 
                            active={activeTab === 'create'} 
                            onClick={() => {
                                setActiveTab('create');
                                setEventAddress(null); // Reset event address when switching to create tab
                            }} 
                        />
                        <TabButton 
                            name="Meus Eventos Criados" 
                            active={activeTab === 'manage'} 
                            onClick={() => setActiveTab('manage')} 
                        />
                    </nav>
                </div>
                <div>
                    {activeTab === 'create' && (
                        <CreateEventWizard 
                            program={program} 
                            wallet={wallet} 
                            onEventCreated={() => { 
                                setActiveTab('manage'); 
                                setEventAddress(null); 
                            }}
                            eventAddress={eventAddress}
                        />
                    )}
                    {activeTab === 'manage' && <MyEventsList program={program} wallet={wallet} />}
                </div>
            </div>
        );
    };

    return (
        <div className="container mx-auto px-4 py-12">
            <header className="text-center mb-12">
                <h1 className="text-4xl font-bold text-slate-900">Gerenciador de Eventos</h1>
                <p className="mt-2 text-slate-600">
                    Conectado com: {wallet.walletType === 'adapter' ? 'Carteira Externa' : 
                                  wallet.walletType === 'local' ? 'Login Local' : 'Nenhum'}
                </p>
            </header>
            {renderContent()}
        </div>
    );
}

const TabButton = ({ name, active, onClick }) => (
    <button 
        onClick={onClick} 
        className={`px-1 py-4 text-sm font-medium transition-colors ${
            active ? 'border-indigo-500 text-indigo-600 border-b-2' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
        }`}
    >
        {name}
    </button>
);