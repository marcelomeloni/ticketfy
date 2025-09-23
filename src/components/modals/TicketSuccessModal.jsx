import { useRef, useState } from 'react'; // ✅ 1. Importa o useState
import toast from 'react-hot-toast';
import QRCode from 'react-qr-code';
import jsPDF from 'jspdf';
import { 
    KeyIcon, 
    ClipboardIcon, 
    CheckCircleIcon, 
    ArrowDownTrayIcon, 
    AcademicCapIcon,
    TicketIcon // ✅ 2. Adiciona o TicketIcon
} from '@heroicons/react/24/outline';
import { Modal } from '@/components/ui/Modal';
import { ActionButton } from '@/components/ui/ActionButton';

const APP_BASE_URL = "https://ticketfy.onrender.com";

// Componente para um botão de aba, para evitar repetição de código
const TabButton = ({ isActive, onClick, icon: Icon, children }) => (
    <button
        onClick={onClick}
        className={`flex-1 flex items-center justify-center gap-2 p-3 text-sm font-semibold rounded-t-lg border-b-2 transition-all duration-200 ${
            isActive
                ? 'border-indigo-600 text-indigo-600 bg-white'
                : 'border-transparent text-slate-500 hover:bg-slate-100'
        }`}
    >
        <Icon className="h-5 w-5" />
        {children}
    </button>
);


export const TicketSuccessModal = ({ isOpen, onClose, ticketData }) => {
    const qrCodeContainerRef = useRef(null);
    // ✅ 3. Estado para controlar a aba ativa
    const [activeTab, setActiveTab] = useState('ticket'); 

    if (!isOpen || !ticketData) {
        return null;
    }

    const { mintAddress, seedPhrase } = ticketData;
    const words = seedPhrase ? seedPhrase.split(' ') : [];

    // Funções handleCopy e handleDownload permanecem as mesmas
    const handleCopy = (textToCopy, successMessage) => {
        navigator.clipboard.writeText(textToCopy);
        toast.success(successMessage);
    };

    const handleDownload = () => {
        const svgElement = qrCodeContainerRef.current?.querySelector('svg');
        if (!svgElement) {
            toast.error("QR Code não encontrado. Tente novamente.");
            return;
        }

        const loadingToast = toast.loading('Gerando seu ingresso personalizado...');

        const {
            eventName = 'Nome do Evento',
            eventDate,
            eventLocation,
            mintAddress
        } = ticketData;

        const formatDisplayDate = (dateString) => {
            if (!dateString || isNaN(new Date(dateString))) {
                return 'Data a definir';
            }
            return new Date(dateString).toLocaleString('pt-BR', {
                day: '2-digit',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                timeZone: 'America/Sao_Paulo'
            });
        };

        const formattedDate = formatDisplayDate(eventDate);
        const displayLocation = eventLocation || 'Local a definir';

        const svgData = new XMLSerializer().serializeToString(svgElement);
        const img = new Image();
        const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(svgBlob);

        img.onload = () => {
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

            const PAGE_WIDTH = doc.internal.pageSize.getWidth();
            const PAGE_HEIGHT = doc.internal.pageSize.getHeight();
            const MARGIN = 15;
            const PRIMARY_COLOR = '#4F46E5';
            const TEXT_COLOR_DARK = '#1E293B';
            const TEXT_COLOR_LIGHT = '#64748B';

            // === CABEÇALHO ===
            doc.setFillColor(PRIMARY_COLOR);
            doc.rect(0, 0, PAGE_WIDTH, 30, 'F');
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(24);
            doc.setTextColor('#FFFFFF');
            doc.text('Ticketfy', MARGIN, 15);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(10);
            doc.text('O Futuro dos Eventos é Descentralizado', MARGIN, 23);

            // === CORPO DO INGRESSO ===
            let currentY = 45;
            doc.setFontSize(12);
            doc.setTextColor(TEXT_COLOR_LIGHT);
            doc.text('Ingresso Válido Para:', MARGIN, currentY);
            currentY += 8;
            doc.setFontSize(20);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(TEXT_COLOR_DARK);
            doc.text(eventName, MARGIN, currentY, { maxWidth: PAGE_WIDTH - MARGIN * 2 });
            currentY += 15;
            doc.setFontSize(12);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(TEXT_COLOR_DARK);
            doc.text(`Data: ${formattedDate}`, MARGIN, currentY);
            currentY += 7;
            doc.text(`Local: ${displayLocation}`, MARGIN, currentY);
            currentY += 15;
            const qrSize = 65;
            const qrX = (PAGE_WIDTH - qrSize) / 2;
            doc.addImage(qrImageDataUrl, 'PNG', qrX, currentY, qrSize, qrSize);
            currentY += qrSize + 5;
            doc.setFontSize(11);
            doc.setTextColor(TEXT_COLOR_LIGHT);
            doc.text('Apresente este QR Code na entrada do evento.', PAGE_WIDTH / 2, currentY, { align: 'center' });
            currentY += 15;
            doc.setLineDashPattern([2, 2], 0);
            doc.setDrawColor(TEXT_COLOR_LIGHT);
            doc.line(MARGIN, currentY, PAGE_WIDTH - MARGIN, currentY);
            doc.setLineDashPattern([], 0);
            currentY += 10;

            // --- Seção do Certificado ---
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(PRIMARY_COLOR);
            doc.text('Seu Certificado Digital', PAGE_WIDTH / 2, currentY, { align: 'center' });
            currentY += 7;

            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(TEXT_COLOR_DARK);
            doc.text('Após o evento, seu certificado estará disponível em:', PAGE_WIDTH / 2, currentY, { align: 'center' });
            currentY += 7;

            const certificateLink = `${APP_BASE_URL}/certificate/${mintAddress}`;
            
            const linkText = 'Clique aqui para acessar seu certificado';
            doc.setTextColor('#1D4ED8');
            doc.textWithLink(linkText, PAGE_WIDTH / 2, currentY, { url: certificateLink, align: 'center' });

            // === RODAPÉ ===
            const footerY = PAGE_HEIGHT - 18;
            doc.setFillColor('#F1F5F9');
            doc.rect(0, footerY - 5, PAGE_WIDTH, 23, 'F');
            
            doc.setFontSize(8);
            doc.setTextColor('#1D4ED8'); // Cor de link
            doc.setFont('helvetica', 'normal');
            doc.textWithLink('Link para o Certificado Digital', MARGIN, footerY + 2, { url: certificateLink });
            
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(PRIMARY_COLOR);
            doc.text('www.ticketfy.com', PAGE_WIDTH - MARGIN, footerY + 2, { align: 'right' });

            doc.save(`ingresso-ticketfy-${mintAddress.slice(0, 6)}.pdf`);
            
            toast.success('Seu ingresso foi gerado com sucesso!', { id: loadingToast });
        };

        img.onerror = () => { 
            toast.error('Falha ao carregar a imagem do QR Code.', { id: loadingToast }); 
        };
        img.src = url;
    };
    
    const certificateLink = `${APP_BASE_URL}/certificate/${mintAddress}`;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Ingresso Garantido!">
            <div className="text-center">
                <CheckCircleIcon className="mx-auto h-12 w-12 text-green-500" />
                <h3 className="mt-2 text-xl font-semibold text-slate-900">Tudo Certo! Nos vemos no evento!</h3>
                <p className="mt-1 text-sm text-slate-500">Gerencie seu ingresso e informações abaixo.</p>
                
                {/* ✅ 4. Sistema de Navegação por Abas */}
                <div className="mt-6 border-b border-slate-200 bg-slate-50 rounded-t-lg flex">
                    <TabButton isActive={activeTab === 'ticket'} onClick={() => setActiveTab('ticket')} icon={TicketIcon}>
                        Ingresso
                    </TabButton>
                    <TabButton isActive={activeTab === 'certificate'} onClick={() => setActiveTab('certificate')} icon={AcademicCapIcon}>
                        Certificado
                    </TabButton>
                    {seedPhrase && (
                        <TabButton isActive={activeTab === 'key'} onClick={() => setActiveTab('key')} icon={KeyIcon}>
                            Chave de Acesso
                        </TabButton>
                    )}
                </div>

                {/* ✅ 5. Conteúdo renderizado de acordo com a aba ativa */}
                <div className="bg-white p-6 rounded-b-lg border border-t-0 border-slate-200">
                    {activeTab === 'ticket' && (
                        <div>
                            <h4 className="font-bold text-lg text-slate-800">Seu Ingresso Digital</h4>
                            <p className="text-sm text-slate-500 mt-1">Apresente este QR Code na entrada do evento.</p>
                            <div ref={qrCodeContainerRef} className="mt-4 p-4 bg-white inline-block rounded-lg border">
                                <QRCode value={mintAddress} size={180} />
                            </div>
                            <p className="text-xs text-slate-400 mt-2 font-mono break-all">{mintAddress}</p>
                            <button onClick={handleDownload} className="mt-6 w-full flex items-center justify-center gap-2 px-4 py-3 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-indigo-600 hover:bg-indigo-700">
                                <ArrowDownTrayIcon className="h-5 w-5"/>
                                Baixar Ingresso (PDF)
                            </button>
                        </div>
                    )}

                    {activeTab === 'certificate' && (
                        <div>
                             <h4 className="font-bold text-lg text-slate-800">Seu Certificado Digital</h4>
                             <p className="text-sm text-slate-500 mt-1">Após o evento, acesse seu certificado de participação neste link.</p>
                             <div className="mt-4 text-sm text-center p-4 bg-slate-50 rounded-lg">
                                <AcademicCapIcon className="h-6 w-6 mx-auto text-indigo-500 mb-2"/>
                                <p className="text-slate-600">
                                    Disponível após a validação do seu ingresso no local.
                                </p>
                                <div className="mt-2 flex items-center justify-center gap-2">
                                    <input type="text" readOnly value={certificateLink} className="w-full text-xs text-center font-mono bg-slate-200 border-slate-300 rounded-md shadow-sm"/>
                                    <button onClick={() => handleCopy(certificateLink, 'Link do certificado copiado!')} className="p-2 bg-indigo-100 text-indigo-600 rounded-md hover:bg-indigo-200 flex-shrink-0">
                                        <ClipboardIcon className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'key' && seedPhrase && (
                         <div>
                            <h3 className="text-lg font-semibold text-slate-900">Guarde sua Chave de Acesso!</h3>
                            <p className="mt-2 text-sm text-slate-600">Esta é a <strong>única</strong> forma de recuperar seu ingresso e certificado. Anote em um local seguro e offline.</p>
                            <div className="my-6 grid grid-cols-3 gap-x-4 gap-y-3 bg-slate-100 p-4 rounded-lg border">
                                {words.map((word, index) => (
                                    <div key={index} className="text-slate-800 font-mono text-sm"><span className="text-slate-500 mr-2">{index + 1}.</span>{word}</div>
                                ))}
                            </div>
                            <button onClick={() => handleCopy(seedPhrase, 'Frase secreta copiada!')} className="w-full flex items-center justify-center p-2 bg-slate-200 rounded-md hover:bg-slate-300">
                                <ClipboardIcon className="h-5 w-5 mr-2 text-slate-600"/><span className="font-semibold text-sm text-slate-700">Copiar Frase Secreta</span>
                            </button>
                        </div>
                    )}
                </div>
                
                <ActionButton onClick={onClose} className="mt-6 w-full bg-slate-500 hover:bg-slate-600 text-white">
                    Fechar
                </ActionButton>
            </div>
        </Modal>
    );
};