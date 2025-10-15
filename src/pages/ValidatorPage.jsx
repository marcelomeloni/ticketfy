import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useConnection } from '@solana/wallet-adapter-react';
import { useAppWallet } from '@/hooks/useAppWallet';
import { Program, AnchorProvider, web3, BN } from '@coral-xyz/anchor';
import toast from 'react-hot-toast';
import { Html5QrcodeScanner } from 'html5-qrcode';
import idl from '@/idl/ticketing_system.json';
import { ActionButton } from '@/components/ui/ActionButton';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { 
    DocumentMagnifyingGlassIcon, 
    ShieldCheckIcon, 
    ShieldExclamationIcon, 
    TicketIcon, 
    ClockIcon, 
    UserIcon, 
    UserGroupIcon,
    XMarkIcon,
    CheckBadgeIcon
} from '@heroicons/react/24/outline';
import { PROGRAM_ID, API_URL } from '@/lib/constants';
import { useAuth } from '@/contexts/AuthContext';

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

// Modal de Confirmação
const ValidationModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  ticketData, 
  isLoading 
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex justify-center items-center z-50 p-4 animate-fade-in">
      <div className="w-full max-w-md bg-white p-6 rounded-lg shadow-xl">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-slate-800">Confirmar Validação</h2>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
            disabled={isLoading}
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {ticketData ? (
          <>
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 mb-6">
              <div className="flex items-center gap-3 mb-3">
                <UserIcon className="h-8 w-8 text-indigo-600" />
                <div>
                  <p className="font-semibold text-slate-800 text-lg">
                    {ticketData.participantName || 'Participante'}
                  </p>
                  <p className="text-sm text-slate-500">
                    {ticketData.ownerName && ticketData.ownerName !== ticketData.participantName 
                      ? `(${ticketData.ownerName})` 
                      : ''
                    }
                  </p>
                  <p className="text-xs text-slate-400 font-mono mt-1">
                    {ticketData.ownerAddress?.slice(0, 8)}...{ticketData.ownerAddress?.slice(-8)}
                  </p>
                </div>
              </div>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600">Evento:</span>
                  <span className="font-medium text-right">{ticketData.eventName || 'Evento'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">ID do Ingresso:</span>
                  <span className="font-mono text-xs">
                    {ticketData.ticketId?.slice(0, 10)}...
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Status:</span>
                  <span className={`font-semibold ${
                    ticketData.isRedeemed ? 'text-red-500' : 'text-green-500'
                  }`}>
                    {ticketData.isRedeemed ? 'JÁ VALIDADO' : 'PRONTO PARA VALIDAR'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={onClose}
                disabled={isLoading}
                className="flex-1 bg-slate-200 text-slate-700 py-3 px-4 rounded-lg font-medium hover:bg-slate-300 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <ActionButton
                onClick={onConfirm}
                disabled={isLoading || ticketData.isRedeemed}
                className="flex-1 flex justify-center items-center gap-2"
              >
                {isLoading ? (
                  <>
                    <ClockIcon className="h-5 w-5 animate-spin" />
                    Validando...
                  </>
                ) : (
                  <>
                    <CheckBadgeIcon className="h-5 w-5" />
                    Confirmar Entrada
                  </>
                )}
              </ActionButton>
            </div>

            {ticketData.isRedeemed && (
              <p className="text-red-500 text-sm text-center mt-3">
                Este ingresso já foi validado anteriormente.
              </p>
            )}
          </>
        ) : (
          <div className="text-center py-8">
            <ClockIcon className="h-12 w-12 text-slate-400 animate-spin mx-auto mb-4" />
            <p className="text-slate-600">Carregando dados do ingresso...</p>
          </div>
        )}
      </div>
    </div>
  );
};

const ScannerView = ({ onScan, onManualSearch, isPaused }) => {
    const [manualId, setManualId] = useState('');
    const scannerRef = useRef(null);
    const isProcessingRef = useRef(false);

    useEffect(() => {
        // Inicializar scanner apenas uma vez
        if (!scannerRef.current) {
            console.log('[SCANNER] Inicializando scanner...');
            
            scannerRef.current = new Html5QrcodeScanner('qr-reader-container', { 
                fps: 10, 
                qrbox: { width: 250, height: 250 },
                rememberLastUsedCamera: true,
                showTorchButtonIfSupported: true,
                showZoomSliderIfSupported: true,
            }, false);
            
            const handleSuccess = async (decodedText) => {
                // Prevenir múltiplas leituras simultâneas
                if (isProcessingRef.current || isPaused) {
                    return;
                }
                
                isProcessingRef.current = true;
                console.log('[SCANNER] QR Code detectado:', decodedText);
                
                try {
                    await onScan(decodedText);
                } catch (error) {
                    console.error('[SCANNER] Erro ao processar QR code:', error);
                } finally {
                    // Pequeno delay para evitar leituras duplicadas
                    setTimeout(() => {
                        isProcessingRef.current = false;
                    }, 1000);
                }
            };
            
            const handleError = (error) => {
                // Ignora erros de leitura normais
                if (!error.includes('No MultiFormat Readers') && 
                    !error.includes('NotFoundException') &&
                    !error.includes('NotReadableError')) {
                    console.log('[SCANNER] Erro de scanner:', error);
                }
            };
            
            scannerRef.current.render(handleSuccess, handleError);
        }

        return () => {
            // Não limpar o scanner aqui - vamos reutilizá-lo
        };
    }, [onScan, isPaused]);

    // Efeito para pausar/retomar o scanner
    useEffect(() => {
        if (scannerRef.current) {
            if (isPaused) {
                console.log('[SCANNER] Pausando scanner...');
                // Não pausamos o scanner, apenas ignoramos as leituras via isProcessingRef
            } else {
                console.log('[SCANNER] Retomando scanner...');
                isProcessingRef.current = false;
            }
        }
    }, [isPaused]);

    const handleManualSubmit = (e) => {
        e.preventDefault();
        if (manualId.trim() && !isProcessingRef.current) {
            console.log('[SCANNER] Busca manual:', manualId);
            onManualSearch(manualId.trim());
            setManualId('');
        }
    };

    return (
        <div className="w-full text-center">
            <h2 className="text-2xl font-bold text-slate-800">Escanear Ingresso</h2>
            <p className="text-slate-500 mt-1 mb-4">Aponte a câmera para o QR Code do participante.</p>
            
            <div 
                id="qr-reader-container" 
                className="w-full max-w-md mx-auto bg-slate-100 p-2 rounded-lg border-2 border-dashed border-slate-300"
            />
            
            {isPaused && (
                <div className="mt-4 p-3 bg-yellow-100 text-yellow-800 rounded-lg max-w-md mx-auto">
                    <p className="text-sm">Scanner pausado durante validação...</p>
                </div>
            )}
            
            <div className="my-6 flex items-center w-full max-w-md mx-auto">
                <div className="flex-grow border-t border-slate-300"></div>
                <span className="flex-shrink mx-4 text-slate-500 font-bold">OU</span>
                <div className="flex-grow border-t border-slate-300"></div>
            </div>
            
            <h3 className="text-lg font-bold text-slate-800">Busca Manual</h3>
            <p className="text-slate-500 mt-1 mb-4">Insira o ID do ingresso (UUID) manualmente.</p>
            
            <form onSubmit={handleManualSubmit} className="mt-4 flex gap-2 max-w-md mx-auto">
                <input 
                    type="text" 
                    value={manualId} 
                    onChange={(e) => setManualId(e.target.value)} 
                    placeholder="Cole o ID do Ingresso aqui" 
                    className="w-full bg-white border border-slate-300 rounded-md p-3 text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-indigo-500" 
                    disabled={isProcessingRef.current}
                />
                <button 
                    type="submit" 
                    className="bg-indigo-600 p-3 text-white rounded-md hover:bg-indigo-700 transition-colors disabled:opacity-50"
                    disabled={!manualId.trim() || isProcessingRef.current}
                >
                    <DocumentMagnifyingGlassIcon className="h-6 w-6" />
                </button>
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
                        <p className="font-medium text-slate-700">
                            {entry.name || entry.ownerName || 'Participante'}
                        </p>
                    </div>
                    <p className="text-sm text-slate-500">{entry.redeemedAt}</p>
                </div>
            )) : (
                <p className="text-slate-500 text-center py-4">Nenhum ingresso validado ainda.</p>
            )}
        </div>
    </div>
);

// --- Componente Principal da Página ---
export function ValidatorPage() {
    const { eventAddress } = useParams();
    const { connection } = useConnection();
    const { publicKey, connected } = useAppWallet();
    const { isAuthenticated, loginType } = useAuth();

    const [eventAccount, setEventAccount] = useState(null);
    const [isValidator, setIsValidator] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [recentEntries, setRecentEntries] = useState([]);
    const [eventName, setEventName] = useState('');
    
    // Estados para o modal e controle do scanner
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [pendingValidation, setPendingValidation] = useState(null);
    const [ticketData, setTicketData] = useState(null);
    const [isValidating, setIsValidating] = useState(false);
    const [isScannerPaused, setIsScannerPaused] = useState(false);

    // ✅ ATUALIZADO: Nova função otimizada para verificar permissões
    const checkValidatorStatus = useCallback(async () => {
        if (!eventAddress || !publicKey) return;
        
        console.log('🔍 Verificando permissões do validador via API otimizada...');
        setIsLoading(true);

        try {
            // Chamada otimizada para o novo endpoint
            const response = await fetch(
                `${API_URL}/api/validations/event-status/${eventAddress}/${publicKey.toString()}`
            );
            
            const data = await response.json();
            
            if (data.success) {
                setIsValidator(data.isValidator);
                setEventName(data.eventName);
                
                // Atualizar estado com informações do evento
                if (data.isValidator) {
                    setEventAccount({
                        validators: [], // Não precisamos mais desta lista completa
                        ticketsSold: new BN(data.totalTicketsSold || 0),
                        totalTickets: new BN(0) // Não temos esta informação, mas pode ser buscada se necessário
                    });
                    console.log('✅ Validador autorizado para o evento:', data.eventName);
                } else {
                    console.log('❌ Validador não autorizado');
                }
            } else {
                console.error('Erro na verificação:', data.error);
                toast.error('Erro ao verificar permissões: ' + (data.details || data.error));
                setIsValidator(false);
            }
        } catch (error) {
            console.error('Erro na verificação de permissões:', error);
            toast.error('Erro ao conectar com o servidor');
            setIsValidator(false);
        } finally {
            setIsLoading(false);
        }
    }, [eventAddress, publicKey]);

    // ✅ ATUALIZADO: useEffect simplificado usando a nova API
    useEffect(() => {
        if (connected && publicKey && eventAddress) {
            checkValidatorStatus();
        } else {
            setIsLoading(false);
            setIsValidator(false);
        }
    }, [connected, publicKey, eventAddress, checkValidatorStatus]);
    
    const fetchRecentEntries = useCallback(async () => {
        try {
            console.log(`[VALIDATOR] Buscando validações recentes para evento: ${eventAddress}`);
            const response = await fetch(`${API_URL}/api/validations/event/${eventAddress}/validated-tickets`);
            if (!response.ok) throw new Error('Falha ao buscar validações');
            const entriesFromApi = await response.json();
            setRecentEntries(entriesFromApi);
            console.log(`[VALIDATOR] ${entriesFromApi.length} validações encontradas`);
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

    // Função para buscar dados do ingresso
    const fetchTicketInfo = async (registrationId) => {
        try {
            console.log("[VALIDATION] Buscando informações do ingresso:", registrationId);
            
            const response = await fetch(`${API_URL}/api/validations/ticket-info/${registrationId}`);
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || errorData.details || "Ingresso não encontrado");
            }
            
            const data = await response.json();
            console.log("[VALIDATION] Dados do ingresso recebidos:", data);
            
            if (!data.success) {
                throw new Error(data.error || "Falha ao buscar informações do ingresso");
            }
            
            return {
                ticketId: registrationId,
                participantName: data.participantName,
                ownerAddress: data.ownerAddress,
                ownerName: data.ownerName,
                eventName: data.eventName,
                isRedeemed: data.isRedeemed || false,
                rawData: data
            };
            
        } catch (error) {
            console.error("[VALIDATION] Erro ao buscar informações:", error);
            throw error;
        }
    };

    // Função principal de escaneamento
    const handleScanOrSearch = async (registrationId) => {
        if (!registrationId) {
            toast.error("ID do ingresso inválido");
            return;
        }

        // Validação básica do UUID
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(registrationId)) {
            toast.error("ID do ingresso em formato inválido");
            return;
        }

        // Pausar scanner temporariamente para evitar múltiplas leituras
        setIsScannerPaused(true);
        const loadingToast = toast.loading("Buscando informações do ingresso...");
        
        try {
            const ticketInfo = await fetchTicketInfo(registrationId);
            
            // Se o ingresso já foi validado, mostra alerta e retorna
            if (ticketInfo.isRedeemed) {
                toast.error("Este ingresso já foi validado anteriormente!", { id: loadingToast });
                setIsScannerPaused(false);
                return;
            }

            setTicketData(ticketInfo);
            setPendingValidation(registrationId);
            setIsModalOpen(true);
            
            toast.success("Ingresso encontrado! Confirme a validação.", { id: loadingToast });
            
        } catch (error) {
            console.error("[VALIDATION] Erro ao processar ingresso:", error);
            
            // Mensagens de erro específicas
            let errorMessage = "Erro ao buscar informações do ingresso";
            if (error.message.includes("não encontrado")) {
                errorMessage = "Ingresso não encontrado. Verifique o ID.";
            } else if (error.message.includes("formato inválido")) {
                errorMessage = "ID do ingresso em formato inválido.";
            } else {
                errorMessage = error.message || errorMessage;
            }
            
            toast.error(errorMessage, { id: loadingToast });
            setIsScannerPaused(false); // Retomar scanner em caso de erro
        }
    };

    // Função para confirmar validação
    const handleConfirmValidation = async () => {
        if (!pendingValidation || !publicKey) {
            toast.error("Dados insuficientes para validação");
            return;
        }

        setIsValidating(true);
        const loadingToast = toast.loading("Validando ingresso na blockchain...");

        try {
            console.log("[VALIDATION] Iniciando validação para:", pendingValidation);
            
            if (isAuthenticated && loginType) {
                console.log("[VALIDATION] Usando autenticação local:", loginType);
                
                let authPayload = { 
                    validatorAddress: publicKey.toString(), 
                    authType: loginType 
                };

                // Preparar authData baseado no tipo de login
                const savedCredentials = localStorage.getItem('solana-local-wallet-credentials');
                
                if (savedCredentials) {
                    const credentials = JSON.parse(savedCredentials);
                    
                    if (loginType === 'credentials') {
                        const { username, password } = credentials;
                        authPayload.authData = { username, password };
                    } else if (loginType === 'seedphrase') {
                        const { seedPhrase } = credentials;
                        authPayload.authData = { seedWords: seedPhrase };
                    } else if (loginType === 'privateKey') {
                        const { privateKey } = credentials;
                        authPayload.authData = { privateKey };
                    }
                }

                console.log("[VALIDATION] Enviando requisição de validação...");
                const response = await fetch(`${API_URL}/api/validations/validate-by-id/${pendingValidation}`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(authPayload),
                });

                const result = await response.json();
                console.log("[VALIDATION] Resposta do servidor:", result);
                
                if (!response.ok || !result.success) {
                    throw new Error(result.error || result.details || "Falha na validação via API.");
                }

                toast.success(`✅ Entrada liberada para ${result.participantName}!`, { 
                    id: loadingToast, 
                    duration: 3000 
                });
                
                // Atualizar lista e fechar modal
                fetchRecentEntries();
                handleCloseModal();

            } else {
                toast.error("Faça login com suas credenciais para validar ingressos.", { 
                    id: loadingToast, 
                    duration: 5000 
                });
                setIsValidating(false);
                setIsScannerPaused(false);
            }
        } catch (error) {
            console.error("[VALIDATION] Erro ao validar ingresso:", error);
            
            if (error.message.includes("autenticação") || error.message.includes("Auth") || error.message.includes("Signature")) {
                toast.error("🔐 Erro de autenticação. Verifique suas credenciais.", { id: loadingToast });
            } else if (error.message.includes("já foi validado")) {
                toast.error("🎫 Este ingresso já foi validado!", { id: loadingToast });
            } else {
                toast.error(`❌ Falha na validação: ${error.message}`, { id: loadingToast });
            }
            setIsValidating(false);
            setIsScannerPaused(false);
        }
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setPendingValidation(null);
        setTicketData(null);
        setIsValidating(false);
        
        // Retomar o scanner após um pequeno delay
        setTimeout(() => {
            setIsScannerPaused(false);
        }, 500);
    };

    // Estados de carregamento
    if (!connected) {
        return ( 
            <div className="flex flex-col justify-center items-center h-screen bg-slate-100 text-center p-4"> 
                <ShieldExclamationIcon className="h-16 w-16 text-slate-500" /> 
                <h1 className="mt-4 text-2xl font-bold">Área do Validador</h1> 
                <p className="mt-2 text-slate-600">Conecte sua carteira para continuar.</p> 
                <div className="mt-6">
                    <WalletMultiButton />
                </div>
            </div>
        );
    }
    
    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-screen bg-slate-100">
                <ClockIcon className="h-12 w-12 text-slate-500 animate-spin"/>
                <span className="ml-4 text-slate-600">Verificando permissões...</span>
            </div>
        );
    }
    
    if (!isValidator) {
        return (
            <div className="flex flex-col justify-center items-center h-screen bg-slate-100 text-center p-4 text-red-600"> 
                <ShieldExclamationIcon className="h-16 w-16" /> 
                <h1 className="mt-4 text-2xl font-bold">Acesso Negado</h1>
                <p className="mt-2">A carteira conectada não é um validador autorizado para este evento.</p>
                <p className="mt-1 text-sm text-slate-600">Endereço: {publicKey.toString().slice(0, 8)}...{publicKey.toString().slice(-8)}</p>
                {eventName && (
                    <p className="mt-1 text-sm text-slate-600">Evento: {eventName}</p>
                )}
            </div>
        );
    }
    
    return (
        <div className="bg-slate-50 min-h-screen">
 

            <main className="container mx-auto p-4 md:p-8 grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow-md">
                    <ScannerView 
                        onScan={handleScanOrSearch} 
                        onManualSearch={handleScanOrSearch}
                        isPaused={isScannerPaused}
                    />
                </div>
                
                <div className="space-y-8">
                    <div className="bg-white p-6 rounded-lg shadow-md">
                        <h2 className="text-lg font-bold text-slate-800 mb-4">Estatísticas</h2>
                        <div className="space-y-4">
                            <StatCard 
                                title="Ingressos Validados" 
                                value={recentEntries.length} 
                                icon={UserGroupIcon} 
                                color="bg-green-500" 
                            />
                     
                        </div>
                    </div>
                    
                    <div className="bg-white p-6 rounded-lg shadow-md">
                        <RecentValidations entries={recentEntries} />
                    </div>
                </div>
            </main>

            {/* Modal de Confirmação */}
            <ValidationModal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                onConfirm={handleConfirmValidation}
                ticketData={ticketData}
                isLoading={isValidating}
            />
        </div>
    );
}
