// components/TicketDownloader.jsx
import { useState } from 'react';
import toast from 'react-hot-toast';
import { pdf } from '@react-pdf/renderer';
import QRCode from 'qrcode';
import { TicketPDF } from './pdf/TicketPDF';

export const TicketDownloader = ({ 
    // ✅ Props compatíveis com MyTickets E TicketSuccessModal
    ticket,           // Para MyTickets
    eventDetails,     // Para MyTickets  
    ticketData,       // Para TicketSuccessModal
    registrationId,   // Para ambos
    children, 
    className,
    showToast = true 
}) => {
    const [isLoading, setIsLoading] = useState(false);

    // ✅ Função para determinar de onde virão os dados
    const getTicketInfo = () => {
        // Se veio do MyTickets
        if (ticket && eventDetails) {
            return {
                mintAddress: ticket.account.nftMint.toString(),
                eventName: eventDetails.metadata.name,
                eventDate: eventDetails.metadata.properties.dateTime.start,
                eventLocation: eventDetails.metadata.properties.location,
                eventImage: eventDetails.metadata.image,
                registrationId: ticket.registrationId || registrationId
            };
        }
        
        // Se veio do TicketSuccessModal
        if (ticketData) {
            return {
                mintAddress: ticketData.mintAddress,
                eventName: ticketData.eventName,
                eventDate: ticketData.eventDate,
                eventLocation: ticketData.eventLocation,
                eventImage: ticketData.eventImage,
                registrationId: registrationId || ticketData.registrationId,
                seedPhrase: ticketData.seedPhrase
            };
        }
        
        return null;
    };

    const handleDownload = async () => {
        const info = getTicketInfo();
        
        if (!info) {
            if (showToast) toast.error("Dados do ingresso não encontrados.");
            return;
        }
        
        if (!info.registrationId) {
            if (showToast) toast.error("Não foi possível encontrar o registro do ingresso.");
            return;
        }

        setIsLoading(true);
        const loadingToast = showToast ? toast.loading('Gerando PDF do ingresso...') : null;

        try {
            console.log(`[DOWNLOAD] Gerando QR Code com registrationId: ${info.registrationId}`);

            // ✅ QR Code com registrationId
            const qrCodeImage = await QRCode.toDataURL(info.registrationId, {
                width: 512,
                margin: 1,
            });

            // ✅ Processamento da imagem do evento com tratamento CORS
            let eventImageBase64 = null;
            if (info.eventImage) {
                try {
                    const response = await fetch(info.eventImage, { 
                        mode: 'cors',
                        // ❌ SEM headers problemáticos
                    });
                    
                    if (response.ok) {
                        const blob = await response.blob();
                        eventImageBase64 = await new Promise((resolve) => {
                            const img = new Image();
                            img.crossOrigin = "anonymous";
                            const url = URL.createObjectURL(blob);
                            
                            img.onload = () => {
                                const canvas = document.createElement('canvas');
                                canvas.width = img.naturalWidth;
                                canvas.height = img.naturalHeight;
                                const ctx = canvas.getContext('2d');
                                
                                // Fundo branco para contraste
                                ctx.fillStyle = '#FFFFFF';
                                ctx.fillRect(0, 0, canvas.width, canvas.height);
                                ctx.drawImage(img, 0, 0);
                                
                                const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
                                URL.revokeObjectURL(url);
                                resolve(dataUrl);
                            };
                            
                            img.onerror = () => { 
                                URL.revokeObjectURL(url); 
                                console.warn('[DOWNLOAD] Erro ao carregar imagem do evento');
                                resolve(null);
                            };
                            
                            img.src = url;
                        });
                    }
                } catch (imageError) {
                    console.warn('[DOWNLOAD] Erro ao processar imagem do evento:', imageError);
                    eventImageBase64 = null;
                }
            }

            // ✅ Logo da marca com fallback
            let brandLogoBase64 = null;
            try {
                const brandLogoUrl = "https://red-obedient-stingray-854.mypinata.cloud/ipfs/bafkreih7ofsa246z5vnjvrol6xk5tpj4zys42tcaotxq7tp7ptgraalrya";
                const response = await fetch(brandLogoUrl, { mode: 'cors' });
                if (response.ok) {
                    const blob = await response.blob();
                    brandLogoBase64 = await new Promise((resolve) => {
                        const img = new Image();
                        img.crossOrigin = "anonymous";
                        const url = URL.createObjectURL(blob);
                        img.onload = () => {
                            const canvas = document.createElement('canvas');
                            canvas.width = img.naturalWidth;
                            canvas.height = img.naturalHeight;
                            const ctx = canvas.getContext('2d');
                            ctx.drawImage(img, 0, 0);
                            const dataUrl = canvas.toDataURL('image/png');
                            URL.revokeObjectURL(url);
                            resolve(dataUrl);
                        };
                        img.onerror = () => {
                            URL.revokeObjectURL(url);
                            resolve(null);
                        };
                        img.src = url;
                    });
                }
            } catch (logoError) {
                console.warn('[DOWNLOAD] Erro ao carregar logo:', logoError);
                brandLogoBase64 = null;
            }

            // ✅ Dados para o PDF
            const pdfData = {
                eventName: info.eventName,
                eventDate: info.eventDate,
                eventLocation: info.eventLocation,
                mintAddress: info.mintAddress,
                eventImage: eventImageBase64,
                registrationId: info.registrationId,
                seedPhrase: info.seedPhrase, // ✅ Inclui seed phrase se existir
            };

            console.log('[DOWNLOAD] Gerando PDF...');
            
            // ✅ Geração do PDF
            const blob = await pdf(
                <TicketPDF 
                    ticketData={pdfData} 
                    qrCodeImage={qrCodeImage}
                    brandLogoImage={brandLogoBase64}
                />
            ).toBlob();
            
            // ✅ Download
            const downloadUrl = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = `Ingresso_${pdfData.eventName.replace(/\s/g, '_')}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(downloadUrl);
            
            if (showToast) {
                toast.success('Ingresso baixado com sucesso!', { id: loadingToast });
            }
        } catch (error) {
            console.error('Erro ao gerar PDF:', error);
            
            let errorMessage = 'Erro ao gerar PDF.';
            if (error.message.includes('registro')) {
                errorMessage = 'Não foi possível encontrar os dados do ingresso.';
            } else if (error.message.includes('CORS') || error.message.includes('Failed to fetch')) {
                errorMessage = 'Problema de conexão. Tente novamente.';
            } else {
                errorMessage = error.message || errorMessage;
            }
            
            if (showToast) {
                toast.error(errorMessage, { id: loadingToast });
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <button onClick={handleDownload} disabled={isLoading} className={className}>
            {isLoading ? 'Gerando...' : children}
        </button>
    );
};
