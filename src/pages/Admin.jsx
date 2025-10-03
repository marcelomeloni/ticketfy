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
    const [tfyTokenMint, setTfyTokenMint] = useState('');
    const [whitelistAddress, setWhitelistAddress] = useState('');
    const [platformFeeBps, setPlatformFeeBps] = useState('500'); // Novo campo para a taxa de plataforma (5%)

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
                .map(acc => ({
                    wallet: acc.account.wallet.toString(),
                    platformFeeBps: acc.account.platformFeeBps,
                    pda: acc.publicKey.toString()
                }));
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
                setIsInitialized(true); 
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
            await checkPermissions();
        } catch (error) {
            console.error("Erro na transação:", error);
            toast.error(`Erro: ${error.message || 'Falha na transação.'}`, { id: loadingToast });
        } finally {
            setLoading(false);
        }
    };

    const handleInitialize = async (event) => {
        event.preventDefault();
        if (!program || !wallet || !tfyTokenMint) return toast.error("Preencha o endereço do token.");
        setLoading(true);
        const loadingToast = toast.loading("Inicializando protocolo...");
        try {
            const tfyTokenMintPubkey = new web3.PublicKey(tfyTokenMint);
            const [globalConfigPda] = web3.PublicKey.findProgramAddressSync([GLOBAL_CONFIG_SEED], program.programId);
            
            await program.methods
                .initialize(wallet.publicKey, tfyTokenMintPubkey)
                .accounts({
                    authority: wallet.publicKey,
                    globalConfig: globalConfigPda,
                    systemProgram: web3.SystemProgram.programId,
                })
                .rpc();
    
            const [whitelistPda] = web3.PublicKey.findProgramAddressSync(
                [WHITELIST_SEED, wallet.publicKey.toBuffer()],
                program.programId
            );
            
            await program.methods
                .manageWhitelist(wallet.publicKey, true, new BN(parseInt(platformFeeBps))) 
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

    const handleManageWhitelist = () => {
        if (!program || !wallet || !whitelistAddress) return toast.error("Preencha o endereço da carteira.");
        try {
            const walletToWhitelist = new web3.PublicKey(whitelistAddress);
            const [globalConfigPda] = web3.PublicKey.findProgramAddressSync([GLOBAL_CONFIG_SEED], program.programId);
            const [whitelistPda] = web3.PublicKey.findProgramAddressSync([WHITELIST_SEED, walletToWhitelist.toBuffer()], program.programId);
            const isWhitelisted = whitelistedWallets.some(w => w.wallet === walletToWhitelist.toString());

            const method = program.methods
                .manageWhitelist(walletToWhitelist, !isWhitelisted, new BN(parseInt(platformFeeBps)))
                .accounts({
                    globalConfig: globalConfigPda,
                    authority: wallet.publicKey,
                    whitelist: whitelistPda,
                    wallet: walletToWhitelist,
                    systemProgram: web3.SystemProgram.programId,
                });
            handleTransaction(method, `Carteira ${!isWhitelisted ? 'adicionada à' : 'removida da'} whitelist.`);
            setWhitelistAddress('');
        } catch (e) {
            toast.error("Endereço da carteira inválido.");
        }
    };

    const handleUpdateFee = async (walletToUpdate, newFee) => {
        if (!program || !wallet) return;
        const loadingToast = toast.loading("Atualizando taxa de plataforma...");
        try {
            const walletPubkey = new web3.PublicKey(walletToUpdate);
            const [globalConfigPda] = web3.PublicKey.findProgramAddressSync([GLOBAL_CONFIG_SEED], program.programId);
            const [whitelistPda] = web3.PublicKey.findProgramAddressSync([WHITELIST_SEED, walletPubkey.toBuffer()], program.programId);
            
            await program.methods
                .updateRoyalty(walletPubkey, new BN(parseInt(newFee)))
                .accounts({
                    globalConfig: globalConfigPda,
                    authority: wallet.publicKey,
                    whitelist: whitelistPda,
                    wallet: walletPubkey,
                })
                .rpc();

            toast.success("Taxa de plataforma atualizada com sucesso.", { id: loadingToast });
            await fetchWhitelistedWallets();
        } catch (error) {
            console.error("Erro ao atualizar taxa:", error);
            toast.error(`Erro: ${error.message || 'Falha na transação.'}`, { id: loadingToast });
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
                                <InputField label="Endereço do Token TFY" value={tfyTokenMint} onChange={(e) => setTfyTokenMint(e.target.value)} required placeholder="Endereço do seu token SPL..." />
                                <InputField label="Taxa Padrão (BPS)" type="number" value={platformFeeBps} onChange={(e) => setPlatformFeeBps(e.target.value)} required />
                                <p className="text-sm text-slate-500">Esta será a taxa padrão para o primeiro organizador.</p>
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
                        <AdminCard title="Gerenciamento de Organizadores">
                            <div className="space-y-4">
                                <InputField label="Endereço da Carteira" value={whitelistAddress} onChange={(e) => setWhitelistAddress(e.target.value)} placeholder="Endereço da carteira..." />
                                <InputField label="Taxa de Plataforma (BPS)" type="number" value={platformFeeBps} onChange={(e) => setPlatformFeeBps(e.target.value)} required />
                                <div className="flex space-x-4">
                                    <ActionButton onClick={handleManageWhitelist} loading={loading || !whitelistAddress || !platformFeeBps} className="w-full">Adicionar/Remover Organizador</ActionButton>
                                </div>
                                <p className="text-sm text-slate-500 mt-2">100 BPS = 1%. Exemplo: 500 para 5%</p>
                            </div>
                        </AdminCard>
                    </div>

                    <div className="lg:col-span-2">
                        <AdminCard title="Organizadores Registrados">
                            <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                                {isFetchingWhitelist ? <p className="text-slate-500">Carregando...</p> :
                                    whitelistedWallets.length > 0 ? (
                                        whitelistedWallets.map(organizer => (
                                            <div key={organizer.wallet} className="bg-slate-100 p-2 rounded-md font-mono text-xs text-slate-700 truncate relative group">
                                                <span className="font-bold">Taxa: {organizer.platformFeeBps / 100}%</span> - {organizer.wallet}
                                                <div className="absolute top-0 right-0 p-1 flex items-center justify-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => {
                                                        const newFee = prompt(`Atualizar taxa de plataforma para ${organizer.wallet}:`, organizer.platformFeeBps);
                                                        if (newFee !== null && !isNaN(parseInt(newFee))) {
                                                            handleUpdateFee(organizer.wallet, newFee);
                                                        }
                                                    }} className="text-slate-500 hover:text-blue-500 transition-colors">
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                        </svg>
                                                    </button>
                                                </div>
                                            </div>
                                        ))
                                    ) : <p className="text-slate-500">Nenhum organizador registrado.</p>
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