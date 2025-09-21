import { useRef, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import QRCode from 'react-qr-code';
import jsPDF from 'jspdf'; // ✅ Importa a nova biblioteca
import { KeyIcon, ClipboardIcon, CheckCircleIcon, ArrowDownTrayIcon, ExclamationTriangleIcon, AcademicCapIcon } from '@heroicons/react/24/outline';
import { Modal } from '@/components/ui/Modal';
import { ActionButton } from '@/components/ui/ActionButton';

const APP_BASE_URL = "https://ticketfy.onrender.com";

export const TicketSuccessModal = ({ isOpen, onClose, ticketData }) => {
    const qrCodeContainerRef = useRef(null);

    if (!isOpen || !ticketData) {
        return null;
    }

    const { mintAddress, seedPhrase } = ticketData;
    const words = seedPhrase ? seedPhrase.split(' ') : [];

    const handleCopy = (textToCopy, successMessage) => {
        navigator.clipboard.writeText(textToCopy);
        toast.success(successMessage);
    };

    // ✅ LÓGICA DE DOWNLOAD TOTALMENTE REFEITA PARA GERAR PDF
    const handleDownload = () => {
        const svgElement = qrCodeContainerRef.current?.querySelector('svg');
        if (!svgElement) {
            toast.error("QR Code não encontrado. Tente novamente.");
            return;
        }

        const loadingToast = toast.loading('Gerando PDF do ingresso...');

        const svgData = new XMLSerializer().serializeToString(svgElement);
        const img = new Image();
        const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(svgBlob);

        img.onload = () => {
            // Converte o SVG para um Data URL de imagem PNG
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            const qrImageDataUrl = canvas.toDataURL('image/png');
            URL.revokeObjectURL(url);

            
            const doc = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a5'
            });

            // Adiciona conteúdo ao PDF
            doc.setFontSize(22);
            doc.setFont("helvetica", "bold");
            doc.text('Seu Ingresso Digital', doc.internal.pageSize.getWidth() / 2, 20, { align: 'center' });

            doc.setFontSize(12);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(100); // Cinza
            doc.text('Apresente este QR Code na entrada do evento.', doc.internal.pageSize.getWidth() / 2, 30, { align: 'center' });

            // Adiciona a imagem do QR Code
            const qrSize = 60; // 60mm
            const qrX = (doc.internal.pageSize.getWidth() - qrSize) / 2;
            doc.addImage(qrImageDataUrl, 'PNG', qrX, 38, qrSize, qrSize);

            // Adiciona o endereço do ingresso
            doc.setFontSize(8);
            doc.setFont("courier", "italic");
            doc.setTextColor(150);
            doc.text(mintAddress, doc.internal.pageSize.getWidth() / 2, 105, { align: 'center' });

            // Linha divisória
            doc.setDrawColor(220, 220, 220); // Cinza claro
            doc.line(15, 115, doc.internal.pageSize.getWidth() - 15, 115);

            // Seção do Certificado
            doc.setFontSize(14);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(79, 70, 229); // Roxo (indigo-600)
            doc.text('Seu Certificado', doc.internal.pageSize.getWidth() / 2, 125, { align: 'center' });
            
            doc.setFontSize(10);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(51, 65, 85); // Cinza escuro (slate-700)
            doc.text('Após o evento, seu certificado estará disponível em:', doc.internal.pageSize.getWidth() / 2, 132, { align: 'center' });
            
            // ✅ Adiciona o link clicável
            const certificateLink = `${APP_BASE_URL}/certificate/${mintAddress}`;
            doc.setFontSize(10);
            doc.setTextColor(29, 78, 216); // Azul (blue-600)
            doc.textWithLink(certificateLink, doc.internal.pageSize.getWidth() / 2, 139, { url: certificateLink, align: 'center' });

            // Salva o PDF
            doc.save(`ingresso-${mintAddress.slice(0, 6)}.pdf`);
            
            toast.success('Download do PDF iniciado!', { id: loadingToast });
        };
        img.onerror = () => { toast.error('Falha ao carregar a imagem do QR Code.'); };
        img.src = url;
    };
    
    const certificateLink = `${APP_BASE_URL}/certificate/${mintAddress}`;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Ingresso Garantido!">
            <div className="text-center">
                <CheckCircleIcon className="mx-auto h-16 w-16 text-green-500" />
                <h3 className="mt-4 text-xl font-semibold text-slate-900">Tudo Certo! Nos vemos no evento!</h3>
                
                <div className="mt-6 bg-white p-6 rounded-lg border border-slate-200">
                    <h4 className="font-bold text-lg text-slate-800">Seu Ingresso Digital</h4>
                    <p className="text-sm text-slate-500 mt-1">Apresente este QR Code na entrada.</p>
                    <div ref={qrCodeContainerRef} className="mt-4 p-4 bg-white inline-block rounded-lg">
                        <QRCode value={mintAddress} size={180} />
                    </div>
                    <p className="text-xs text-slate-400 mt-2 font-mono break-all">{mintAddress}</p>
                </div>

                <div className="mt-4 text-sm text-center p-4 bg-slate-50 rounded-lg">
                    <AcademicCapIcon className="h-6 w-6 mx-auto text-indigo-500 mb-2"/>
                    <p className="text-slate-600">
                        Após validar seu ingresso no evento, seu <strong className="text-indigo-600">certificado</strong> estará disponível.
                    </p>
                    {/* ✅ Link visível no modal para o usuário copiar se quiser */}
                    <div className="mt-2 flex items-center justify-center gap-2">
                        <input type="text" readOnly value={certificateLink} className="w-full text-xs text-center font-mono bg-slate-200 border-slate-300 rounded-md shadow-sm"/>
                        <button onClick={() => handleCopy(certificateLink, 'Link do certificado copiado!')} className="p-2 bg-indigo-100 text-indigo-600 rounded-md hover:bg-indigo-200 flex-shrink-0">
                            <ClipboardIcon className="h-4 w-4" />
                        </button>
                    </div>
                </div>

                <div className="mt-8 p-4 bg-indigo-50 border-l-4 border-indigo-500 text-left rounded-md">
                    <div className="flex"><div className="flex-shrink-0"><ExclamationTriangleIcon className="h-5 w-5 text-indigo-500" /></div><div className="ml-3"><h3 className="text-sm font-bold text-indigo-800">Ação Necessária: Baixe seu Ingresso!</h3><div className="mt-2 text-sm text-indigo-700"><p>Salve o PDF em um local seguro para garantir sua entrada.</p></div></div></div>
                </div>

                <div className="mt-6">
                   <button onClick={handleDownload} className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-indigo-600 hover:bg-indigo-700">
                        <ArrowDownTrayIcon className="h-5 w-5"/>
                        Baixar Ingresso (PDF)
                    </button>
                </div>

                {seedPhrase && (
                    <div className="mt-8 border-t pt-6">
                        <div className="mx-auto flex items-center justify-center bg-amber-100 border border-amber-300 rounded-full h-12 w-12"><KeyIcon className="h-6 w-6 text-amber-600" /></div>
                        <h3 className="mt-4 text-lg font-semibold text-slate-900">Guarde sua Chave de Acesso!</h3>
                        <p className="mt-2 text-sm text-slate-600">Esta é a <strong>única</strong> forma de recuperar seu ingresso e certificado.</p>
                        <div className="my-6 grid grid-cols-3 gap-x-4 gap-y-3 bg-slate-100 p-4 rounded-lg">
                            {words.map((word, index) => (
                                <div key={index} className="text-slate-800 font-mono text-sm"><span className="text-slate-500 mr-2">{index + 1}.</span>{word}</div>
                            ))}
                        </div>
                        <button onClick={() => handleCopy(seedPhrase, 'Frase secreta copiada!')} className="w-full flex items-center justify-center p-2 bg-slate-200 rounded-md hover:bg-slate-300">
                            <ClipboardIcon className="h-5 w-5 mr-2 text-slate-600"/><span className="font-semibold text-sm text-slate-700">Copiar Frase Secreta</span>
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

