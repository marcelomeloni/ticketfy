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
                if (pollIntervalId) {
                    clearInterval(pollIntervalId);
                    setPollIntervalId(null);
                }
            }
        };
    }, [isOpen]);

    const generateQRCode = async () => {
        setIsLoading(true);
        try {
            const response = await fetch(`${API_URL}/api/payments/generate-payment-qr`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
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

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `Erro de servidor: ${response.status}`);
            }

            const data = await response.json();
            
            if (data.success) {
                setQrCodeData(data);
                setExternalReference(data.externalReference);
                startPaymentPolling(data.externalReference);
            } else {
                throw new Error(data.error || 'Falha ao gerar o QR Code');
            }
        } catch (error) {
            console.error('Error generating QR code:', error);
            toast.error(error.message || 'Erro ao gerar QR Code. Tente novamente.');
            onClose();
        } finally {
            setIsLoading(false);
        }
    };

    const startPaymentPolling = (externalRef) => {
        const intervalId = setInterval(async () => {
            try {
                const response = await fetch(`${API_URL}/api/payment-status/${externalRef}`);
                const data = await response.json();
                
                if (data.paid) {
                    clearInterval(intervalId);
                    setPaymentStatus('paid');
                    toast.success('Pagamento confirmado! Processando seu ingresso...');
                    
                    // Process the paid ticket
                    setTimeout(async () => {
                        try {
                            const processResponse = await fetch(`${API_URL}/api/payments/process-paid-ticket`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ externalReference: externalRef })
                            });
                            
                            const processData = await processResponse.json();
                            
                            if (processData.success) {
                                onPaymentSuccess(processData.ticketData);
                            } else {
                                toast.error('Erro ao processar ingresso após pagamento.');
                            }
                        } catch (processError) {
                            console.error('Error processing ticket:', processError);
                            toast.error('Erro ao processar ingresso.');
                        }
                    }, 1500);
                } else if (data.status === 'cancelled' || data.status === 'expired') {
                    clearInterval(intervalId);
                    setPaymentStatus('expired');
                    toast.error('Pagamento expirado ou cancelado.');
                }
            } catch (error) {
                console.error('Error polling payment status:', error);
            }
        }, 5000);

        setPollIntervalId(intervalId);
        
        // Cleanup interval on unmount
        return () => clearInterval(intervalId);
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
                    if (pollIntervalId) clearInterval(pollIntervalId);
                    toast.error('Tempo para pagamento expirado.');
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [isOpen, paymentStatus, qrCodeData, pollIntervalId]);

    if (!isOpen || !mounted) return null;

    const modalContent = (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black bg-opacity-70 backdrop-blur-sm">
            <div className="bg-white rounded-2xl w-full max-w-md mx-auto shadow-2xl relative">
                <div className="bg-gradient-to-br from-indigo-700 to-purple-600 p-6 text-white relative rounded-t-2xl">
                    <button 
                        onClick={onClose} 
                        className="absolute top-4 right-4 text-white hover:text-gray-200 p-1 transition-colors rounded-full bg-white bg-opacity-10 hover:bg-opacity-20"
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
                            <div className="text-3xl font-bold">R$ {tierPrice.toFixed(2)}</div>
                            <div className="text-indigo-200 text-sm">Valor total</div>
                        </div>
                    </div>
                </div>

                <div className="p-6">
                {paymentStatus === 'pending' && (
    <div className="text-center mb-6">
        {isLoading ? (
            <div className="flex justify-center items-center h-48">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        ) : qrCodeData ? (
            <>
                {/* ✅ CORREÇÃO: Mostrar QR Code se disponível, senão mostrar botão para URL */}
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
                            1. Escaneie o QR Code com seu app bancário
                        </p>
                        
                        {qrCodeData.qrCode && (
                            <button 
                                onClick={handleCopyPixCode} 
                                className="w-full flex items-center justify-center px-4 py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-500 transition-colors shadow-md mb-3"
                            >
                                <DocumentDuplicateIcon className="w-5 h-5 mr-2" />
                                {copied ? 'Código Copiado!' : '2. Copiar Código PIX'}
                            </button>
                        )}
                    </>
                ) : qrCodeData.ticketUrl ? (
                    // ✅ FALLBACK: Botão para página de pagamento
                    <div className="space-y-4">
                        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-4">
                            <p className="text-yellow-800 text-sm">
                                ⚠️ QR Code não disponível. Clique abaixo para ir para a página de pagamento.
                            </p>
                        </div>
                        <a 
                            href={qrCodeData.ticketUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full flex items-center justify-center px-4 py-3 bg-green-600 text-white font-semibold rounded-xl hover:bg-green-500 transition-colors shadow-md"
                        >
                            🔗 Abrir Página de Pagamento
                        </a>
                        <p className="text-gray-500 text-xs">
                            Você será redirecionado para o Mercado Pago para concluir o pagamento PIX
                        </p>
                    </div>
                ) : (
                    <div className="bg-gray-100 p-8 rounded-xl border-2 border-slate-200 inline-block shadow-lg mb-4">
                        <p className="text-gray-500 text-sm">QR Code não disponível</p>
                    </div>
                )}
                
                {/* Mostrar código PIX se disponível */}
                {qrCodeData.qrCode && (
                    <div className="text-xs text-gray-500 bg-slate-100 p-3 rounded-lg break-all">
                        <span className="font-mono">
                            {qrCodeData.qrCode.substring(0, 60)}...
                        </span>
                    </div>
                )}
            </>
        ) : (
            <div className="text-center text-gray-500 h-48 flex items-center justify-center">
                Falha ao carregar QR Code
            </div>
        )}
    </div>
)}
                    
                    {paymentStatus === 'expired' && (
                        <div className="mb-6 p-4 bg-red-100 border border-red-300 rounded-xl text-center shadow-md">
                            <p className="text-red-800 font-bold text-lg">Pagamento Expirado</p>
                            <p className="text-red-600 text-sm mt-1">
                                Por favor, feche e tente novamente.
                            </p>
                        </div>
                    )}
                    
                    {paymentStatus === 'paid' && (
                        <div className="mb-6 p-4 bg-green-100 border border-green-300 rounded-xl text-center shadow-md">
                            <div className="flex items-center justify-center gap-2">
                                <CheckIcon className="w-6 h-6 text-green-700" />
                                <p className="text-green-800 font-bold text-lg">Confirmado!</p>
                            </div>
                            <p className="text-green-600 text-sm mt-1">
                                Processando seu ingresso NFT...
                            </p>
                        </div>
                    )}
                    
                    {paymentStatus === 'pending' && (
                        <div className="text-center mb-6">
                            {isLoading ? (
                                <div className="flex justify-center items-center h-48">
                                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                                </div>
                            ) : qrCodeData ? (
                                <>
                                    {/* ✅ CORREÇÃO: Verificar se qrCodeBase64 existe antes de renderizar */}
                                    {qrCodeData.qrCodeBase64 ? (
                                        <div className="bg-white p-4 rounded-xl border-2 border-slate-200 inline-block shadow-lg mb-4">
                                            <img 
                                                src={`data:image/png;base64,${qrCodeData.qrCodeBase64}`} 
                                                alt="QR Code PIX" 
                                                className="w-48 h-48" 
                                            />
                                        </div>
                                    ) : (
                                        <div className="bg-gray-100 p-8 rounded-xl border-2 border-slate-200 inline-block shadow-lg mb-4">
                                            <p className="text-gray-500 text-sm">QR Code não disponível</p>
                                        </div>
                                    )}
                                    
                                    <p className="text-gray-600 text-sm mb-4 font-medium">
                                        1. Escaneie o QR Code com seu app bancário
                                    </p>
                                    
                                    {/* ✅ CORREÇÃO: Botão de copiar só aparece se tiver qrCode */}
                                    {qrCodeData.qrCode && (
                                        <button 
                                            onClick={handleCopyPixCode} 
                                            className="w-full flex items-center justify-center px-4 py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-500 transition-colors shadow-md mb-3"
                                        >
                                            <DocumentDuplicateIcon className="w-5 h-5 mr-2" />
                                            {copied ? 'Código Copiado!' : '2. Copiar Código PIX'}
                                        </button>
                                    )}
                                    
                                    {/* ✅ CORREÇÃO: Mostrar código PIX apenas se disponível */}
                                    {qrCodeData.qrCode && (
                                        <div className="text-xs text-gray-500 bg-slate-100 p-3 rounded-lg break-all">
                                            <span className="font-mono">
                                                {qrCodeData.qrCode.substring(0, 60)}...
                                            </span>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="text-center text-gray-500 h-48 flex items-center justify-center">
                                    Falha ao carregar QR Code
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="p-6 border-t border-slate-200 bg-slate-50 rounded-b-2xl">
                    <button 
                        onClick={onClose} 
                        className="w-full py-3 px-4 bg-gray-500 text-white font-bold rounded-xl hover:bg-gray-600 transition-colors shadow-md"
                    >
                        {paymentStatus === 'pending' ? 'Cancelar' : 'Fechar'}
                    </button>
                </div>
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
};