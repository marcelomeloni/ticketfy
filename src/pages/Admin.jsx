import { useState, useMemo, useEffect, useCallback } from 'react';
import { useConnection, useAnchorWallet } from '@solana/wallet-adapter-react';
import { Program, AnchorProvider, web3, BN } from '@coral-xyz/anchor';
import { Buffer } from 'buffer';
import toast from 'react-hot-toast';
import idl from '@/idl/ticketing_system.json';

import { AdminCard } from '../components/ui/AdminCard';
import { InputField } from '../components/ui/InputField';
import { ActionButton } from '../components/ui/ActionButton';
import { InfoBox } from '../components/ui/InfoBox';
import { Spinner } from '../components/ui/Spinner';

import { PROGRAM_ID, API_URL } from '@/lib/constants'; 
const GLOBAL_CONFIG_SEED = Buffer.from("config");
const WHITELIST_SEED = Buffer.from("whitelist");

export function Admin() {
    const { connection } = useConnection();
    const wallet = useAnchorWallet();
    const [loading, setLoading] = useState(false);
    
    // Formulários
    const [treasury, setTreasury] = useState('');
    const [fee, setFee] = useState('250');
    const [whitelistAddress, setWhitelistAddress] = useState('');

    // Estados de UI
    const [isAdmin, setIsAdmin] = useState(false);
    const [isInitialized, setIsInitialized] = useState(false);
    const [isLoadingPermissions, setIsLoadingPermissions] = useState(true);
    const [whitelistedWallets, setWhitelistedWallets] = useState([]);
    const [isFetchingWhitelist, setIsFetchingWhitelist] = useState(false);

    const provider = useMemo(() => {
        if (!wallet) return null;
        return new AnchorProvider(connection, wallet, AnchorProvider.defaultOptions());
    }, [connection, wallet]);

    const program = useMemo(() => {
        if (!provider) return null;
        return new Program(idl, PROGRAM_ID, provider);
    }, [provider]);
    
    const fetchWhitelistedWallets = useCallback(async () => {
        if (!program) return;
        setIsFetchingWhitelist(true);
        try {
            const allWhitelistAccounts = await program.account.whitelist.all();
            const activeWallets = allWhitelistAccounts
                .filter(acc => acc.account.isWhitelisted)
                .map(acc => acc.account.wallet.toString());
            setWhitelistedWallets(activeWallets);
        } catch (error) {
            console.error("Erro ao buscar a whitelist:", error);
            toast.error("Não foi possível carregar a whitelist.");
        } finally {
            setIsFetchingWhitelist(false);
        }
    }, [program]);

    const checkPermissions = useCallback(async () => {
        if (!program || !wallet) {
            setIsAdmin(false);
            setIsLoadingPermissions(false);
            return;
        }
        setIsLoadingPermissions(true);
        try {
            const [globalConfigPda] = web3.PublicKey.findProgramAddressSync([GLOBAL_CONFIG_SEED], program.programId);
            const globalConfig = await program.account.globalConfig.fetch(globalConfigPda);
            
            setIsInitialized(true); 
            
            const isAdminUser = globalConfig.authority.equals(wallet.publicKey);
            setIsAdmin(isAdminUser);

            if (isAdminUser) {
                await fetchWhitelistedWallets();
            }

        } catch (error) {
            if (error.message.includes("Account does not exist")) {
                setIsInitialized(false);
                setIsAdmin(false);
            } else {
                console.error("Erro ao verificar permissões:", error);
                setIsAdmin(false);
                setIsInitialized(true); // Assume que está inicializado mas falhou ao buscar
            }
        } finally {
            setIsLoadingPermissions(false);
        }
    }, [wallet, program, fetchWhitelistedWallets]);

    useEffect(() => {
        checkPermissions();
    }, [checkPermissions]);

    const handleTransaction = async (methodBuilder, successMessage) => {
        setLoading(true);
        const loadingToast = toast.loading("Processando transação...");
        try {
            const tx = await methodBuilder.rpc();
            toast.success(successMessage, { id: loadingToast });
            await checkPermissions(); // Re-verifica tudo para atualizar a UI
        } catch (error) {
            console.error("Erro na transação:", error);
            toast.error(`Erro: ${error.message || 'Falha na transação.'}`, { id: loadingToast });
        } finally {
            setLoading(false);
        }
    };

    const handleInitialize = async (event) => {
        event.preventDefault();
        if (!program || !wallet || !treasury) return toast.error("Preencha o endereço da tesouraria.");
        setLoading(true);
        const loadingToast = toast.loading("Inicializando protocolo...");
        try {
            const treasuryPubkey = new web3.PublicKey(treasury);
            const [globalConfigPda] = web3.PublicKey.findProgramAddressSync([GLOBAL_CONFIG_SEED], program.programId);
            
            // Transação 1: Inicializar o global config
            await program.methods
                .initialize(wallet.publicKey, treasuryPubkey, new BN(parseInt(fee)))
                .accounts({
                    authority: wallet.publicKey,
                    treasury: treasuryPubkey,
                    globalConfig: globalConfigPda,
                    systemProgram: web3.SystemProgram.programId,
                })
                .rpc();
    
            // Transação 2: Adicionar administrador à whitelist
            const [whitelistPda] = web3.PublicKey.findProgramAddressSync(
                [WHITELIST_SEED, wallet.publicKey.toBuffer()],
                program.programId
            );
            
            await program.methods
                .manageWhitelist(wallet.publicKey, true)
                .accounts({
                    globalConfig: globalConfigPda,
                    authority: wallet.publicKey,
                    whitelist: whitelistPda,
                    wallet: wallet.publicKey,
                    systemProgram: web3.SystemProgram.programId,
                })
                .rpc();
    
            toast.success("Protocolo inicializado e administrador adicionado à whitelist!", { id: loadingToast });
            await checkPermissions();
        } catch (error) {
            console.error("Erro na inicialização:", error);
            toast.error(`Erro: ${error.message || 'Falha na transação.'}`, { id: loadingToast });
        } finally {
            setLoading(false);
        }
    };

    const handleTogglePause = (pausedState) => {
        if (!program || !wallet) return;
        const [globalConfigPda] = web3.PublicKey.findProgramAddressSync([GLOBAL_CONFIG_SEED], program.programId);
        const method = program.methods.togglePause(pausedState).accounts({ globalConfig: globalConfigPda, authority: wallet.publicKey });
        handleTransaction(method, `Protocolo ${pausedState ? 'Pausado' : 'Reativado'} com sucesso.`);
    };
    
    const handleManageWhitelist = (isWhitelisted) => {
        if (!program || !wallet || !whitelistAddress) return toast.error("Preencha o endereço da carteira.");
        try {
            const walletToWhitelist = new web3.PublicKey(whitelistAddress);
            const [globalConfigPda] = web3.PublicKey.findProgramAddressSync([GLOBAL_CONFIG_SEED], program.programId);
            const [whitelistPda] = web3.PublicKey.findProgramAddressSync([WHITELIST_SEED, walletToWhitelist.toBuffer()], program.programId);

            const method = program.methods.manageWhitelist(walletToWhitelist, isWhitelisted).accounts({
                globalConfig: globalConfigPda,
                authority: wallet.publicKey,
                whitelist: whitelistPda,
                wallet: walletToWhitelist,
                systemProgram: web3.SystemProgram.programId,
            });
            handleTransaction(method, `Carteira ${isWhitelisted ? 'adicionada à' : 'removida da'} whitelist.`);
            setWhitelistAddress('');
        } catch (e) {
            toast.error("Endereço da carteira inválido.");
        }
    };

    const renderContent = () => {
        if (isLoadingPermissions) return <div className="flex justify-center py-20"><Spinner /></div>;
        if (!wallet) return <InfoBox title="Acesso Restrito" message="Por favor, conecte uma carteira para continuar." />;

        if (!isInitialized) {
            return (
                <>
                    <InfoBox 
                        title="Ação Necessária: Inicializar Protocolo" 
                        message="O contrato inteligente foi implantado, mas precisa ser inicializado. A primeira carteira a fazer isso se tornará a administradora." 
                        status="info" 
                    />
                    <div className="max-w-md mx-auto mt-8">
                        <AdminCard title="Inicialização do Protocolo" subtitle="(Executar apenas uma vez)">
                            <form onSubmit={handleInitialize} className="space-y-4">
                                <InputField label="Endereço da Tesouraria" value={treasury} onChange={(e) => setTreasury(e.target.value)} required placeholder={wallet.publicKey.toString()}/>
                                <InputField label="Taxa do Marketplace (BPS)" type="number" value={fee} onChange={(e) => setFee(e.target.value)} required />
                                <ActionButton type="submit" loading={loading} className="w-full">Tornar-se Admin e Inicializar</ActionButton>
                            </form>
                        </AdminCard>
                    </div>
                </>
            );
        }

        if (!isAdmin) {
            return <InfoBox title="Acesso Negado" message="Este protocolo já foi inicializado e a sua carteira não tem permissão de administrador." status="error" />;
        }
        
        return (
            <>
                <header className="text-center mb-12">
                    <h1 className="text-4xl font-bold text-slate-900">Painel do Administrador</h1>
                    <p className="mt-2 text-slate-600">Gerenciamento geral do protocolo.</p>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
                    <div className="lg:col-span-3 space-y-8">
                        <AdminCard title="Controle do Protocolo">
                            <div className="flex space-x-4">
                                <ActionButton onClick={() => handleTogglePause(true)} loading={loading} className="w-full bg-amber-500 hover:bg-amber-600">Pausar</ActionButton>
                                <ActionButton onClick={() => handleTogglePause(false)} loading={loading} className="w-full bg-emerald-500 hover:bg-emerald-600">Reativar</ActionButton>
                            </div>
                        </AdminCard>
                        <AdminCard title="Gerenciamento de Whitelist">
                            <div className="space-y-4">
                                <InputField label="Endereço da Carteira" value={whitelistAddress} onChange={(e) => setWhitelistAddress(e.target.value)} placeholder="Endereço da carteira..." />
                                <div className="flex space-x-4">
                                    <ActionButton onClick={() => handleManageWhitelist(true)} loading={loading || !whitelistAddress} className="w-full">Adicionar</ActionButton>
                                    <ActionButton onClick={() => handleManageWhitelist(false)} loading={loading || !whitelistAddress} className="w-full bg-red-600 hover:bg-red-700">Remover</ActionButton>
                                </div>
                            </div>
                        </AdminCard>
                    </div>

                    <div className="lg:col-span-2">
                        <AdminCard title="Carteiras na Whitelist">
                            <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                                {isFetchingWhitelist ? <p className="text-slate-500">Carregando...</p> :
                                    whitelistedWallets.length > 0 ? (
                                        whitelistedWallets.map(addr => (
                                            <div key={addr} className="bg-slate-100 p-2 rounded-md font-mono text-xs text-slate-700 truncate" title={addr}>
                                                {addr}
                                            </div>
                                        ))
                                    ) : <p className="text-slate-500">Nenhuma carteira na whitelist.</p>
                                }
                            </div>
                            <ActionButton onClick={fetchWhitelistedWallets} loading={isFetchingWhitelist} className="w-full mt-6 bg-slate-600 hover:bg-slate-700">
                                Atualizar Lista
                            </ActionButton>
                        </AdminCard>
                    </div>
                </div>
            </>
        );
    };

    return (
        <div className="container mx-auto px-4 py-12">
            {renderContent()}
        </div>
    );
}