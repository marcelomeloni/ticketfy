import { useState } from 'react';
import toast from 'react-hot-toast';
import { pdf } from '@react-pdf/renderer';
import QRCode from 'qrcode';
import { TicketPDF } from './TicketPDF';
import { supabase } from '@/lib/supabaseClient'; // 1. Importe o cliente Supabase

export const TicketDownloader = ({ ticket, eventDetails, children, className }) => {
    const [isLoading, setIsLoading] = useState(false);

    const handleDownload = async () => {
        if (!eventDetails) return toast.error("Detalhes do evento não encontrados.");
        
        setIsLoading(true);
        const loadingToast = toast.loading('Gerando PDF do ingresso...');

        try {
            const { account: ticketData } = ticket;
            const mintAddress = ticketData.nftMint.toString();

            // ✨ PASSO ADICIONAL: Buscar o registrationId no Supabase ✨
            console.log(`Buscando registrationId para o mint: ${mintAddress}`);
            const { data: registration, error: dbError } = await supabase
                .from('registrations')
                .select('id')
                .eq('mint_address', mintAddress)
                .single();

            if (dbError || !registration) {
                throw new Error("Não foi possível encontrar o registro do ingresso.");
            }
            
            const registrationId = registration.id;
            console.log(`RegistrationId encontrado: ${registrationId}`);

            // Passo 1: Gerar a imagem do QR Code com o registrationId
            const qrCodeImage = await QRCode.toDataURL(registrationId, { // <-- CORREÇÃO AQUI
                width: 512,
                margin: 1,
            });

            // Passo 2: Baixar e converter a imagem do evento (lógica inalterada)
            let eventImageBase64 = null;
            if (eventDetails.metadata.image) {
                const response = await fetch(eventDetails.metadata.image, {
                    headers: { 'Cache-Control': 'no-cache' } // Ajuda a evitar problemas de cache com CORS
                });
                if (!response.ok) throw new Error('Falha ao buscar a imagem do evento.');
                const blob = await response.blob();

                eventImageBase64 = await new Promise((resolve, reject) => {
                    const img = new Image();
                    img.crossOrigin = "anonymous"; // Essencial para carregar imagens de outros domínios no canvas
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
                    img.onerror = (error) => { URL.revokeObjectURL(url); reject(error); };
                    img.src = url;
                });
            }

            // Passo 3: Montar os dados finais, incluindo o registrationId
            const pdfData = {
                eventName: eventDetails.metadata.name,
                eventDate: eventDetails.metadata.properties.dateTime.start,
                eventLocation: eventDetails.metadata.properties.location,
                mintAddress: mintAddress,
                eventImage: eventImageBase64,
                registrationId: registrationId, // <-- CORREÇÃO AQUI
            };

            // Passo 4: Gerar o PDF e iniciar o download (lógica inalterada)
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
            toast.error(error.message || 'Erro ao gerar PDF.', { id: loadingToast });
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