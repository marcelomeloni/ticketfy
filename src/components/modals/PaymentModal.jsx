import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { QRCodeSVG } from 'qrcode.react';
import { 
    DocumentDuplicateIcon, 
    CheckIcon, 
    ClockIcon,
    XMarkIcon,
    CurrencyDollarIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast'; 

export const PaymentModal = ({ 
    isOpen, 
    onClose, 
    onPaymentSuccess,
    tierPrice,
    eventName,
    tierName,
    onCryptoPayment
}) => {
    const [copied, setCopied] = useState(false);
    const [timeLeft, setTimeLeft] = useState(15 * 60);
    const [paymentStatus, setPaymentStatus] = useState('pending');
    const [mounted, setMounted] = useState(false);

    // Garantir que o componente está montado para usar o portal
    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    // Dados mockados do PIX
    const pixData = {
        key: "00020126580014br.gov.bcb.pix0136123e4567-e89b-12d3-a456-4266141740005204000053039865406" + 
            (tierPrice * 100).toFixed(0).padStart(2, '0') + 
            "5802BR5913Event Ticket6009Sao Paulo62290525mpqr123456789abcdefghijklmn6304A1B2",
        qrCode: "00020126580014br.gov.bcb.pix0136123e4567-e89b-12d3-a456-4266141740005204000053039865406" + 
            (tierPrice * 100).toFixed(0).padStart(2, '0') + 
            "5802BR5913Event Ticket6009Sao Paulo62290525mpqr123456789abcdefghijklmn6304A1B2",
        transactionId: "TX" + Date.now(),
        amount: tierPrice
    };

    // Reseta o estado quando o modal é aberto
    useEffect(() => {
        if (isOpen) {
            setTimeLeft(15 * 60);
            setPaymentStatus('pending');
            setCopied(false);
        }
    }, [isOpen]);

    // Simulação de verificação de pagamento - MODIFICADA
useEffect(() => {
  if (!isOpen || paymentStatus !== 'pending') return;

  // Timer de 5 segundos para considerar como pago
  const paymentTimer = setTimeout(() => {
      setPaymentStatus('paid');
      setTimeout(() => {
          onPaymentSuccess();
      }, 2000);
  }, 5000); // 5 segundos

  return () => clearTimeout(paymentTimer);
}, [isOpen, paymentStatus, onPaymentSuccess]);

  

    const handleCopyPixCode = async () => {
        try {
            await navigator.clipboard.writeText(pixData.key);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Falha ao copiar código PIX:', err);
            toast.error("Falha ao copiar. Por favor, selecione e copie manualmente o código PIX.");
        }
    };

    const formatTime = (seconds) => {
        const minutes = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    if (!isOpen || !mounted) return null;

    // Conteúdo do modal
    const modalContent = (
        <div 
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black bg-opacity-70 backdrop-blur-sm"
            onClick={onClose} // Fecha ao clicar no backdrop
        >
            <div 
                className="bg-white rounded-2xl w-full max-w-md mx-auto shadow-2xl relative max-h-[90vh] overflow-hidden transform transition-all"
                onClick={(e) => e.stopPropagation()} // Impede fechamento ao clicar no conteúdo
            >
                
                {/* Header com Preço */}
                <div className="bg-gradient-to-br from-indigo-700 to-purple-600 p-6 text-white relative">
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 text-white hover:text-gray-200 p-1 transition-colors rounded-full bg-white bg-opacity-10 hover:bg-opacity-20"
                        aria-label="Fechar Pagamento"
                    >
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                    
                    <div className="flex justify-between items-start">
                        <div className="flex-1">
                            <h2 className="text-xl font-bold">Pagamento PIX</h2>
                            <p className="text-indigo-200 text-sm mt-1 truncate">{eventName}</p>
                            <p className="text-indigo-200 text-sm">Ingresso: {tierName}</p>
                        </div>
                        
                        {/* ✅ PREÇO ADICIONADO DE VOLTA */}
                        <div className="text-right ml-4">
                            <div className="text-3xl font-bold">R$ {tierPrice.toFixed(2)}</div>
                            <div className="text-indigo-200 text-sm">Valor total</div>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
                    
                    {/* Status Box & Timer */}
                    {paymentStatus === 'pending' && (
                        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-xl flex items-center justify-center shadow-sm">
                            <ClockIcon className="w-5 h-5 text-yellow-700 mr-2" />
                            <span className="text-yellow-900 font-bold text-sm">
                                Expira em: {formatTime(timeLeft)}
                            </span>
                        </div>
                    )}

                    {paymentStatus === 'expired' && (
                        <div className="mb-6 p-4 bg-red-100 border border-red-300 rounded-xl text-center shadow-md">
                            <p className="text-red-800 font-bold text-lg">Pagamento Expirado</p>
                            <p className="text-red-600 text-sm mt-1">
                                Por favor, inicie uma nova transação.
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

                    {/* QR Code & Copy */}
                    {paymentStatus === 'pending' && (
                        <div className="text-center mb-6">
                            <div className="bg-white p-4 rounded-xl border-2 border-slate-200 inline-block shadow-lg mb-4">
                                <QRCodeSVG 
                                    value={pixData.qrCode} 
                                    size={180}
                                    level="M"
                                    includeMargin={false}
                                />
                            </div>
                            
                            <p className="text-gray-600 text-sm mb-4 font-medium">
                                1. Escaneie o QR Code com seu app bancário
                            </p>
                            
                            <button
                                onClick={handleCopyPixCode}
                                className="w-full flex items-center justify-center px-4 py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-500 transition-colors shadow-md mb-3"
                            >
                                <DocumentDuplicateIcon className="w-5 h-5 mr-2" />
                                {copied ? 'Código Copiado!' : '2. Copiar Código PIX'}
                            </button>
                            
                            <div className="text-xs text-gray-500 bg-slate-100 p-3 rounded-lg break-all">
                                <span className="font-mono">{pixData.key.substring(0, 60)}...</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer/Action Buttons */}
                <div className="p-6 border-t border-slate-200 bg-slate-50">
                    {paymentStatus === 'pending' && (
                        <div className="flex gap-3">
                            <button
                                onClick={onClose}
                                className="flex-1 py-3 px-4 bg-gray-500 text-white font-bold rounded-xl hover:bg-gray-600 transition-colors shadow-md"
                            >
                                Cancelar
                            </button>
                            
                            <button
                                onClick={onCryptoPayment}
                                className="flex-1 py-3 px-4 border-2 border-indigo-600 text-indigo-600 font-bold rounded-xl hover:bg-indigo-50 transition-colors shadow-sm flex items-center justify-center gap-2"
                            >
                                <CurrencyDollarIcon className="h-5 w-5"/> Cripto
                            </button>
                        </div>
                    )}

                    {(paymentStatus === 'expired' || paymentStatus === 'paid') && (
                        <button
                            onClick={onClose}
                            className="w-full py-3 px-4 bg-gray-500 text-white font-bold rounded-xl hover:bg-gray-600 transition-colors shadow-md"
                        >
                            {paymentStatus === 'expired' ? 'Fechar' : 'Continuar'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );

    // Renderizar via portal para garantir que fique acima de tudo
    return createPortal(modalContent, document.body);
};