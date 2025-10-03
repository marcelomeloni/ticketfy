// src/components/modals/PaymentModal.jsx
import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { 
  DocumentDuplicateIcon, 
  CheckIcon, 
  ClockIcon 
} from '@heroicons/react/24/outline';

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
  const [timeLeft, setTimeLeft] = useState(15 * 60); // 15 minutos em segundos
  const [paymentStatus, setPaymentStatus] = useState('pending'); // pending, paid, expired

  // Dados mockados do PIX (em produção viria da API)
  const pixData = {
    key: "00020126580014br.gov.bcb.pix0136123e4567-e89b-12d3-a456-4266141740005204000053039865406" + 
          (tierPrice * 100).toString().padStart(2, '0') + 
          "5802BR5913Event Ticket6009Sao Paulo62290525mpqr123456789abcdefghijklmn6304A1B2",
    qrCode: "00020126580014br.gov.bcb.pix0136123e4567-e89b-12d3-a456-4266141740005204000053039865406" + 
            (tierPrice * 100).toString().padStart(2, '0') + 
            "5802BR5913Event Ticket6009Sao Paulo62290525mpqr123456789abcdefghijklmn6304A1B2",
    transactionId: "TX" + Date.now(),
    amount: tierPrice
  };

  // Timer de expiração
  useEffect(() => {
    if (!isOpen || paymentStatus !== 'pending') return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setPaymentStatus('expired');
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, paymentStatus]);

  // Simulação de verificação de pagamento (em produção seria WebSocket ou polling)
  useEffect(() => {
    if (!isOpen || paymentStatus !== 'pending') return;

    const checkPayment = async () => {
      // Em produção, aqui faria uma requisição para verificar o status
      // const status = await checkPixPayment(pixData.transactionId);
      
      // Simulação: 20% de chance de pagamento ser detectado a cada 3 segundos
      if (Math.random() < 0.2 && timeLeft < 14 * 60) {
        setPaymentStatus('paid');
        setTimeout(() => {
          onPaymentSuccess();
        }, 2000);
      }
    };

    const interval = setInterval(checkPayment, 3000);
    return () => clearInterval(interval);
  }, [isOpen, paymentStatus, timeLeft, onPaymentSuccess]);

  const handleCopyPixCode = async () => {
    try {
      await navigator.clipboard.writeText(pixData.key);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Falha ao copiar código PIX:', err);
    }
  };

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div className="bg-white rounded-2xl max-w-md w-full mx-auto overflow-hidden shadow-xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-emerald-600 p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Pagamento via PIX</h2>
              <p className="text-green-100 mt-1">{eventName}</p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold">R$ {tierPrice.toFixed(2)}</div>
              <div className="text-green-200 text-sm">{tierName}</div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Timer */}
          <div className="flex items-center justify-center gap-2 mb-6 p-3 bg-orange-50 rounded-lg">
            <ClockIcon className="w-5 h-5 text-orange-600" />
            <span className="text-orange-800 font-semibold">
              Tempo restante: {formatTime(timeLeft)}
            </span>
          </div>

          {paymentStatus === 'expired' && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-center">
              <p className="text-red-800 font-medium">Pagamento expirado</p>
              <p className="text-red-600 text-sm mt-1">
                O tempo para pagamento acabou. Por favor, inicie uma nova compra.
              </p>
            </div>
          )}

          {paymentStatus === 'paid' && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-center">
              <div className="flex items-center justify-center gap-2">
                <CheckIcon className="w-5 h-5 text-green-600" />
                <p className="text-green-800 font-medium">Pagamento confirmado!</p>
              </div>
              <p className="text-green-600 text-sm mt-1">
                Processando seu ingresso...
              </p>
            </div>
          )}

          {/* QR Code */}
          {paymentStatus === 'pending' && (
            <div className="text-center mb-6">
              <div className="bg-white p-4 rounded-xl border-2 border-gray-200 inline-block">
                <QRCodeSVG 
                  value={pixData.qrCode} 
                  size={200}
                  level="M"
                  includeMargin={false}
                />
              </div>
              <p className="text-gray-600 text-sm mt-3">
                Escaneie o QR Code com seu app bancário
              </p>
            </div>
          )}

          {/* PIX Copyable Code */}
          {paymentStatus === 'pending' && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ou copie o código PIX:
              </label>
              <div className="flex gap-2">
                <div className="flex-1 bg-gray-50 border border-gray-200 rounded-lg p-3">
                  <p className="text-sm font-mono text-gray-800 break-all">
                    {pixData.key}
                  </p>
                </div>
                <button
                  onClick={handleCopyPixCode}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 transition-colors"
                >
                  {copied ? (
                    <CheckIcon className="w-4 h-4" />
                  ) : (
                    <DocumentDuplicateIcon className="w-4 h-4" />
                  )}
                  {copied ? 'Copiado!' : 'Copiar'}
                </button>
              </div>
            </div>
          )}

          {/* Instructions */}
          {paymentStatus === 'pending' && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <h4 className="font-semibold text-blue-900 text-sm mb-2">
                Como pagar:
              </h4>
              <ul className="text-blue-800 text-sm space-y-1">
                <li>1. Abra seu app bancário</li>
                <li>2. Escaneie o QR Code ou cole o código</li>
                <li>3. Confirme o pagamento de R$ {tierPrice.toFixed(2)}</li>
                <li>4. Aguarde a confirmação automática</li>
              </ul>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            {paymentStatus === 'pending' && (
              <>
                <button
                  onClick={onCryptoPayment}
                  className="flex-1 py-3 px-4 border-2 border-indigo-600 text-indigo-600 font-semibold rounded-xl hover:bg-indigo-50 transition-colors"
                >
                  Pagar com Cripto
                </button>
                <button
                  onClick={onClose}
                  className="flex-1 py-3 px-4 bg-gray-500 text-white font-semibold rounded-xl hover:bg-gray-600 transition-colors"
                >
                  Cancelar
                </button>
              </>
            )}

            {paymentStatus === 'expired' && (
              <button
                onClick={onClose}
                className="flex-1 py-3 px-4 bg-gray-500 text-white font-semibold rounded-xl hover:bg-gray-600 transition-colors"
              >
                Fechar
              </button>
            )}
          </div>

          {/* Crypto Payment Notice */}
          <div className="mt-4 p-3 bg-purple-50 border border-purple-200 rounded-lg">
            <p className="text-purple-800 text-sm text-center">
              💡 <strong>Pagar com cripto:</strong> Em breve você poderá pagar diretamente com sua carteira digital
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};