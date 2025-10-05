import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
    DocumentDuplicateIcon, 
    CheckIcon, 
    ClockIcon,
    XMarkIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { API_URL } from '@/lib/constants';

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
                if (pollIntervalId) {
                    clearInterval(pollIntervalId);
                    setPollIntervalId(null);
                }
            }
        };
    }, [isOpen]);

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

                setQrCodeData(data);
                setExternalReference(data.externalReference);
                startPaymentPolling(data.externalReference);
                setRetryCount(0); // Reset retry count on success
            } else {
                throw new Error(data.error || 'Falha ao gerar o QR Code');
            }
        } catch (error) {
            console.error('❌ Error generating QR code:', error);
            
            if (retryCount < 2) {
                const newRetryCount = retryCount + 1;
                setRetryCount(newRetryCount);
                toast.error(`Tentativa ${newRetryCount}/3: ${error.message}`);
                
                // Auto-retry after 2 seconds
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
        // Clear any existing interval
        if (pollIntervalId) {
            clearInterval(pollIntervalId);
        }

        const intervalId = setInterval(async () => {
            try {
                console.log('🔍 Verificando status do pagamento:', externalRef);
                const response = await fetch(`${API_URL}/api/payment-status/${externalRef}`);
                
                if (!response.ok) {
                    throw new Error(`Erro ao verificar status: ${response.status}`);
                }

                const data = await response.json();
                
                if (data.paid) {
                    console.log('💰 Pagamento confirmado!', data);
                    clearInterval(intervalId);
                    setPaymentStatus('paid');
                    toast.success('Pagamento confirmado! Processando seu ingresso...');
                    
                    // Process the paid ticket
                    await processPaidTicket(externalRef);
                } else if (data.status === 'cancelled' || data.status === 'expired') {
                    console.log('❌ Pagamento expirado/cancelado:', data.status);
                    clearInterval(intervalId);
                    setPaymentStatus('expired');
                    toast.error('Pagamento expirado ou cancelado.');
                } else {
                    console.log('⏳ Pagamento ainda pendente...');
                }
            } catch (error) {
                console.error('Erro ao verificar status do pagamento:', error);
            }
        }, 5000);

        setPollIntervalId(intervalId);
        
        // Cleanup interval on unmount
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
        if (!qrCodeData?.qrCode) {
            toast.error('Código PIX não disponível.');
            return;
        }
        
        try {
            await navigator.clipboard.writeText(qrCodeData.qrCode);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
            toast.success('Código PIX copiado!');
        } catch (err) {
            console.error('Falha ao copiar código PIX:', err);
            // Fallback: create a temporary textarea
            const textArea = document.createElement('textarea');
            textArea.value = qrCodeData.qrCode;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            toast.success('Código PIX copiado!');
        }
    };

    const handleRetry = () => {
        setQrCodeData(null);
        setPaymentStatus('pending');
        setTimeLeft(15 * 60);
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

    if (!isOpen || !mounted) return null;

    const renderPaymentContent = () => {
        if (paymentStatus === 'paid') {
            return (
                <div className="mb-6 p-6 bg-green-50 border border-green-200 rounded-xl text-center shadow-md">
                    <div className="flex items-center justify-center gap-3 mb-3">
                        <CheckIcon className="w-8 h-8 text-green-600" />
                        <p className="text-green-800 font-bold text-lg">Pagamento Confirmado!</p>
                    </div>
                    <p className="text-green-600 text-sm">
                        Seu ingresso está sendo processado...
                    </p>
                    <div className="mt-4 animate-pulse">
                        <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-green-600"></div>
                    </div>
                </div>
            );
        }

        if (paymentStatus === 'expired') {
            return (
                <div className="mb-6 p-6 bg-red-50 border border-red-200 rounded-xl text-center shadow-md">
                    <p className="text-red-800 font-bold text-lg mb-2">Pagamento Expirado</p>
                    <p className="text-red-600 text-sm mb-4">
                        O tempo para pagamento acabou. Gere um novo QR Code para tentar novamente.
                    </p>
                    <button 
                        onClick={handleRetry}
                        className="w-full py-3 px-4 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-colors shadow-md"
                    >
                        Tentar Novamente
                    </button>
                </div>
            );
        }

        // Payment pending state
        return (
            <div className="text-center mb-6">
                {isLoading ? (
                    <div className="flex flex-col justify-center items-center h-48">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-3"></div>
                        <p className="text-gray-600">Gerando QR Code PIX...</p>
                        {retryCount > 0 && (
                            <p className="text-sm text-gray-500 mt-1">Tentativa {retryCount + 1}/3</p>
                        )}
                    </div>
                ) : qrCodeData ? (
                    <>
                        {/* ✅ CASO 1: QR Code Base64 (Melhor opção) */}
                        {qrCodeData.qrCodeBase64 ? (
                            <>
                                <div className="bg-white p-4 rounded-xl border-2 border-slate-200 inline-block shadow-lg mb-4">
                                    <img 
                                        src={`data:image/png;base64,${qrCodeData.qrCodeBase64}`} 
                                        alt="QR Code PIX" 
                                        className="w-48 h-48" 
                                    />
                                </div>
                                <p className="text-gray-600 text-sm mb-4 font-medium">
                                    Escaneie o QR Code com seu app bancário
                                </p>
                                
                                {qrCodeData.qrCode && (
                                    <button 
                                        onClick={handleCopyPixCode} 
                                        className="w-full flex items-center justify-center px-4 py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-500 transition-colors shadow-md mb-3"
                                    >
                                        <DocumentDuplicateIcon className="w-5 h-5 mr-2" />
                                        {copied ? 'Código Copiado!' : 'Copiar Código PIX'}
                                    </button>
                                )}
                            </>
                        ) : 
                        
                        /* ✅ CASO 2: QR Code como texto (copia e cola) */
                        qrCodeData.qrCode ? (
                            <>
                                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
                                    <p className="text-blue-800 text-sm mb-3">
                                        📱 Use o código PIX abaixo no seu app bancário
                                    </p>
                                </div>
                                
                                <div className="bg-gray-100 p-4 rounded-xl border-2 border-slate-200 mb-4">
                                    <p className="text-gray-500 text-xs mb-2 font-medium">Código PIX:</p>
                                    <p className="text-sm font-mono break-all bg-white p-3 rounded border text-gray-800">
                                        {qrCodeData.qrCode}
                                    </p>
                                </div>
                                
                                <button 
                                    onClick={handleCopyPixCode} 
                                    className="w-full flex items-center justify-center px-4 py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-500 transition-colors shadow-md mb-3"
                                >
                                    <DocumentDuplicateIcon className="w-5 h-5 mr-2" />
                                    {copied ? 'Código Copiado!' : 'Copiar Código PIX'}
                                </button>
                            </>
                        ) : 
                        
                        /* ✅ CASO 3: URL de pagamento (fallback) */
                        qrCodeData.ticketUrl ? (
                            <div className="space-y-4">
                                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-4">
                                    <p className="text-yellow-800 text-sm">
                                        🔗 Clique abaixo para ir para a página de pagamento PIX
                                    </p>
                                </div>
                                <a 
                                    href={qrCodeData.ticketUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-full flex items-center justify-center px-4 py-3 bg-green-600 text-white font-semibold rounded-xl hover:bg-green-500 transition-colors shadow-md"
                                >
                                    💰 Abrir Pagamento PIX
                                </a>
                                <p className="text-gray-500 text-xs">
                                    Você será redirecionado para finalizar o pagamento via PIX
                                </p>
                            </div>
                        ) : 
                        
                        /* ❌ CASO 4: Nenhum método disponível */
                        (
                            <div className="bg-red-50 border border-red-200 rounded-xl p-6">
                                <p className="text-red-800 font-bold text-lg mb-2">
                                    ❌ Método de Pagamento Indisponível
                                </p>
                                <p className="text-red-600 text-sm mb-4">
                                    Não foi possível gerar o QR Code PIX.
                                </p>
                                <button 
                                    onClick={handleRetry}
                                    className="w-full py-3 px-4 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-colors shadow-md"
                                >
                                    Tentar Novamente
                                </button>
                            </div>
                        )}
                        
                        {/* Timer para todos os casos pendentes */}
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
        );
    };

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
                    {renderPaymentContent()}
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
