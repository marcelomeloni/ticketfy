import { useRef, useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import QRCode from 'react-qr-code';
import { PDFDownloadLink } from '@react-pdf/renderer';
import { TicketPDF } from '@/components/pdf/TicketPDF'; 
import {
    KeyIcon,
    ClipboardIcon,
    CheckCircleIcon,
    ArrowDownTrayIcon,
    AcademicCapIcon,
    TicketIcon,
    MapPinIcon,
    ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { Modal } from '@/components/ui/Modal';
import { ActionButton } from '@/components/ui/ActionButton';

const APP_BASE_URL = "https://ticketfy.app";

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
    const [activeTab, setActiveTab] = useState('ticket');
    const [qrCodeImage, setQrCodeImage] = useState(null);
    const [eventImageBase64, setEventImageBase64] = useState(null);
    const [isLoadingPdfAssets, setIsLoadingPdfAssets] = useState(true);

    useEffect(() => {
        if (isOpen) {
             console.log('[DEBUG] Dados recebidos no TicketSuccessModal:', {
            ticketData,
            eventLocation: ticketData?.eventLocation,
            locationType: ticketData?.eventLocation?.type,
            hasAddress: !!ticketData?.eventLocation?.address,
            venueName: ticketData?.eventLocation?.venueName,
            onlineUrl: ticketData?.eventLocation?.onlineUrl
        });
            // ✨ MODO DETETIVE ✨: Esta linha é a mais importante.
            // Ela vai mostrar no console do navegador exatamente o que está chegando na prop 'ticketData'.
            console.log('[DEBUG] Dados recebidos no TicketSuccessModal:', ticketData);
            setActiveTab('ticket');
        } else {
            setQrCodeImage(null);
            setEventImageBase64(null);
            setIsLoadingPdfAssets(true);
        }
    }, [isOpen, ticketData]);

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
    }, [ticketData, activeTab, isOpen]);

    useEffect(() => {
        if (isOpen && ticketData?.eventImage) {
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
        } else if (isOpen) {
            setIsLoadingPdfAssets(false);
        }
    }, [isOpen, ticketData]);

    if (!isOpen || !ticketData) {
        return null;
    }
    
    const { mintAddress, seedPhrase, registrationId } = ticketData;
    const words = seedPhrase ? seedPhrase.split(' ') : [];

    const handleCopy = (textToCopy, successMessage) => {
        navigator.clipboard.writeText(textToCopy);
        toast.success(successMessage);
    };
    
    const certificateLink = `${APP_BASE_URL}/certificate/${mintAddress}`;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Ingresso Garantido!" persistent>
            <div className="text-center">
                <CheckCircleIcon className="mx-auto h-12 w-12 text-green-500" />
                <h3 className="mt-2 text-xl font-semibold text-slate-900">Tudo Certo! Nos vemos no evento!</h3>
                <p className="mt-1 text-sm text-slate-500">Gerencie seu ingresso e informações abaixo.</p>
                
                {seedPhrase && (
                     <div className="mt-4 text-sm text-red-700 bg-red-50 p-3 rounded-lg flex items-start text-left">
                        <ExclamationTriangleIcon className="h-5 w-5 text-red-500 mr-3 mt-0-5 flex-shrink-0" />
                        <div>
                            <span className="font-semibold">Atenção:</span> Sua chave de acesso foi adicionada ao seu PDF para backup. Guarde este arquivo em um local muito seguro.
                        </div>
                    </div>
                )}

                <div className="mt-6 border-b border-slate-200 bg-slate-50 rounded-t-lg flex">
                    <TabButton isActive={activeTab === 'ticket'} onClick={() => setActiveTab('ticket')} icon={TicketIcon}>Ingresso</TabButton>
                    <TabButton isActive={activeTab === 'certificate'} onClick={() => setActiveTab('certificate')} icon={AcademicCapIcon}>Certificado</TabButton>
                    {seedPhrase && (<TabButton isActive={activeTab === 'key'} onClick={() => setActiveTab('key')} icon={KeyIcon}>Chave de Acesso</TabButton>)}
                </div>

                <div className="bg-white p-6 rounded-b-lg border border-t-0 border-slate-200">
                    {activeTab === 'ticket' && (
                        <TicketTabContent 
                            ticketData={ticketData}
                            registrationId={registrationId}
                            qrCodeContainerRef={qrCodeContainerRef} 
                            qrCodeImage={qrCodeImage}
                            eventImageBase64={eventImageBase64}
                            isLoadingPdfAssets={isLoadingPdfAssets}
                        />
                    )}
                    {activeTab === 'certificate' && (
                         <CertificateTabContent certificateLink={certificateLink} handleCopy={handleCopy} />
                    )}
                     {activeTab === 'key' && seedPhrase && (
                         <KeyTabContent seedPhrase={seedPhrase} words={words} handleCopy={handleCopy} />
                    )}
                </div>
                
                <ActionButton onClick={onClose} className="mt-6 w-full bg-slate-500 hover:bg-slate-600 text-white">
                    Fechar
                </ActionButton>
            </div>
        </Modal>
    );
};

const TicketTabContent = ({ ticketData, registrationId, qrCodeContainerRef, qrCodeImage, eventImageBase64, isLoadingPdfAssets }) => {
    const { eventLocation, eventName, mintAddress } = ticketData;

    const formatFullAddress = (location) => {
        if (!location || location.type !== 'Physical' || !location.address) { return location?.onlineUrl ? "Evento Online" : "Local a definir"; }
        const { street, number, neighborhood, city, state } = location.address;
        return [`${street}${number ? `, ${number}` : ''}`, neighborhood, `${city} - ${state}`].filter(Boolean).join(', ');
    };

    return (
        <div>
            <h4 className="font-bold text-lg text-slate-800">Seu Ingresso Digital</h4>
            <p className="text-sm text-slate-500 mt-1">Apresente este QR Code na entrada do evento.</p>
            {eventLocation?.type === 'Physical' && (
                <div className="mt-4 text-sm text-slate-600 bg-slate-50 p-3 rounded-lg flex items-start text-left">
                    <MapPinIcon className="h-5 w-5 text-slate-400 mr-3 mt-0-5 flex-shrink-0" />
                    <div>
                        <div className="font-semibold text-slate-800">{eventLocation.venueName}</div>
                        <div>{formatFullAddress(eventLocation)}</div>
                    </div>
                </div>
            )}
            <div ref={qrCodeContainerRef} className="mt-4 p-4 bg-white inline-block rounded-lg border">
                <QRCode value={registrationId || 'ID inválido'} size={180} />
            </div>
            <p className="text-xs text-slate-400 mt-2 font-mono break-all" title={registrationId}>{registrationId || 'ID de registro não encontrado'}</p>
            
            <div className="mt-6">
                {(isLoadingPdfAssets || !qrCodeImage) ? (
                    <button disabled className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-slate-400 cursor-not-allowed">
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
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-indigo-600 hover:bg-indigo-700"
                    >
                        {({ loading }) => loading ? 'Gerando PDF...' : (
                            <>
                                <ArrowDownTrayIcon className="h-5 w-5"/> Baixar Ingresso e Carteira (PDF)
                            </>
                        )}
                    </PDFDownloadLink>
                )}
            </div>
        </div>
    );
};

const CertificateTabContent = ({ certificateLink, handleCopy }) => (
    <div>
        <h4 className="font-bold text-lg text-slate-800">Seu Certificado Digital</h4>
        <p className="text-sm text-slate-500 mt-1">Após o evento, acesse seu certificado de participação neste link.</p>
        <div className="mt-4 text-sm text-center p-4 bg-slate-50 rounded-lg">
            <AcademicCapIcon className="h-6 w-6 mx-auto text-indigo-500 mb-2"/>
            <p className="text-slate-600">Disponível após a validação do seu ingresso no local.</p>
            <div className="mt-2 flex items-center justify-center gap-2">
                <input type="text" readOnly value={certificateLink} className="w-full text-xs text-center font-mono bg-slate-200 border-slate-300 rounded-md shadow-sm"/>
                <button onClick={() => handleCopy(certificateLink, 'Link do certificado copiado!')} className="p-2 bg-indigo-100 text-indigo-600 rounded-md hover:bg-indigo-200 flex-shrink-0">
                    <ClipboardIcon className="h-4 w-4" />
                </button>
            </div>
        </div>
    </div>
);

const KeyTabContent = ({ seedPhrase, words, handleCopy }) => (
    <div>
        <h3 className="text-lg font-semibold text-slate-900">Guarde sua Chave de Acesso!</h3>
        <p className="mt-2 text-sm text-slate-600">Esta é a <strong>única</strong> forma de recuperar seu ingresso e certificado. Anote em um local seguro e offline.</p>
        <div className="my-6 grid grid-cols-3 gap-x-4 gap-y-3 bg-slate-100 p-4 rounded-lg border">
            {words.map((word, index) => (<div key={index} className="text-slate-800 font-mono text-sm"><span className="text-slate-500 mr-2">{index + 1}.</span>{word}</div>))}
        </div>
        <button onClick={() => handleCopy(seedPhrase, 'Frase secreta copiada!')} className="w-full flex items-center justify-center p-2 bg-slate-200 rounded-md hover:bg-slate-300">
            <ClipboardIcon className="h-5 w-5 mr-2 text-slate-600"/><span className="font-semibold text-sm text-slate-700">Copiar Frase Secreta</span>
        </button>
    </div>
);