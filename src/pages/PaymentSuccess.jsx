import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { 
    CheckCircleIcon, 
    DocumentDuplicateIcon,
    ArrowDownTrayIcon,
    TicketIcon,
    AcademicCapIcon,
    KeyIcon,
    MapPinIcon,
    HomeIcon,
    ClockIcon
} from '@heroicons/react/24/outline';
import QRCode from 'react-qr-code';
import { PDFDownloadLink } from '@react-pdf/renderer';
import { TicketPDF } from '@/components/pdf/TicketPDF';
import toast from 'react-hot-toast';
import { ActionButton } from '@/components/ui/ActionButton';

const APP_BASE_URL = "https://ticketfy.app";

export default function PaymentSuccess() {
    const location = useLocation();
    const navigate = useNavigate();
    const qrCodeContainerRef = useRef(null);
    
    const [ticketData, setTicketData] = useState(null);
    const [activeTab, setActiveTab] = useState('ticket');
    const [qrCodeImage, setQrCodeImage] = useState(null);
    const [eventImageBase64, setEventImageBase64] = useState(null);
    const [isLoadingPdfAssets, setIsLoadingPdfAssets] = useState(true);

    // Recebe os dados do ticket via state da navegação
    useEffect(() => {
        console.log('[DEBUG] Dados recebidos na PaymentSuccess:', location.state);
        
        if (!location.state?.ticketData) {
            toast.error('Dados do ingresso não encontrados. Redirecionando...');
            navigate('/events');
            return;
        }
        
        setTicketData(location.state.ticketData);
    }, [location.state, navigate]);

    // Processa QR Code para PDF
    useEffect(() => {
        if (activeTab === 'ticket' && ticketData && qrCodeContainerRef.current) {
            const svgElement = qrCodeContainerRef.current.querySelector('svg');
            if (svgElement) {
                const svgData = new XMLSerializer().serializeToString(svgElement);
                const img = new Image();
                const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
                const url = URL.createObjectURL(svgBlob);
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    canvas.width = 512;
                    canvas.height = 512;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, 512, 512);
                    setQrCodeImage(canvas.toDataURL('image/png'));
                    URL.revokeObjectURL(url);
                };
                img.src = url;
            }
        }
    }, [ticketData, activeTab]);

    // Processa imagem do evento para PDF
    useEffect(() => {
        if (ticketData?.eventImage) {
            setIsLoadingPdfAssets(true);
            const fetchAndConvertImage = async () => {
                try {
                    const response = await fetch(ticketData.eventImage);
                    if (!response.ok) throw new Error('Falha ao baixar imagem do evento');
                    const blob = await response.blob();
                    const convertedImage = await new Promise((resolve, reject) => {
                        const img = new Image();
                        const url = URL.createObjectURL(blob);
                        img.onload = () => {
                            const canvas = document.createElement('canvas');
                            canvas.width = img.naturalWidth;
                            canvas.height = img.naturalHeight;
                            const ctx = canvas.getContext('2d');
                            ctx.fillStyle = '#FFFFFF';
                            ctx.fillRect(0, 0, canvas.width, canvas.height);
                            ctx.drawImage(img, 0, 0);
                            const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
                            URL.revokeObjectURL(url);
                            resolve(dataUrl);
                        };
                        img.onerror = (error) => {
                            URL.revokeObjectURL(url);
                            reject(error);
                        };
                        img.src = url;
                    });
                    setEventImageBase64(convertedImage);
                } catch (error) {
                    console.error("Erro no processamento da imagem do evento:", error);
                    setEventImageBase64(null);
                } finally {
                    setIsLoadingPdfAssets(false);
                }
            };
            fetchAndConvertImage();
        } else {
            setIsLoadingPdfAssets(false);
        }
    }, [ticketData]);

    const handleCopy = (textToCopy, successMessage) => {
        navigator.clipboard.writeText(textToCopy);
        toast.success(successMessage);
    };

    if (!ticketData) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
                    <p className="mt-4 text-slate-600">Carregando seus dados...</p>
                </div>
            </div>
        );
    }

    const { mintAddress, seedPhrase, registrationId, eventName, eventDate, eventLocation, eventImage, isNewUser } = ticketData;
    const words = seedPhrase ? seedPhrase.split(' ') : [];
    const certificateLink = `${APP_BASE_URL}/certificate/${mintAddress}`;

    const TabButton = ({ isActive, onClick, icon: Icon, children }) => (
        <button
            onClick={onClick}
            className={`flex-1 flex items-center justify-center gap-2 p-4 text-sm font-semibold rounded-t-lg border-b-2 transition-all duration-200 ${
                isActive
                    ? 'border-indigo-600 text-indigo-600 bg-white'
                    : 'border-transparent text-slate-500 hover:bg-slate-100'
            }`}
        >
            <Icon className="h-5 w-5" />
            {children}
        </button>
    );

    const formatFullAddress = (location) => {
        if (!location || location.type !== 'Physical' || !location.address) { 
            return location?.onlineUrl ? "Evento Online" : "Local a definir"; 
        }
        const { street, number, neighborhood, city, state } = location.address;
        return [`${street}${number ? `, ${number}` : ''}`, neighborhood, `${city} - ${state}`].filter(Boolean).join(', ');
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-slate-100">
            {/* Header de Sucesso */}
            <div className="bg-white shadow-sm border-b">
                <div className="container mx-auto px-4 py-8">
                    <div className="text-center max-w-2xl mx-auto">
                        <CheckCircleIcon className="mx-auto h-16 w-16 text-green-500 mb-4" />
                        <h1 className="text-3xl font-bold text-slate-900 mb-2">
                            Pagamento Confirmado!
                        </h1>
                        <p className="text-lg text-slate-600 mb-4">
                            Seu ingresso para <strong>{eventName}</strong> está garantido
                        </p>
                        <div className="flex items-center justify-center gap-6 text-sm text-slate-500">
                            <div className="flex items-center gap-2">
                                <ClockIcon className="h-4 w-4" />
                                <span>{new Date(eventDate).toLocaleDateString('pt-BR')}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <MapPinIcon className="h-4 w-4" />
                                <span>{eventLocation?.venueName || 'Evento Online'}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Conteúdo Principal */}
            <div className="container mx-auto px-4 py-8">
                <div className="max-w-4xl mx-auto">
                    {/* Abas de Navegação */}
                    <div className="bg-slate-100 rounded-t-xl p-2 flex border-b">
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

                    {/* Conteúdo das Abas */}
                    <div className="bg-white rounded-b-xl shadow-lg border">
                        {activeTab === 'ticket' && (
                            <div className="p-8">
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                    <div>
                                        <h3 className="text-xl font-bold text-slate-800 mb-4">Seu Ingresso Digital</h3>
                                        <p className="text-slate-600 mb-6">
                                            Apresente este QR Code na entrada do evento. Ele também está disponível para download em PDF.
                                        </p>
                                        
                                        {eventLocation?.type === 'Physical' && (
                                            <div className="mb-6 p-4 bg-slate-50 rounded-lg border">
                                                <div className="flex items-start gap-3">
                                                    <MapPinIcon className="h-5 w-5 text-slate-400 mt-0.5 flex-shrink-0" />
                                                    <div>
                                                        <div className="font-semibold text-slate-800">{eventLocation.venueName}</div>
                                                        <div className="text-sm text-slate-600">{formatFullAddress(eventLocation)}</div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        <div className="bg-white p-6 rounded-xl border-2 border-dashed border-slate-200 inline-block">
                                            <div ref={qrCodeContainerRef}>
                                                <QRCode value={registrationId || 'ID inválido'} size={200} />
                                            </div>
                                        </div>
                                        <p className="text-xs text-slate-400 mt-3 font-mono break-all">
                                            {registrationId || 'ID de registro não encontrado'}
                                        </p>
                                    </div>
                                    
                                    <div className="flex flex-col justify-between">
                                        <div>
                                            <h4 className="font-semibold text-slate-700 mb-3">Informações do Evento</h4>
                                            <div className="space-y-2 text-sm text-slate-600">
                                                <div><strong>Evento:</strong> {eventName}</div>
                                                <div><strong>Data:</strong> {new Date(eventDate).toLocaleDateString('pt-BR', { 
                                                    weekday: 'long', 
                                                    year: 'numeric', 
                                                    month: 'long', 
                                                    day: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })}</div>
                                                <div><strong>Local:</strong> {eventLocation?.venueName || 'Online'}</div>
                                                <div><strong>NFT:</strong> <span className="font-mono text-xs">{mintAddress}</span></div>
                                            </div>
                                        </div>

                                        <div className="mt-6">
                                            {(isLoadingPdfAssets || !qrCodeImage) ? (
                                                <button disabled className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-transparent rounded-lg text-base font-medium text-white bg-slate-400 cursor-not-allowed">
                                                    Preparando PDF...
                                                </button>
                                            ) : (
                                                <PDFDownloadLink
                                                    document={<TicketPDF 
                                                        ticketData={{ ...ticketData, eventImage: eventImageBase64, registrationId }}
                                                        qrCodeImage={qrCodeImage} 
                                                        brandLogoImage="https://red-obedient-stingray-854.mypinata.cloud/ipfs/bafkreih7ofsa246z5vnjvrol6xk5tpj4zys42tcaotxq7tp7ptgraalrya"
                                                    />}
                                                    fileName={`Ingresso_${eventName.replace(/\s/g, '_')}.pdf`}
                                                    className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-transparent rounded-lg shadow-sm text-base font-medium text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
                                                >
                                                    {({ loading }) => loading ? 'Gerando PDF...' : (
                                                        <>
                                                            <ArrowDownTrayIcon className="h-5 w-5"/> 
                                                            Baixar Ingresso (PDF)
                                                        </>
                                                    )}
                                                </PDFDownloadLink>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'certificate' && (
                            <div className="p-8 text-center">
                                <AcademicCapIcon className="h-16 w-16 text-indigo-500 mx-auto mb-4" />
                                <h3 className="text-xl font-bold text-slate-800 mb-2">Certificado de Participação</h3>
                                <p className="text-slate-600 mb-6 max-w-md mx-auto">
                                    Seu certificado digital estará disponível aqui após a validação do seu ingresso no evento.
                                </p>
                                
                                <div className="bg-slate-50 rounded-lg p-6 max-w-md mx-auto">
                                    <div className="flex items-center gap-3 mb-4">
                                        <input 
                                            type="text" 
                                            readOnly 
                                            value={certificateLink} 
                                            className="flex-1 text-sm text-center font-mono bg-white border border-slate-300 rounded-md px-3 py-2"
                                        />
                                        <button 
                                            onClick={() => handleCopy(certificateLink, 'Link do certificado copiado!')}
                                            className="p-2 bg-indigo-100 text-indigo-600 rounded-md hover:bg-indigo-200 transition-colors"
                                        >
                                            <DocumentDuplicateIcon className="h-4 w-4" />
                                        </button>
                                    </div>
                                    <p className="text-xs text-slate-500">
                                        Guarde este link para acessar seu certificado após o evento
                                    </p>
                                </div>
                            </div>
                        )}

                        {activeTab === 'key' && seedPhrase && (
                            <div className="p-8">
                                <div className="max-w-2xl mx-auto">
                                    <div className="text-center mb-8">
                                        <KeyIcon className="h-12 w-12 text-amber-500 mx-auto mb-3" />
                                        <h3 className="text-xl font-bold text-slate-800 mb-2">Sua Carteira Digital</h3>
                                        <p className="text-slate-600">
                                            Guarde estas informações em um local seguro. Elas são essenciais para acessar seu ingresso e certificado.
                                        </p>
                                    </div>

                                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 mb-6">
                                        <h4 className="font-bold text-amber-800 mb-3">Frase de Recuperação (Seed Phrase)</h4>
                                        <div className="grid grid-cols-3 gap-3 mb-4">
                                            {words.map((word, index) => (
                                                <div key={index} className="bg-white rounded-lg p-3 text-center border">
                                                    <span className="text-xs text-slate-500 mr-1">{index + 1}.</span>
                                                    <span className="font-medium text-slate-800">{word}</span>
                                                </div>
                                            ))}
                                        </div>
                                        <button 
                                            onClick={() => handleCopy(seedPhrase, 'Frase secreta copiada!')}
                                            className="w-full flex items-center justify-center gap-2 py-3 bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200 transition-colors font-medium"
                                        >
                                            <DocumentDuplicateIcon className="h-5 w-5" />
                                            Copiar Frase Secreta
                                        </button>
                                    </div>

                                    <div className="bg-slate-50 rounded-xl p-6">
                                        <h4 className="font-bold text-slate-800 mb-3">Próximos Passos</h4>
                                        <ul className="text-sm text-slate-600 space-y-2">
                                            <li>• Faça download do PDF do ingresso para backup</li>
                                            <li>• Guarde a frase secreta em local seguro e offline</li>
                                            <li>• Apresente o QR Code na entrada do evento</li>
                                            {isNewUser && <li>• Use sua nova carteira para acessar outros eventos Web3</li>}
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Botões de Ação */}
                    <div className="flex gap-4 mt-8">
                        <Link to="/events" className="flex-1">
                            <ActionButton className="w-full bg-slate-500 hover:bg-slate-600">
                                <HomeIcon className="h-5 w-5 mr-2" />
                                Explorar Mais Eventos
                            </ActionButton>
                        </Link>
                        <Link to="/my-tickets" className="flex-1">
                            <ActionButton className="w-full bg-indigo-600 hover:bg-indigo-700">
                                <TicketIcon className="h-5 w-5 mr-2" />
                                Ver Meus Ingressos
                            </ActionButton>
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}