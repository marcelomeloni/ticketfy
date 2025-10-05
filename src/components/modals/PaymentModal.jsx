import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
    DocumentDuplicateIcon, 
    CheckIcon, 
    ClockIcon,
    XMarkIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { API_URL } from '@/lib/constants';
import QRCode from 'qrcode';

export const PaymentModal = ({ 
    isOpen, 
    onClose, 
    onPaymentSuccess,
    tierPrice,
    eventName,
    tierName,
    formData,
    eventAddress,
    tierIndex
}) => {
    const [copied, setCopied] = useState(false);
    const [timeLeft, setTimeLeft] = useState(15 * 60);
    const [paymentStatus, setPaymentStatus] = useState('pending');
    const [mounted, setMounted] = useState(false);
    const [qrCodeData, setQrCodeData] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [externalReference, setExternalReference] = useState(null);
    const [pollIntervalId, setPollIntervalId] = useState(null);
    const [retryCount, setRetryCount] = useState(0);
    const [generatedQrCode, setGeneratedQrCode] = useState(null);
    const [isGeneratingQr, setIsGeneratingQr] = useState(false);
    
    const canvasRef = useRef(null);

    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    useEffect(() => {
        if (isOpen && !qrCodeData) {
            generateQRCode();
        }
        
        // Cleanup when modal closes
        return () => {
            if (!isOpen) {
                setQrCodeData(null);
                setPaymentStatus('pending');
                setTimeLeft(15 * 60);
                setRetryCount(0);
                setGeneratedQrCode(null);
                if (pollIntervalId) {
                    clearInterval(pollIntervalId);
                    setPollIntervalId(null);
                }
            }
        };
    }, [isOpen]);

    // ✅ FUNÇÃO PARA GERAR QR CODE DA URL NO FRONTEND
    const generateFrontendQRCode = async (url) => {
        if (!url) return null;
        
        setIsGeneratingQr(true);
        try {
            console.log('🎨 Gerando QR Code frontend para URL:', url.substring(0, 100) + '...');
            
            // Opção 1: Gerar como Data URL (base64)
            const qrCodeDataUrl = await QRCode.toDataURL(url, {
                width: 256,
                margin: 2,
                color: {
                    dark: '#000000',
                    light: '#FFFFFF'
                }
            });
            
            // Opção 2: Gerar como canvas (mais controle)
            if (canvasRef.current) {
                await QRCode.toCanvas(canvasRef.current, url, {
                    width: 200,
                    margin: 1,
                    color: {
                        dark: '#1f2937',
                        light: '#ffffff'
                    }
                });
            }
            
            console.log('✅ QR Code gerado com sucesso no frontend');
            return qrCodeDataUrl;
            
        } catch (error) {
            console.error('❌ Erro ao gerar QR Code frontend:', error);
            return null;
        } finally {
            setIsGeneratingQr(false);
        }
    };

    const generateQRCode = async () => {
        if (retryCount >= 2) {
            toast.error('Máximo de tentativas atingido. Tente novamente mais tarde.');
            return;
        }

        setIsLoading(true);
        try {
            console.log('🔄 Gerando QR Code para:', { eventAddress, tierIndex, tierPrice });
            
            const response = await fetch(`${API_URL}/api/payments/generate-payment-qr`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    eventAddress,
                    tierIndex,
                    priceBRLCents: Math.round(tierPrice * 100),
                    userName: formData.name,
                    userEmail: formData.email,
                    tierName,
                    eventName,
                    formData
                }),
            });

            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || data.details || `Erro de servidor: ${response.status}`);
            }

            if (data.success) {
                console.log('✅ QR Code gerado com sucesso:', {
                    hasQrCode: !!data.qrCode,
                    hasQrCodeBase64: !!data.qrCodeBase64,
                    hasTicketUrl: !!data.ticketUrl,
                    externalReference: data.externalReference
                });

                // ✅ SE NÃO VEIO QR CODE DO BACKEND, GERAR NO FRONTEND
                let frontendQrCode = null;
                if (!data.qrCodeBase64 && data.ticketUrl) {
                    console.log('🔄 Nenhum QR Code do backend, gerando no frontend...');
                    frontendQrCode = await generateFrontendQRCode(data.ticketUrl);
                }

                setQrCodeData({
                    ...data,
                    // ✅ SOBRESCREVER COM QR CODE GERADO NO FRONTEND SE NECESSÁRIO
                    qrCodeBase64: data.qrCodeBase64 || frontendQrCode?.replace('data:image/png;base64,', ''),
                    frontendQrCode: frontendQrCode
                });
                
                setExternalReference(data.externalReference);
                startPaymentPolling(data.externalReference);
                setRetryCount(0);
            } else {
                throw new Error(data.error || 'Falha ao gerar o QR Code');
            }
        } catch (error) {
            console.error('❌ Error generating QR code:', error);
            
            if (retryCount < 2) {
                const newRetryCount = retryCount + 1;
                setRetryCount(newRetryCount);
                toast.error(`Tentativa ${newRetryCount}/3: ${error.message}`);
                
                setTimeout(() => {
                    generateQRCode();
                }, 2000);
            } else {
                toast.error(error.message || 'Erro ao gerar QR Code. Tente novamente.');
                onClose();
            }
        } finally {
            setIsLoading(false);
        }
    };

    const startPaymentPolling = (externalRef) => {
        if (pollIntervalId) {
            clearInterval(pollIntervalId);
        }

        const intervalId = setInterval(async () => {
            try {
                console.log('🔍 Verificando status do pagamento:', externalRef);
                const response = await fetch(`${API_URL}/api/payments/payment-status/${externalRef}`);
                
                if (!response.ok) {
                    if (response.status === 404) {
                        console.log('⏳ Endpoint de status não encontrado, continuando polling...');
                        return; // Continua tentando mesmo com 404
                    }
                    throw new Error(`Erro ao verificar status: ${response.status}`);
                }

                const data = await response.json();
                
                if (data.paid) {
                    console.log('💰 Pagamento confirmado!', data);
                    clearInterval(intervalId);
                    setPaymentStatus('paid');
                    toast.success('Pagamento confirmado! Processando seu ingresso...');
                    
                    await processPaidTicket(externalRef);
                } else if (data.status === 'cancelled' || data.status === 'expired' || data.status === 'rejected') {
                    console.log('❌ Pagamento expirado/cancelado:', data.status);
                    clearInterval(intervalId);
                    setPaymentStatus('expired');
                    toast.error('Pagamento expirado ou cancelado.');
                } else {
                    console.log('⏳ Pagamento ainda pendente...');
                }
            } catch (error) {
                console.error('Erro ao verificar status do pagamento:', error);
                // Não para o polling em caso de erro
            }
        }, 5000);

        setPollIntervalId(intervalId);
        
        return () => clearInterval(intervalId);
    };

    const processPaidTicket = async (externalRef) => {
        try {
            console.log('🎫 Processando ingresso pago...');
            const processResponse = await fetch(`${API_URL}/api/payments/process-paid-ticket`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ externalReference: externalRef })
            });
            
            const processData = await processResponse.json();
            
            if (processData.success) {
                console.log('✅ Ingresso processado com sucesso:', processData);
                onPaymentSuccess(processData.ticketData);
            } else {
                console.error('❌ Erro ao processar ingresso:', processData);
                toast.error('Erro ao processar ingresso após pagamento.');
            }
        } catch (processError) {
            console.error('❌ Error processing ticket:', processError);
            toast.error('Erro ao processar ingresso.');
        }
    };

    const handleCopyPixCode = async () => {
        // Se tiver URL de pagamento, copiar ela
        const textToCopy = qrCodeData?.ticketUrl || qrCodeData?.qrCode;
        
        if (!textToCopy) {
            toast.error('Nenhum código disponível para copiar.');
            return;
        }
        
        try {
            await navigator.clipboard.writeText(textToCopy);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
            toast.success('Link de pagamento copiado! Cole no seu app bancário.');
        } catch (err) {
            console.error('Falha ao copiar:', err);
            const textArea = document.createElement('textarea');
            textArea.value = textToCopy;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            toast.success('Link de pagamento copiado!');
        }
    };

    const handleRetry = () => {
        setQrCodeData(null);
        setPaymentStatus('pending');
        setTimeLeft(15 * 60);
        setGeneratedQrCode(null);
        generateQRCode();
    };

    const formatTime = (seconds) => {
        const minutes = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    useEffect(() => {
        if (!isOpen || paymentStatus !== 'pending' || !qrCodeData) return;

        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    setPaymentStatus('expired');
                    if (pollIntervalId) {
                        clearInterval(pollIntervalId);
                        setPollIntervalId(null);
                    }
                    toast.error('Tempo para pagamento expirado.');
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [isOpen, paymentStatus, qrCodeData, pollIntervalId]);

    // ✅ RENDERIZAÇÃO DO QR CODE
    const renderQRCode = () => {
        if (!qrCodeData) return null;

        // ✅ CASO 1: QR Code Base64 do Backend
        if (qrCodeData.qrCodeBase64) {
            return (
                <div className="bg-white p-4 rounded-xl border-2 border-slate-200 inline-block shadow-lg mb-4">
                    <img 
                        src={`data:image/png;base64,${qrCodeData.qrCodeBase64}`} 
                        alt="QR Code PIX" 
                        className="w-48 h-48" 
                    />
                </div>
            );
        }

        // ✅ CASO 2: QR Code Gerado no Frontend
        if (qrCodeData.frontendQrCode) {
            return (
                <div className="bg-white p-4 rounded-xl border-2 border-slate-200 inline-block shadow-lg mb-4">
                    <img 
                        src={qrCodeData.frontendQrCode} 
                        alt="QR Code PIX" 
                        className="w-48 h-48" 
                    />
                </div>
            );
        }

        // ✅ CASO 3: Canvas Fallback
        return (
            <div className="bg-white p-4 rounded-xl border-2 border-slate-200 inline-block shadow-lg mb-4">
                <canvas 
                    ref={canvasRef}
                    className="w-48 h-48"
                />
            </div>
        );
    };

    if (!isOpen || !mounted) return null;

    const modalContent = (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black bg-opacity-70 backdrop-blur-sm">
            <div className="bg-white rounded-2xl w-full max-w-md mx-auto shadow-2xl relative">
                {/* Header */}
                <div className="bg-gradient-to-br from-indigo-700 to-purple-600 p-6 text-white relative rounded-t-2xl">
                    <button 
                        onClick={onClose} 
                        className="absolute top-4 right-4 text-white hover:text-gray-200 p-1 transition-colors rounded-full bg-white bg-opacity-10 hover:bg-opacity-20"
                        disabled={paymentStatus === 'paid'}
                    >
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                    <div className="flex justify-between items-start">
                        <div className="flex-1">
                            <h2 className="text-xl font-bold">Pagamento PIX</h2>
                            <p className="text-indigo-200 text-sm mt-1 truncate">{eventName}</p>
                            <p className="text-indigo-200 text-sm">Ingresso: {tierName}</p>
                        </div>
                        <div className="text-right ml-4">
                            <div className="text-2xl font-bold">R$ {tierPrice.toFixed(2)}</div>
                            <div className="text-indigo-200 text-xs">Valor total</div>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6">
                    {paymentStatus === 'paid' && (
                        <div className="mb-6 p-6 bg-green-50 border border-green-200 rounded-xl text-center shadow-md">
                            <div className="flex items-center justify-center gap-3 mb-3">
                                <CheckIcon className="w-8 h-8 text-green-600" />
                                <p className="text-green-800 font-bold text-lg">Pagamento Confirmado!</p>
                            </div>
                            <p className="text-green-600 text-sm">
                                Seu ingresso está sendo processado...
                            </p>
                        </div>
                    )}

                    {paymentStatus === 'expired' && (
                        <div className="mb-6 p-6 bg-red-50 border border-red-200 rounded-xl text-center shadow-md">
                            <p className="text-red-800 font-bold text-lg mb-2">Pagamento Expirado</p>
                            <button 
                                onClick={handleRetry}
                                className="w-full py-3 px-4 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-colors shadow-md"
                            >
                                Tentar Novamente
                            </button>
                        </div>
                    )}

                    {paymentStatus === 'pending' && (
                        <div className="text-center mb-6">
                            {isLoading || isGeneratingQr ? (
                                <div className="flex flex-col justify-center items-center h-48">
                                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-3"></div>
                                    <p className="text-gray-600">
                                        {isGeneratingQr ? 'Gerando QR Code...' : 'Gerando pagamento...'}
                                    </p>
                                </div>
                            ) : qrCodeData ? (
                                <>
                                    {/* ✅ QR CODE - AGORA SEMPRE DISPONÍVEL */}
                                    {renderQRCode()}
                                    
                                    <p className="text-gray-600 text-sm mb-4 font-medium">
                                        1. Escaneie o QR Code com seu app bancário
                                    </p>

                                    {/* BOTÃO COPIAR CÓDIGO */}
                                    <button 
                                        onClick={handleCopyPixCode} 
                                        className="w-full flex items-center justify-center px-4 py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-500 transition-colors shadow-md mb-3"
                                    >
                                        <DocumentDuplicateIcon className="w-5 h-5 mr-2" />
                                        {copied ? 'Link Copiado!' : '2. Copiar Link PIX'}
                                    </button>

                                    {/* LINK ALTERNATIVO */}
                                    {qrCodeData.ticketUrl && (
                                        <div className="mt-4">
                                            <a 
                                                href={qrCodeData.ticketUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="block w-full text-center px-4 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-500 transition-colors text-sm"
                                            >
                                                🔗 Abrir Página de Pagamento
                                            </a>
                                            <p className="text-gray-500 text-xs mt-2">
                                                Se preferir, abra a página completa do Mercado Pago
                                            </p>
                                        </div>
                                    )}

                                    {/* TIMER */}
                                    <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                                        <div className="flex items-center justify-center gap-2 text-orange-800">
                                            <ClockIcon className="w-4 h-4" />
                                            <span className="text-sm font-medium">Tempo restante:</span>
                                            <span className="font-mono font-bold">{formatTime(timeLeft)}</span>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="text-center text-gray-500 h-48 flex flex-col items-center justify-center">
                                    <p>Falha ao carregar dados de pagamento</p>
                                    <button 
                                        onClick={handleRetry}
                                        className="mt-3 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-sm"
                                    >
                                        Tentar Novamente
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-slate-200 bg-slate-50 rounded-b-2xl">
                    <button 
                        onClick={onClose} 
                        className="w-full py-3 px-4 bg-gray-500 text-white font-bold rounded-xl hover:bg-gray-600 transition-colors shadow-md"
                        disabled={paymentStatus === 'paid'}
                    >
                        {paymentStatus === 'pending' ? 'Cancelar' : 'Fechar'}
                    </button>
                </div>
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
};
