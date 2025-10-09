import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';

/**
 * Gera um flyer ULTRA-PROFISSIONAL focado em QR Code, Link e Imagem com identidade Ticketfy.
 * @param {object} options - Opções para o flyer.
 * @param {string} options.eventName - Nome do evento.
 * @param {string} [options.eventImageUrl] - URL da imagem de capa do evento (opcional).
 * @param {string} options.eventAddress - Endereço do evento (usado para gerar o link e QR Code).
 */
export const generateFlyerPdf = async ({ eventName, eventImageUrl, eventAddress }) => {
    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    const margin = 15; // Margem reduzida para maximizar espaço visual

    // Cores da identidade visual Ticketfy (baseado no Home.js)
    const colors = {
        darkSlate: '#1E293B',    // Quase preto do background
        mediumSlate: '#475569',  // Texto geral
        lightSlate: '#64748B',   // Detalhes
        cyan: '#06B6D4',         // Ciano do gradiente
        fuchsia: '#EC4899',      // Fuchsia do gradiente
        purple: '#A855F7',       // Roxo do gradiente
        white: '#FFFFFF',
        offWhite: '#F8FAFC'      // Fundo sutil
    };

    // Fonte padrão (Helvetica é uma boa escolha para PDFs)
    const font = 'helvetica';

    // ✅ FUNÇÃO PARA ADICIONAR CABEÇALHO TICKETFY ESTILIZADO
    const addHeader = () => {
        const headerY = 15;

  

        // Linha superior gradiente (simulando o "stroke" do design)
        const gradientLineHeight = 2;
        doc.setFillColor(colors.cyan);
        doc.rect(0, 0, pageWidth / 2, gradientLineHeight, 'F');
        doc.setFillColor(colors.fuchsia);
        doc.rect(pageWidth / 2, 0, pageWidth / 2, gradientLineHeight, 'F');

     
   
        
        return headerY + 15; // Retorna a posição Y após o header
    };

    // ✅ FUNÇÃO PARA ADICIONAR IMAGEM EM DESTAQUE MÁXIMO
    const addEventImage = async (currentY) => {
        const imageWidth = pageWidth - (margin * 2);
        const imageHeight = 160; // Altura generosa para a imagem

        if (!eventImageUrl || typeof eventImageUrl !== 'string' || !eventImageUrl.startsWith('http')) {
            // Placeholder estilizado se não houver imagem
            doc.setFillColor(colors.offWhite);
            doc.roundedRect(margin, currentY, imageWidth, imageHeight, 8, 8, 'F');
            
            doc.setFontSize(14);
            doc.setFont(font, 'bold');
            doc.setTextColor(colors.lightSlate);
            doc.text('IMAGEM DO EVENTO', pageWidth / 2, currentY + (imageHeight / 2) + 5, { align: 'center' });
            
            return currentY + imageHeight ;
        }

        try {
            console.log('🖼️ Carregando imagem...');
            const response = await fetch(eventImageUrl);
            if (!response.ok) throw new Error('Falha ao carregar imagem');
            
            const blob = await response.blob();
            const base64data = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            });

            const img = new Image();
            await new Promise((resolve) => {
                img.onload = resolve;
                img.src = base64data;
            });

            let finalImgWidth = img.naturalWidth;
            let finalImgHeight = img.naturalHeight;
            const aspectRatio = finalImgWidth / finalImgHeight;

            // Ajuste inteligente mantendo proporções para preencher a largura
            finalImgWidth = imageWidth;
            finalImgHeight = imageWidth / aspectRatio;

            if (finalImgHeight > imageHeight) {
                finalImgHeight = imageHeight;
                finalImgWidth = imageHeight * aspectRatio;
            }

            // Centralizar horizontalmente
            const x = (pageWidth - finalImgWidth) / 2;
            const y = currentY;

            // Borda sutil para a imagem
            doc.setDrawColor(colors.offWhite);
            doc.setLineWidth(1);
            doc.roundedRect(x - 2, y - 2, finalImgWidth + 4, finalImgHeight + 4, 6, 6, 'S');

            doc.addImage(base64data, 'JPEG', x, y, finalImgWidth, finalImgHeight);
            
            console.log('✅ Imagem carregada com sucesso.');
            return y + finalImgHeight + 20;

        } catch (error) {
            console.error('❌ Erro na imagem:', error);
            // Fallback para placeholder em caso de falha
            doc.setFillColor(colors.offWhite);
            doc.roundedRect(margin, currentY, imageWidth, imageHeight, 8, 8, 'F');
            doc.setFontSize(14);
            doc.setFont(font, 'bold');
            doc.setTextColor(colors.lightSlate);
            doc.text('IMAGEM DO EVENTO', pageWidth / 2, currentY + (imageHeight / 2) + 5, { align: 'center' });
            return currentY + imageHeight + 20;
        }
    };

    // ✅ FUNÇÃO PARA ADICIONAR QR CODE (PEQUENO) E LINK CLICÁVEL
    const addQRCodeAndLink = async (currentY) => {
        const eventLiveUrl = `https://ticketfy.app/event/${eventAddress}`;
        
        try {
            console.log('🔳 Gerando QR Code...');
            const qrCodeDataUrl = await QRCode.toDataURL(eventLiveUrl, { 
                width: 140, // QR Code menor, como solicitado
                margin: 2,
                color: {
                    dark: colors.darkSlate,
                    light: '#FFFFFF'
                }
            });

            const qrSize = 40; // Tamanho reduzido para o QR Code
            const qrX = (pageWidth / 2) - (qrSize / 2); // Centralizado

            // Área para o QR Code e link
            const boxHeight = 100; // Aumentar um pouco para o link e URL
            doc.setFillColor(colors.offWhite);
            doc.setDrawColor(colors.offWhite); // Sem borda visível para a caixa
            doc.roundedRect(margin, currentY, pageWidth - (margin * 2), boxHeight, 8, 8, 'F');

            // QR CODE
            doc.addImage(qrCodeDataUrl, 'PNG', qrX, currentY + 15, qrSize, qrSize); // Posiciona o QR code dentro da caixa

            // Call to action
            doc.setFontSize(10);
            doc.setFont(font, 'bold');
            doc.setTextColor(colors.darkSlate);
            doc.text('APONTE A CAMERA PARA ACESSAR O EVENTO', pageWidth / 2, currentY + qrSize + 25, { align: 'center' });

            // Link Direto Clicável
            doc.setFontSize(12);
            doc.setFont(font, 'bold');
            doc.setTextColor(colors.fuchsia); // Cor destacada
            doc.textWithLink('ticketfy.app/events', pageWidth / 2, currentY + qrSize + 35, { 
                url: eventLiveUrl, 
                align: 'center' 
            });

            // URL completa (pequena e discreta)
            doc.setFontSize(8);
            doc.setTextColor(colors.lightSlate);
            doc.text(eventLiveUrl, pageWidth / 2, currentY + qrSize + 42, { align: 'center' });


            console.log('✅ QR Code e link adicionados.');
            return currentY + boxHeight + 10;

        } catch (error) {
            console.error('❌ Erro crítico no QR Code:', error);
            throw new Error('Falha ao gerar QR Code');
        }
    };

    // ✅ FUNÇÃO PARA ADICIONAR RODAPÉ ESTILIZADO
    const addFooter = (currentY) => {
        const footerY = Math.max(currentY, pageHeight - 20); // Garante que o rodapé esteja sempre na parte inferior

        // Linha inferior gradiente (espelhada da superior)
        const gradientLineHeight = 2;
        doc.setFillColor(colors.fuchsia);
        doc.rect(0, pageHeight - gradientLineHeight, pageWidth / 2, gradientLineHeight, 'F');
        doc.setFillColor(colors.cyan);
        doc.rect(pageWidth / 2, pageHeight - gradientLineHeight, pageWidth / 2, gradientLineHeight, 'F');

        doc.setFontSize(8);
        doc.setFont(font, 'normal');
        doc.setTextColor(colors.lightSlate);
        doc.text('A melhor plataforma para seus eventos descentralizados.', pageWidth / 2, footerY, { align: 'center' });
        doc.text('ticketfy.app © Todos os direitos reservados.', pageWidth / 2, footerY + 5, { align: 'center' });
    };

    // ✅ EXECUÇÃO PRINCIPAL - FLUXO OTIMIZADO
    try {
        console.log('🎨 Iniciando flyer Ticketfy...');

        // Fundo branco
        doc.setFillColor(colors.white);
        doc.rect(0, 0, pageWidth, pageHeight, 'F');

        let currentY = addHeader(); // Header
        currentY = await addEventImage(currentY); // Imagem em destaque
        currentY = await addQRCodeAndLink(currentY); // QR Code e link clicável
        addFooter(currentY); // Rodapé

        const fileName = `Flyer_Ticketfy_${eventName.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
        doc.save(fileName);
        
        console.log('✅ Flyer Ticketfy gerado com sucesso!');
        return true;

    } catch (error) {
        console.error('❌ Erro crítico ao gerar flyer:', error);
        
        // Fallback simples
        const fallbackDoc = new jsPDF();
        fallbackDoc.setFontSize(16);
        fallbackDoc.text("Não foi possível gerar o flyer completo.", 20, 20);
        fallbackDoc.text(`Acesse: https://ticketfy.app/event/${eventAddress}`, 20, 30);
        fallbackDoc.save(`Flyer_Erro_${eventName}.pdf`);
        
        throw error;
    }
};

