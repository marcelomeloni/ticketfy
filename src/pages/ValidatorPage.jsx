import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useConnection } from '@solana/wallet-adapter-react';
import { useAppWallet } from '@/hooks/useAppWallet';
import { Program, AnchorProvider, web3 } from '@coral-xyz/anchor';
import toast from 'react-hot-toast';
import { Html5QrcodeScanner } from 'html5-qrcode';
import idl from '@/idl/ticketing_system.json';
import { ActionButton } from '@/components/ui/ActionButton';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { DocumentMagnifyingGlassIcon, ShieldCheckIcon, ShieldExclamationIcon, TicketIcon, ClockIcon, UserIcon, UserGroupIcon } from '@heroicons/react/24/outline';
import { PROGRAM_ID, API_URL } from '@/lib/constants';

// --- Sub-componentes de UI ---

const StatCard = ({ title, value, icon: Icon, color }) => (
    <div className="bg-white p-4 rounded-lg flex items-center gap-4 border border-slate-200">
        <div className={`p-3 rounded-full ${color}`}>
            <Icon className="h-6 w-6 text-white"/>
        </div>
        <div>
            <p className="text-sm font-semibold text-slate-500">{title}</p>
            <p className="text-2xl font-bold text-slate-800">{value}</p>
        </div>
    </div>
);

const ScannerView = ({ onValidate }) => {
    const [manualId, setManualId] = useState('');

    useEffect(() => {
        let scanner;
        if (document.getElementById('qr-reader-container')?.innerHTML === "") {
            scanner = new Html5QrcodeScanner('qr-reader-container', { fps: 10, qrbox: { width: 250, height: 250 } }, false);
            const handleSuccess = (decodedText) => {
                onValidate(decodedText);
            };
            scanner.render(handleSuccess, () => {});
        }
        return () => {
            if (scanner && scanner.getState && scanner.getState() !== 1) {
                scanner.clear().catch(() => {});
            }
        };
    }, [onValidate]);

    return (
        <div className="w-full text-center">
            <h2 className="text-2xl font-bold text-slate-800">Escanear Ingresso</h2>
            <p className="text-slate-500 mt-1 mb-4">Aponte a câmera para o QR Code do participante.</p>
            <div id="qr-reader-container" className="w-full max-w-md mx-auto bg-slate-100 p-2 rounded-lg border-2 border-dashed border-slate-300"></div>
            <div className="my-6 flex items-center w-full max-w-md mx-auto">
                <div className="flex-grow border-t border-slate-300"></div><span className="flex-shrink mx-4 text-slate-500 font-bold">OU</span><div className="flex-grow border-t border-slate-300"></div>
            </div>
            <h3 className="text-lg font-bold text-slate-800">Busca Manual</h3>
            <p className="text-slate-500 mt-1 mb-4">Insira o ID do ingresso (UUID) manualmente.</p>
            <form onSubmit={(e) => { e.preventDefault(); onValidate(manualId); }} className="mt-4 flex gap-2 max-w-md mx-auto">
                <input type="text" value={manualId} onChange={(e) => setManualId(e.target.value)} placeholder="Cole o ID do Ingresso aqui" className="w-full bg-white border border-slate-300 rounded-md p-3 text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-indigo-500" />
                <button type="submit" className="bg-indigo-600 p-3 text-white rounded-md hover:bg-indigo-700"><DocumentMagnifyingGlassIcon className="h-6 w-6" /></button>
            </form>
        </div>
    );
};

const RecentValidations = ({ entries }) => (
    <div>
        <h2 className="text-lg font-bold text-slate-800 mb-4">Últimas Validações</h2>
        <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
            {entries.length > 0 ? entries.map((entry, index) => (
                <div key={entry.nftMint || index} className="bg-slate-50 p-3 rounded-lg flex items-center justify-between animate-fade-in border border-slate-200">
                    <div className="flex items-center gap-3">
                        <UserIcon className="h-5 w-5 text-green-500"/>
                        <p className="font-medium text-slate-700">{entry.name || entry.ownerName || 'Participante'}</p>
                    </div>
                    <p className="text-sm text-slate-500">{entry.redeemedAt}</p>
                </div>
            )) : <p className="text-slate-500 text-center py-4">Nenhum ingresso validado ainda.</p>}
        </div>
    </div>
);

// --- Componente Principal da Página ---
export function ValidatorPage() {
    const { eventAddress } = useParams();
    const { connection } = useConnection();
    const { publicKey, connected } = useAppWallet();

    const [eventAccount, setEventAccount] = useState(null);
    const [isValidator, setIsValidator] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [recentEntries, setRecentEntries] = useState([]);
    
    const readOnlyProgram = useMemo(() => {
        const provider = new AnchorProvider(connection, {}, AnchorProvider.defaultOptions());
        return new Program(idl, PROGRAM_ID, provider);
    }, [connection]);
    
    useEffect(() => {
        const checkValidatorStatus = async () => {
            if (!publicKey || !readOnlyProgram) {
                setIsValidator(false);
                return;
            }
            setIsLoading(true);
            try {
                const event = await readOnlyProgram.account.event.fetch(new web3.PublicKey(eventAddress));
                setEventAccount(event);
                const validatorPubkeys = event.validators.map(v => v.toString());
                const isUserAValidator = validatorPubkeys.includes(publicKey.toString());
                setIsValidator(isUserAValidator);
            } catch (error) {
                toast.error("Não foi possível carregar os dados do evento.");
                setIsValidator(false);
            } finally {
                setIsLoading(false);
            }
        };
        if (connected) {
            checkValidatorStatus();
        } else {
            setIsLoading(false);
            setIsValidator(false);
        }
    }, [connected, publicKey, readOnlyProgram, eventAddress]);
    
    // 🔄 ATUALIZADO: Nova URL da API modularizada
    const fetchRecentEntries = useCallback(async () => {
        try {
            const response = await fetch(`${API_URL}/api/validations/event/${eventAddress}/validated-tickets`);
            if (!response.ok) throw new Error('Falha ao buscar validações');
            const entriesFromApi = await response.json();
            setRecentEntries(entriesFromApi);
        } catch (error) {
            console.error("Erro ao buscar entradas recentes:", error);
        }
    }, [eventAddress]);

    useEffect(() => {
        if (isValidator) {
            fetchRecentEntries();
            const interval = setInterval(fetchRecentEntries, 15000);
            return () => clearInterval(interval);
        }
    }, [isValidator, fetchRecentEntries]);
    
    // 🔄 ATUALIZADO: Nova URL da API modularizada
   const handleValidationAttempt = useCallback(async (registrationId) => {
  if (!registrationId || !publicKey) return;

  const loadingToast = toast.loading("Validando ingresso...");
  try {
    // Determinar o tipo de autenticação baseado no contexto
    let authPayload = {
      validatorAddress: publicKey.toString(),
    };

    // Se estiver usando AuthContext (login local), adicionar credenciais
    const { isAuthenticated, keypair, loginType } = useAuth(); // Adicione este hook
    
    if (isAuthenticated) {
      // Para autenticação local, enviar as credenciais
      authPayload.authType = loginType; // 'privateKey', 'seedPhrase', 'credentials'
      // ⚠️ AVISO: Em produção, isso deve ser feito de forma mais segura
      // Possivelmente usando sessões ou tokens JWT
    }
    // Para wallet extension, usar a versão com assinatura no frontend

    const response = await fetch(`${API_URL}/api/validations/validate-by-id/${registrationId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(authPayload),
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.error || 'Falha na validação via API.');
    }
    
    toast.success(`Entrada liberada para ${result.participantName}!`, { id: loadingToast, duration: 4000 });
    fetchRecentEntries();

  } catch (error) {
    console.error("Erro ao validar ingresso:", error);
    toast.error(`Falha na validação: ${error.message}`, { id: loadingToast });
  }
}, [publicKey, fetchRecentEntries]);
    
    if (!connected) {
        return ( <div className="flex flex-col justify-center items-center h-screen bg-slate-100 text-center p-4"> <ShieldExclamationIcon className="h-16 w-16 text-slate-500" /> <h1 className="mt-4 text-2xl font-bold">Área do Validador</h1> <p className="mt-2 text-slate-600">Conecte sua carteira para continuar.</p> <div className="mt-6"><WalletMultiButton /></div></div>);
    }
    
    if (isLoading) {
        return <div className="flex justify-center items-center h-screen bg-slate-100"><ClockIcon className="h-12 w-12 text-slate-500 animate-spin"/></div>;
    }
    
    if (!isValidator) {
        return <div className="flex flex-col justify-center items-center h-screen bg-slate-100 text-center p-4 text-red-600"> <ShieldExclamationIcon className="h-16 w-16" /> <h1 className="mt-4 text-2xl font-bold">Acesso Negado</h1><p className="mt-2">A carteira conectada não é um validador autorizado para este evento.</p></div>;
    }
    
    return (
        <div className="bg-slate-50 min-h-screen">
            <header className="bg-white shadow-sm sticky top-0 z-10">
                <div className="container mx-auto px-4 py-4 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <ShieldCheckIcon className="h-8 w-8 text-indigo-600"/>
                        <div>
                            <h1 className="text-xl font-bold text-slate-800">Painel do Validador</h1>
                            <p className="text-sm text-slate-500 font-mono truncate">{publicKey.toString()}</p>
                        </div>
                    </div>
                    <WalletMultiButton />
                </div>
            </header>

            <main className="container mx-auto p-4 md:p-8 grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow-md">
                    <ScannerView onValidate={handleValidationAttempt} />
                </div>
                <div className="space-y-8">
                    <div className="bg-white p-6 rounded-lg shadow-md">
                        <h2 className="text-lg font-bold text-slate-800 mb-4">Estatísticas</h2>
                        <div className="space-y-4">
                            <StatCard title="Ingressos Validados" value={recentEntries.length} icon={UserGroupIcon} color="bg-green-500" />
                            <StatCard title="Total Vendido" value={eventAccount?.totalTicketsSold.toString() || '0'} icon={TicketIcon} color="bg-blue-500" />
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-lg shadow-md">
                        <RecentValidations entries={recentEntries} />
                    </div>
                </div>
            </main>
        </div>
    );

}
