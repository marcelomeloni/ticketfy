// src/components/modals/TicketSuccessModal.jsx

import { useRef, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import QRCode from 'react-qr-code';

// O html2canvas não é mais necessário
// import html2canvas from 'html2canvas';

import { KeyIcon, ClipboardIcon, CheckCircleIcon, ArrowDownTrayIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { Modal } from '@/components/ui/Modal';
import { ActionButton } from '@/components/ui/ActionButton';

export const TicketSuccessModal = ({ isOpen, onClose, ticketData }) => {
    const qrCodeContainerRef = useRef(null);
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        // Apenas verifica se o modal está aberto para o botão de fechar funcionar
        if (isOpen) {
            setIsReady(true);
        } else {
            setIsReady(false);
        }
    }, [isOpen]);

    if (!isOpen || !ticketData) {
        return null;
    }

    const { mintAddress, seedPhrase } = ticketData;
    const words = seedPhrase ? seedPhrase.split(' ') : [];

    const handleCopy = () => {
        navigator.clipboard.writeText(seedPhrase);
        toast.success("Frase secreta copiada!");
    };

    // ✅ LÓGICA DE DOWNLOAD REFEITA SEM HTML2CANVAS, USANDO CANVAS NATIVO
    const handleDownload = () => {
        const svgElement = qrCodeContainerRef.current?.querySelector('svg');
        if (!svgElement) {
            toast.error("QR Code não encontrado. Tente novamente.");
            return;
        }

        const loadingToast = toast.loading('Gerando imagem do ingresso...');

        // 1. Converte o SVG para uma string e cria um URL de imagem
        const svgData = new XMLSerializer().serializeToString(svgElement);
        const img = new Image();
        const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(svgBlob);

        img.onload = () => {
            // 2. Cria um canvas com dimensões maiores para melhor qualidade (e.g., 2x)
            const scale = 2;
            const canvas = document.createElement('canvas');
            canvas.width = 320 * scale;
            canvas.height = 400 * scale;
            const ctx = canvas.getContext('2d');

            // 3. Desenha o layout do ingresso no canvas
            
            // Fundo branco
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Título
            ctx.fillStyle = '#1e293b'; // slate-800
            ctx.font = `bold ${22 * scale}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.fillText('Seu Ingresso Digital', canvas.width / 2, 40 * scale);
            
            // Subtítulo
            ctx.fillStyle = '#64748b'; // slate-500
            ctx.font = `${14 * scale}px sans-serif`;
            ctx.fillText('Apresente este QR Code na entrada', canvas.width / 2, 70 * scale);

            // Desenha a imagem do QR Code (que veio do SVG) no centro
            const qrSize = 180 * scale;
            const qrX = (canvas.width - qrSize) / 2;
            const qrY = 90 * scale;
            ctx.drawImage(img, qrX, qrY, qrSize, qrSize);
            URL.revokeObjectURL(url); // Libera a memória do blob

            // Endereço (mintAddress)
            ctx.fillStyle = '#94a3b8'; // slate-400
            ctx.font = `italic ${12 * scale}px monospace`;
            const shortAddress = `${mintAddress.slice(0, 10)}...${mintAddress.slice(-10)}`;
            ctx.fillText(shortAddress, canvas.width / 2, 300 * scale);

            // 4. Inicia o download da imagem do canvas
            const image = canvas.toDataURL('image/png');
            const link = document.createElement('a');
            link.href = image;
            link.download = `ingresso-${mintAddress.slice(0, 6)}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            toast.success('Download iniciado!', { id: loadingToast });
        };

        img.onerror = (e) => {
            toast.error('Falha ao carregar a imagem do QR Code.', { id: loadingToast });
            console.error("Erro ao carregar SVG como imagem:", e);
            URL.revokeObjectURL(url);
        };
        
        img.src = url;
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Ingresso Garantido!">
            <div className="text-center">
                <CheckCircleIcon className="mx-auto h-16 w-16 text-green-500" />
                <h3 className="mt-4 text-xl font-semibold text-slate-900">Tudo Certo! Nos vemos no evento!</h3>
                
                {/* Apenas exibe o QR Code, sem a ref para o html2canvas */}
                <div className="mt-6 bg-white p-6 rounded-lg border border-slate-200">
                    <h4 className="font-bold text-lg text-slate-800">Seu Ingresso Digital</h4>
                    <p className="text-sm text-slate-500 mt-1">Apresente este QR Code na entrada.</p>
                    <div ref={qrCodeContainerRef} className="mt-4 p-4 bg-white inline-block rounded-lg">
                        <QRCode value={mintAddress} size={180} />
                    </div>
                    <p className="text-xs text-slate-400 mt-2 font-mono break-all">{mintAddress}</p>
                </div>

                <div className="mt-8 p-4 bg-indigo-50 border-l-4 border-indigo-500 text-left rounded-md">
                    <div className="flex">
                        <div className="flex-shrink-0">
                            <ExclamationTriangleIcon className="h-5 w-5 text-indigo-500" aria-hidden="true" />
                        </div>
                        <div className="ml-3">
                            <h3 className="text-sm font-bold text-indigo-800">Ação Necessária: Baixe seu Ingresso!</h3>
                            <div className="mt-2 text-sm text-indigo-700">
                                <p>Este é o seu comprovante oficial. Salve-o em um local seguro para **garantir sua entrada no evento.**</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-6">
                     <button 
                        onClick={handleDownload}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
                    >
                        <ArrowDownTrayIcon className="h-5 w-5"/>
                        Baixar Ingresso Agora
                    </button>
                </div>

                {seedPhrase && (
                    <div className="mt-8 border-t pt-6">
                        <div className="mx-auto flex items-center justify-center bg-amber-100 border border-amber-300 rounded-full h-12 w-12">
                            <KeyIcon className="h-6 w-6 text-amber-600" />
                        </div>
                        <h3 className="mt-4 text-lg font-semibold text-slate-900">Guarde sua Chave de Acesso!</h3>
                        <p className="mt-2 text-sm text-slate-600">
                            Esta é a <strong>única</strong> forma de recuperar seu ingresso e certificado. Anote em um lugar seguro.
                        </p>
                        <div className="my-6 grid grid-cols-3 gap-x-4 gap-y-3 bg-slate-100 p-4 rounded-lg">
                            {words.map((word, index) => (
                                <div key={index} className="text-slate-800 font-mono text-sm">
                                    <span className="text-slate-500 mr-2">{index + 1}.</span>{word}
                                </div>
                            ))}
                        </div>
                        <button onClick={handleCopy} className="w-full flex items-center justify-center p-2 bg-slate-200 rounded-md cursor-pointer hover:bg-slate-300 transition-colors">
                            <ClipboardIcon className="h-5 w-5 mr-2 text-slate-600"/>
                            <span className="font-semibold text-sm text-slate-700">Copiar Frase Secreta</span>
                        </button>
                    </div>
                )}
                
                <ActionButton onClick={onClose} className="mt-6 w-full bg-slate-500 hover:bg-slate-600 text-white">
                    Fechar
                </ActionButton>
            </div>
        </Modal>
    );
};