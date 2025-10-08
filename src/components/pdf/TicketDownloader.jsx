import { useState } from 'react';
import toast from 'react-hot-toast';
import { pdf } from '@react-pdf/renderer';
import QRCode from 'qrcode';
import { TicketPDF } from './TicketPDF';
import { supabase } from '@/lib/supabaseClient'; // 1. Importe o cliente Supabase

const TicketDownloader = ({ ticket, eventDetails, children, className }) => {
    const [isLoading, setIsLoading] = useState(false);

    const handleDownload = async () => {
        if (!eventDetails) return toast.error("Detalhes do evento não encontrados.");
        
        setIsLoading(true);
        const loadingToast = toast.loading('Gerando PDF do ingresso...');

        try {
            const { account: ticketData, registrationId } = ticket;
            const mintAddress = ticketData.nftMint.toString();

            // ✅ VERIFICAÇÃO: Garantir que temos registrationId
            if (!registrationId) {
                throw new Error("Não foi possível encontrar o registro do ingresso.");
            }

            console.log(`[DOWNLOAD] Gerando QR Code com registrationId: ${registrationId}`);

            // ✅ AGORA USA registrationId PARA O QR CODE
            const qrCodeImage = await QRCode.toDataURL(registrationId, {
                width: 512,
                margin: 1,
            });

            // ✅ CORREÇÃO: Remover headers problemáticos que causam CORS
            let eventImageBase64 = null;
            if (eventDetails.metadata.image) {
                try {
                    // ✅ SIMPLIFICADO: Fetch sem headers problemáticos
                    const response = await fetch(eventDetails.metadata.image);
                    if (!response.ok) throw new Error('Falha ao buscar a imagem do evento.');
                    const blob = await response.blob();

                    eventImageBase64 = await new Promise((resolve, reject) => {
                        const img = new Image();
                        img.crossOrigin = "anonymous";
                        const url = URL.createObjectURL(blob);
                        
                        img.onload = () => {
                            const canvas = document.createElement('canvas');
                            canvas.width = img.naturalWidth;
                            canvas.height = img.naturalHeight;
                            const ctx = canvas.getContext('2d');
                            
                            // ✅ Fundo branco para garantir contraste
                            ctx.fillStyle = '#FFFFFF';
                            ctx.fillRect(0, 0, canvas.width, canvas.height);
                            ctx.drawImage(img, 0, 0);
                            
                            const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
                            URL.revokeObjectURL(url);
                            resolve(dataUrl);
                        };
                        
                        img.onerror = (error) => { 
                            URL.revokeObjectURL(url); 
                            console.warn('[DOWNLOAD] Erro ao carregar imagem do evento, continuando sem imagem...');
                            resolve(null); // ✅ Continua mesmo sem imagem
                        };
                        
                        img.src = url;
                    });
                } catch (imageError) {
                    console.warn('[DOWNLOAD] Erro ao processar imagem do evento:', imageError);
                    // ✅ Continua o processo mesmo sem a imagem
                    eventImageBase64 = null;
                }
            }

            // ✅ Dados atualizados com registrationId
            const pdfData = {
                eventName: eventDetails.metadata.name,
                eventDate: eventDetails.metadata.properties.dateTime.start,
                eventLocation: eventDetails.metadata.properties.location,
                mintAddress: mintAddress,
                eventImage: eventImageBase64,
                registrationId: registrationId,
            };

            console.log('[DOWNLOAD] Gerando PDF...');
            
            // Geração do PDF
            const blob = await pdf(
                <TicketPDF 
                    ticketData={pdfData} 
                    qrCodeImage={qrCodeImage}
                    brandLogoImage="https://red-obedient-stingray-854.mypinata.cloud/ipfs/bafkreih7ofsa246z5vnjvrol6xk5tpj4zys42tcaotxq7tp7ptgraalrya"
                />
            ).toBlob();
            
            const downloadUrl = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = `Ingresso_${pdfData.eventName.replace(/\s/g, '_')}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(downloadUrl);
            
            toast.success('Ingresso baixado com sucesso!', { id: loadingToast });
        } catch (error) {
            console.error('Erro ao gerar PDF:', error);
            
            // ✅ Mensagens de erro mais específicas
            let errorMessage = 'Erro ao gerar PDF.';
            if (error.message.includes('registro')) {
                errorMessage = 'Não foi possível encontrar os dados do ingresso.';
            } else if (error.message.includes('imagem')) {
                errorMessage = 'Ingresso gerado, mas a imagem do evento não pôde ser carregada.';
            } else {
                errorMessage = error.message || errorMessage;
            }
            
            toast.error(errorMessage, { id: loadingToast });
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
