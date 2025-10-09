// components/TicketDownloader.jsx
import { useState } from 'react';
import toast from 'react-hot-toast';
import { pdf } from '@react-pdf/renderer';
import QRCode from 'qrcode';
import { TicketPDF } from './pdf/TicketPDF';

export const TicketDownloader = ({ 
    ticket = null,
    ticketData = null,  
    registrationId = null,
    children, 
    className,
    showToast = true,
    onDownloadStart = () => {},
    onDownloadComplete = () => {},
    onDownloadError = () => {}
}) => {
    const [isLoading, setIsLoading] = useState(false);

    // ✅ FUNÇÃO para formatar dados no formato que o TicketPDF espera
    const getTicketInfo = () => {
        // Prioridade 1: Dados do TicketSuccessModal
        if (ticketData) {
            console.log('[DOWNLOAD] Usando dados do TicketSuccessModal:', ticketData);
            return {
                mintAddress: ticketData.mintAddress,
                eventName: ticketData.eventName || 'Evento',
                eventDate: ticketData.eventDate || new Date().toISOString(),
                eventLocation: ticketData.eventLocation || { type: 'Physical', venueName: 'Local a definir' },
                eventImage: ticketData.eventImage,
                registrationId: registrationId || ticketData.registrationId,
                seedPhrase: ticketData.seedPhrase,
                privateKey: ticketData.privateKey,
                source: 'modal'
            };
        }
        
        // Prioridade 2: Dados do MyTickets
        if (ticket) {
            console.log('[DOWNLOAD] Usando dados do MyTickets:', ticket);
            
            // ✅ EXTRAÇÃO dos dados brutos para o TicketPDF processar
            const eventDetails = ticket.event || {};
            const metadata = eventDetails.metadata || eventDetails;
            const properties = metadata.properties || {};
            const location = properties.location || {};
            const dateTime = properties.dateTime || {};
            
            // ✅ DADOS BRUTOS para o TicketPDF formatar
            return {
                mintAddress: ticket.account?.nftMint?.toString() || 'N/A',
                eventName: metadata.name || eventDetails.name || 'Evento',
                eventDate: dateTime.start || new Date().toISOString(), // ✅ Data ISO para o PDF formatar
                eventLocation: location, // ✅ Objeto location completo para o PDF processar
                eventImage: metadata.image || eventDetails.imageUrl || eventDetails.image,
                registrationId: ticket.registrationId || registrationId,
                seedPhrase: ticket.seedPhrase,
                privateKey: ticket.privateKey,
                source: 'mytickets'
            };
        }
        
        console.warn('[DOWNLOAD] Nenhum dado válido encontrado');
        return null;
    };

    // ✅ VALIDAÇÃO
    const validateTicketInfo = (info) => {
        if (!info) {
            throw new Error('Dados do ingresso não disponíveis');
        }

        if (!info.registrationId) {
            throw new Error('ID de registro não encontrado para gerar QR Code');
        }

        console.log('[DOWNLOAD] Dados validados para PDF:', {
            eventName: info.eventName,
            eventDate: info.eventDate,
            eventLocation: info.eventLocation,
            registrationId: info.registrationId
        });

        return true;
    };

    // ✅ PROCESSAMENTO DE IMAGEM (mantido igual)
    const processImage = async (imageUrl, imageType = 'event') => {
        if (!imageUrl) {
            console.log(`[DOWNLOAD] Sem imagem de ${imageType}`);
            return null;
        }

        try {
            console.log(`[DOWNLOAD] Processando imagem ${imageType}:`, imageUrl);
            
            let finalUrl = imageUrl;
            
            if (imageType === 'brand') {
                const logoUrls = [
                    "https://red-obedient-stingray-854.mypinata.cloud/ipfs/bafkreih7ofsa246z5vnjvrol6xk5tpj4zys42tcaotxq7tp7ptgraalrya",
                    "https://gateway.pinata.cloud/ipfs/bafkreih7ofsa246z5vnjvrol6xk5tpj4zys42tcaotxq7tp7ptgraalrya"
                ];
                
                for (const url of logoUrls) {
                    try {
                        const testResponse = await fetch(`https://corsproxy.io/?${encodeURIComponent(url)}`);
                        if (testResponse.ok) {
                            finalUrl = url;
                            break;
                        }
                    } catch (e) {
                        continue;
                    }
                }
            }

            const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(finalUrl)}`;
            const response = await fetch(proxyUrl);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const blob = await response.blob();
            
            return await new Promise((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    console.log(`[DOWNLOAD] Imagem ${imageType} convertida para base64`);
                    resolve(reader.result);
                };
                reader.onerror = () => {
                    console.warn(`[DOWNLOAD] Erro ao ler imagem ${imageType}`);
                    resolve(null);
                };
                reader.readAsDataURL(blob);
            });
        } catch (error) {
            console.warn(`[DOWNLOAD] Erro ao processar imagem ${imageType}:`, error);
            return null;
        }
    };

    const handleDownload = async () => {
        const info = getTicketInfo();
        
        if (!info) {
            const errorMsg = "Dados do ingresso não encontrados.";
            if (showToast) toast.error(errorMsg);
            onDownloadError(new Error(errorMsg));
            return;
        }

        setIsLoading(true);
        onDownloadStart();
        const loadingToast = showToast ? toast.loading('Gerando PDF do ingresso...') : null;

        try {
            // ✅ Validação dos dados
            validateTicketInfo(info);
            
            console.log(`[DOWNLOAD] Iniciando geração para: ${info.eventName}`, {
                eventDate: info.eventDate,
                eventLocation: info.eventLocation,
                registrationId: info.registrationId
            });

            // ✅ Geração do QR Code
            const qrCodeImage = await QRCode.toDataURL(info.registrationId, {
                width: 400,
                margin: 2,
                errorCorrectionLevel: 'H'
            });

            // ✅ Processamento das imagens
            const [eventImageBase64, brandLogoBase64] = await Promise.all([
                processImage(info.eventImage, 'event'),
                processImage("https://red-obedient-stingray-854.mypinata.cloud/ipfs/bafkreih7ofsa246z5vnjvrol6xk5tpj4zys42tcaotxq7tp7ptgraalrya", 'brand')
            ]);

            // ✅ DADOS NO FORMATO QUE O TICKETPDF ESPERA
            const pdfData = {
                eventName: info.eventName,
                eventDate: info.eventDate, // ✅ Data ISO - o PDF vai formatar
                eventLocation: info.eventLocation, // ✅ Objeto location - o PDF vai processar
                mintAddress: info.mintAddress,
                eventImage: eventImageBase64,
                registrationId: info.registrationId,
                seedPhrase: info.seedPhrase,
                privateKey: info.privateKey,
                generatedAt: new Date().toISOString()
            };

            console.log('[DOWNLOAD] Dados enviados para TicketPDF:', {
                eventName: pdfData.eventName,
                eventDate: pdfData.eventDate,
                eventLocation: pdfData.eventLocation,
                hasEventImage: !!pdfData.eventImage,
                hasBrandLogo: !!brandLogoBase64,
                hasSeedPhrase: !!pdfData.seedPhrase,
                hasPrivateKey: !!pdfData.privateKey
            });

            // ✅ Geração do PDF
            const blob = await pdf(
                <TicketPDF 
                    ticketData={pdfData} 
                    qrCodeImage={qrCodeImage}
                    brandLogoImage={brandLogoBase64}
                />
            ).toBlob();
            
            // ✅ Download do arquivo
            const fileName = `Ingresso_${info.eventName.replace(/[^\w\s]/gi, '').replace(/\s+/g, '_')}.pdf`;
            const downloadUrl = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = fileName;
            link.style.display = 'none';
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
            
            // ✅ Feedback
            if (showToast) {
                toast.success('Ingresso baixado com sucesso!', { 
                    id: loadingToast,
                    duration: 3000 
                });
            }
            
            onDownloadComplete(pdfData);
            
        } catch (error) {
            console.error('[DOWNLOAD] Erro ao gerar PDF:', error);
            
            let errorMessage = 'Erro ao gerar PDF. Tente novamente.';
            
            if (error.message.includes('registro') || error.message.includes('ID de registro')) {
                errorMessage = 'Não foi possível gerar o QR Code do ingresso.';
            } else if (error.message.includes('CORS') || error.message.includes('Failed to fetch')) {
                errorMessage = 'Problema de conexão com as imagens.';
            } else if (error.message.includes('Dados do ingresso')) {
                errorMessage = error.message;
            }
            
            if (showToast) {
                toast.error(errorMessage, { 
                    id: loadingToast,
                    duration: 5000 
                });
            }
            
            onDownloadError(error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <button 
            onClick={handleDownload} 
            disabled={isLoading} 
            className={className}
            title="Baixar ingresso em PDF"
        >
            {isLoading ? (
                <>
                    <span className="animate-spin mr-2">⟳</span>
                    Gerando...
                </>
            ) : (
                children
            )}
        </button>
    );
};

// ✅ Prop Types para melhor desenvolvimento
TicketDownloader.defaultProps = {
    ticket: null,
    ticketData: null,
    registrationId: null,
    showToast: true,
    onDownloadStart: () => {},
    onDownloadComplete: () => {},
    onDownloadError: () => {}
};