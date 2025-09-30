// src/components/pdf/TicketDownloader.jsx

import { useState } from 'react';
import toast from 'react-hot-toast';
import { pdf } from '@react-pdf/renderer';
import QRCode from 'qrcode';
import { TicketPDF } from './TicketPDF';

export const TicketDownloader = ({ ticket, eventDetails, children, className }) => {
    const [isLoading, setIsLoading] = useState(false);

    const handleDownload = async () => {
        if (!eventDetails) return toast.error("Detalhes do evento não encontrados.");
        
        setIsLoading(true);
        const loadingToast = toast.loading('Gerando PDF do ingresso...');

        try {
            const { account: ticketData } = ticket;

            // Passo 1: Gerar a imagem do QR Code como Base64 (Data URL)
            const qrCodeImage = await QRCode.toDataURL(ticketData.nftMint.toString(), {
                width: 512,
                margin: 1,
            });

            // Passo 2: Baixar a imagem do evento e convertê-la para JPEG (formato compatível)
            let eventImageBase64 = null;
            if (eventDetails.metadata.image) {
                const response = await fetch(eventDetails.metadata.image);
                if (!response.ok) throw new Error('Falha ao buscar a imagem do evento.');
                const blob = await response.blob();

                // Lógica de conversão usando Canvas para garantir compatibilidade (ex: WEBP -> JPEG)
                eventImageBase64 = await new Promise((resolve, reject) => {
                    const img = new Image();
                    const url = URL.createObjectURL(blob);
                    
                    img.onload = () => {
                        const canvas = document.createElement('canvas');
                        canvas.width = img.naturalWidth;
                        canvas.height = img.naturalHeight;
                        const ctx = canvas.getContext('2d');
                        
                        // Adiciona um fundo branco para evitar fundos pretos em imagens com transparência
                        ctx.fillStyle = '#FFFFFF';
                        ctx.fillRect(0, 0, canvas.width, canvas.height);
                        
                        ctx.drawImage(img, 0, 0);
                        
                        const dataUrl = canvas.toDataURL('image/jpeg', 0.9); // Converte para JPEG
                        
                        URL.revokeObjectURL(url);
                        resolve(dataUrl);
                    };

                    img.onerror = (error) => {
                        URL.revokeObjectURL(url);
                        reject(error);
                    };

                    img.src = url;
                });
            }

            // Passo 3: Montar os dados finais para o componente PDF
            const pdfData = {
                eventName: eventDetails.metadata.name,
                eventDate: eventDetails.metadata.properties.dateTime.start,
                eventLocation: eventDetails.metadata.properties.location,
                mintAddress: ticketData.nftMint.toString(),
                eventImage: eventImageBase64,
            };

            // Passo 4: Gerar o PDF como um 'blob' e iniciar o download
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
            toast.error('Erro ao gerar PDF. Verifique o console.', { id: loadingToast });
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