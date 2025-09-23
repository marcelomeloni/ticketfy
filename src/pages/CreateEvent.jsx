import { useState, useMemo, useEffect } from 'react';
import { useConnection, useAnchorWallet } from '@solana/wallet-adapter-react';
import { Program, AnchorProvider, web3 } from '@coral-xyz/anchor';
import idl from '@/idl/ticketing_system.json';

// MODIFICADO: Importando o novo componente Wizard da sua nova pasta
import { CreateEventWizard } from '@/components/event/create/CreateEventWizard'; 
import { MyEventsList } from '@/components/event/MyEventsList';
import { InfoBox } from '@/components/ui/InfoBox';

import { PROGRAM_ID } from '@/lib/constants';
const GLOBAL_CONFIG_SEED = Buffer.from("config");
const WHITELIST_SEED = Buffer.from("whitelist");

export function CreateEvent() {
    const { connection } = useConnection();
    const wallet = useAnchorWallet();
    const [activeTab, setActiveTab] = useState('create');
    const [isAllowed, setIsAllowed] = useState(false);
    const [isLoadingPermissions, setIsLoadingPermissions] = useState(true);

    const provider = useMemo(() => {
        if (!wallet) return null;
        return new AnchorProvider(connection, wallet, AnchorProvider.defaultOptions());
    }, [connection, wallet]);

    const program = useMemo(() => {
        if (!provider) return null;
        return new Program(idl, PROGRAM_ID, provider);
    }, [provider]);

    useEffect(() => {
        const checkPermissions = async () => {
            if (!program || !wallet) {
                setIsLoadingPermissions(false);
                setIsAllowed(false);
                return;
            }
            
            setIsLoadingPermissions(true);

            // 1. Verificar se é Admin
            try {
                const [globalConfigPda] = web3.PublicKey.findProgramAddressSync([GLOBAL_CONFIG_SEED], program.programId);
                const globalConfig = await program.account.globalConfig.fetch(globalConfigPda);
                if (globalConfig.authority.equals(wallet.publicKey)) {
                    setIsAllowed(true);
                    setIsLoadingPermissions(false);
                    return; // É admin, permissão concedida
                }
            } catch (e) {
                // Não é admin ou config não existe, continua para checar whitelist
                console.log("Usuário não é admin, verificando whitelist...");
            }

            // 2. Se não for admin, verificar se está na whitelist
            try {
                const [whitelistPda] = web3.PublicKey.findProgramAddressSync([WHITELIST_SEED, wallet.publicKey.toBuffer()], program.programId);
                const whitelistAccount = await program.account.whitelist.fetch(whitelistPda);
                setIsAllowed(whitelistAccount.isWhitelisted);
            } catch (e) {
                // Se a conta de whitelist não existe, o usuário não tem permissão
                setIsAllowed(false);
            } finally {
                setIsLoadingPermissions(false);
            }
        };

        checkPermissions();
    }, [wallet, program]);

    const renderContent = () => {
        if (isLoadingPermissions) return <div className="text-center text-slate-500">Verificando permissões...</div>;
        if (!wallet) return <InfoBox title="Conecte sua Carteira" message="Conecte sua carteira para criar ou gerenciar eventos." />;
        if (!isAllowed) return <InfoBox title="Acesso Negado" message="Você precisa ser admin ou estar na whitelist para criar eventos." status="error" />;
        
        return (
            <div>
                <div className="border-b border-slate-200 mb-8">
                    <nav className="-mb-px flex space-x-8">
                        <TabButton name="Criar Novo Evento" active={activeTab === 'create'} onClick={() => setActiveTab('create')} />
                        <TabButton name="Meus Eventos Criados" active={activeTab === 'manage'} onClick={() => setActiveTab('manage')} />
                    </nav>
                </div>
                <div>
                    {/* MODIFICADO: Renderizando o novo componente Wizard */}
                    {activeTab === 'create' && <CreateEventWizard program={program} wallet={wallet} onEventCreated={() => setActiveTab('manage')} />}
                    {activeTab === 'manage' && <MyEventsList program={program} wallet={wallet} />}
                </div>
            </div>
        );
    };

    return <div className="container mx-auto px-4 py-12">{renderContent()}</div>;
}

const TabButton = ({ name, active, onClick }) => (
    <button onClick={onClick} className={`px-1 py-4 text-sm font-medium transition-colors ${active ? 'border-indigo-500 text-indigo-600 border-b-2' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}>
        {name}
    </button>
);