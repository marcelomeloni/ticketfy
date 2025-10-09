import { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import QRCode from 'react-qr-code';
import toast from 'react-hot-toast';
import { ArrowDownTrayIcon, ExclamationTriangleIcon, ShieldCheckIcon, ClockIcon } from '@heroicons/react/24/outline';
import { supabase } from '../lib/supabaseClient';
import { jsPDF } from "jspdf";

import { API_URL } from '@/lib/constants';

const CertificateDisplay = ({ profile, ticketData, eventName }) => {
    const qrCodeContainerRef = useRef(null);


    const eventMetadata = ticketData.event?.metadata || {};
    

    const organizerLogoUrl = ticketData.event?.organizerLogo || 
                           eventMetadata.organizer?.organizerLogo || 
                           eventMetadata.organizerLogo;


    const complementaryHours = ticketData.event?.complementaryHours ||
                             eventMetadata.complementaryHours || 
                             eventMetadata.additionalInfo?.complementaryHours || 0;

    const displayEventName = ticketData.event?.name || eventName || "Evento Especial";

    console.log('📋 Dados do certificado:', {
        eventName: displayEventName,
        organizerLogo: organizerLogoUrl,
        complementaryHours,
        hasFullMetadata: !!eventMetadata.organizer
    });
    const handleDownload = async () => {
        const loadingToast = toast.loading("Gerando seu certificado em PDF...");

        try {
            const loadImage = (src) => {
                return new Promise((resolve, reject) => {
                    if (!src || src === '/default-event-logo.png') {
                        return resolve(null);
                    }
                    const img = new Image();
                    img.crossOrigin = "anonymous";
                    img.onload = () => resolve(img);
                    img.onerror = () => {
                        console.warn(`Falha ao carregar imagem: ${src}`);
                        resolve(null);
                    };
                    img.src = src;
                });
            };

            const svgElement = qrCodeContainerRef.current?.querySelector('svg');
            if (!svgElement) {
                throw new Error("QR Code não encontrado.");
            }

            const svgData = new XMLSerializer().serializeToString(svgElement);
            const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
            const qrCodeUrl = URL.createObjectURL(svgBlob);

            const imagePromises = [
                loadImage(qrCodeUrl),
                loadImage('/logo.png'),
                loadImage(organizerLogoUrl)
            ];

            const [qrCodeImage, ticketfyLogoImage, organizerLogoImage] = await Promise.all(imagePromises);

            const scale = 2;
            const canvas = document.createElement('canvas');
            const canvasWidth = 842;
            const canvasHeight = 595;
            canvas.width = canvasWidth * scale;
            canvas.height = canvasHeight * scale;
            const ctx = canvas.getContext('2d');

            // Código de desenho do certificado (mantido igual)
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.strokeStyle = '#E2E8F0';
            ctx.lineWidth = 1 * scale;
            ctx.strokeRect(20 * scale, 20 * scale, canvas.width - 40 * scale, canvas.height - 40 * scale);
            
            ctx.textAlign = 'center';

            // Logo do Organizador (se existir)
            if (organizerLogoImage) {
                const logoHeight = 50 * scale;
                const logoWidth = (logoHeight / organizerLogoImage.height) * organizerLogoImage.width;
                ctx.drawImage(organizerLogoImage, canvas.width / 2 - logoWidth / 2, 50 * scale, logoWidth, logoHeight);
            }

            ctx.fillStyle = '#1E293B';
            ctx.font = `bold ${32 * scale}px "Times New Roman", serif`;
            ctx.fillText('Certificado de Participação', canvas.width / 2, 140 * scale);
            
            ctx.fillStyle = '#475569';
            ctx.font = `${18 * scale}px "Helvetica Neue", sans-serif`;
            ctx.fillText('Este certificado é concedido a', canvas.width / 2, 200 * scale);

            ctx.fillStyle = '#4338CA';
            ctx.font = `bold ${48 * scale}px "Helvetica Neue", sans-serif`;
            ctx.fillText(profile.name, canvas.width / 2, 270 * scale);

            let participationText = `pela sua participação bem-sucedida no evento`;
            if (complementaryHours && complementaryHours > 0) {
                participationText = `pela sua participação com carga horária de ${complementaryHours} horas no evento`;
            }
            ctx.fillStyle = '#475569';
            ctx.font = `${18 * scale}px "Helvetica Neue", sans-serif`;
            ctx.fillText(participationText, canvas.width / 2, 330 * scale);

            ctx.fillStyle = '#1E293B';
            ctx.font = `bold ${24 * scale}px "Helvetica Neue", sans-serif`;
            ctx.fillText(eventName, canvas.width / 2, 370 * scale);

            const issueDate = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
            ctx.textAlign = 'left';
            ctx.fillStyle = '#64748B';
            ctx.font = `normal ${12 * scale}px "Helvetica Neue", sans-serif`;
            ctx.fillText(`Emitido em: ${issueDate}`, 60 * scale, canvas.height - 60 * scale);
            ctx.font = `normal ${12 * scale}px monospace`;
            ctx.fillText(ticketData.ticket.nftMint, 60 * scale, canvas.height - 45 * scale);

            // Selo da Ticketfy
            const sealSize = 60 * scale;
            const sealX = canvas.width - 100 * scale;
            const sealY = canvas.height - 80 * scale;
            if (ticketfyLogoImage) { 
                ctx.drawImage(ticketfyLogoImage, sealX - sealSize / 2, sealY - sealSize / 2, sealSize, sealSize);
            }

            // QR Code
            const qrSize = 80 * scale;
            ctx.drawImage(qrCodeImage, canvas.width / 2 - qrSize / 2, canvas.height - 120 * scale, qrSize, qrSize);
            URL.revokeObjectURL(qrCodeUrl);

            // Geração do PDF
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF({
                orientation: 'landscape',
                unit: 'px',
                format: [canvasWidth, canvasHeight]
            });
            
            pdf.addImage(imgData, 'PNG', 0, 0, canvasWidth, canvasHeight);
            pdf.save(`Certificado-${eventName}-${profile.name.replace(/\s/g, '_')}.pdf`);

            toast.success("Download do PDF iniciado!", { id: loadingToast });

        } catch (error) {
            console.error("Erro ao gerar certificado:", error);
            toast.error(error.message || "Erro ao gerar certificado.", { id: loadingToast });
        }
    };


    const certificateId = ticketData.ticket.nftMint;
    const issueDate = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });

    return (
        <div className="max-w-5xl mx-auto bg-white rounded-lg shadow-2xl p-4 sm:p-6 border border-slate-200">
            <div className="border-2 border-slate-300 rounded p-6 sm:p-10 text-center relative overflow-hidden">
                <div className="absolute -top-12 -left-12 w-48 h-48 border-8 border-slate-100 rounded-full"></div>
                <div className="absolute -bottom-16 -right-16 w-64 h-64 border-[12px] border-slate-50"></div>
                <div className="relative z-10">
                    
                    {organizerLogoUrl && organizerLogoUrl !== '/default-event-logo.png' && (
                        <img src={organizerLogoUrl} alt="Logo do Organizador" className="h-16 mx-auto mb-4 object-contain" />
                    )}

                    <h1 className="text-4xl sm:text-5xl font-serif font-bold text-slate-800">{displayEventName}</h1>
                    <h3 className="mt-4 text-sm uppercase tracking-widest text-slate-500">Certificado de Participação</h3>

                    <p className="mt-12 text-lg text-slate-600">Este certificado é concedido a</p>
                    <p className="mt-3 text-4xl sm:text-5xl font-bold text-indigo-600 tracking-wide">{profile.name}</p>
                    
                    {complementaryHours && complementaryHours > 0 ? (
                        <p className="mt-8 text-lg text-slate-600">pela sua participação com carga horária de <strong>{complementaryHours} horas</strong>.</p>
                    ) : (
                        <p className="mt-8 text-lg text-slate-600">pela sua participação bem-sucedida no evento.</p>
                    )}

                    <div className="mt-12 grid sm:grid-cols-3 gap-8 items-end">
                        <div className="text-left">
                            <p className="text-sm font-semibold text-slate-700">Emitido em</p>
                            <p className="text-lg text-slate-900">{issueDate}</p>
                            <p className="mt-2 text-sm font-semibold text-slate-700">ID de Verificação</p>
                            <p className="text-xs text-slate-500 font-mono break-all" title={certificateId}>
                                {certificateId}
                            </p>
                        </div>
                        <div className="flex flex-col items-center">
                            <div className="p-1 bg-white rounded-md shadow-sm" ref={qrCodeContainerRef}>
                                <QRCode value={`https://solscan.io/token/${certificateId}?cluster=devnet`} size={96} />
                            </div>
                            <p className="mt-2 text-xs text-slate-500 font-semibold">Verificação On-chain</p>
                        </div>
                        <div className="flex flex-col items-end">
                            <img src="/logo.png" alt="Ticketfy Logo" className="h-20 w-20" />
                            <p className="mt-2 text-xs text-slate-500 font-semibold">Emitido por Ticketfy</p>
                        </div>
                    </div>
                </div>
            </div>
            <div className="mt-6 text-center">
                <button
                    onClick={handleDownload}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-indigo-600 hover:bg-indigo-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                    <ArrowDownTrayIcon className="h-5 w-5" />
                    Baixar Certificado em PDF
                </button>
            </div>
        </div>
    );
};

// --- Componente Principal da Página ---
export const CertificatePage = () => {
    const { mintAddress } = useParams();
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [ticketData, setTicketData] = useState(null);
    const [userProfile, setUserProfile] = useState(null);

    useEffect(() => {
        if (!mintAddress) {
            setError("Endereço do ingresso não fornecido.");
            setIsLoading(false);
            return;
        }

        const fetchCertificateData = async () => {
            try {
                const response = await fetch(`${API_URL}/api/tickets/ticket-data/${mintAddress}`);
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || "Ingresso não encontrado.");
                }
                const result = await response.json();

                if (!result.ticket.redeemed) {
                    throw new Error("Este ingresso precisa ser validado no evento para gerar o certificado.");
                }
                setTicketData(result);

                const ownerAddress = result.owner;
                const { data: profileData, error: profileError } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('wallet_address', ownerAddress)
                    .single();

                if (profileError || !profileData) {
                    throw new Error(profileError?.message || "Perfil do usuário não encontrado no banco de dados.");
                }
                setUserProfile(profileData);

            } catch (err) {
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        };

        fetchCertificateData();
    }, [mintAddress]);

    return (
        <div className="min-h-screen bg-slate-100 py-12 px-4 sm:px-6 lg:px-8 bg-[url('/grid.svg')]">
            <header className="text-center mb-12">
                <div className="inline-flex items-center gap-3 bg-white py-2 px-6 rounded-full shadow-md border border-slate-200">
                    <ShieldCheckIcon className="h-6 w-6 text-green-500" />
                    <h1 className="text-xl sm:text-2xl font-bold text-slate-800">Certificado Verificado</h1>
                </div>
            </header>
            <main>
                {isLoading && (
                    <div className="flex justify-center items-center py-20">
                        <ClockIcon className="h-12 w-12 animate-spin text-slate-500" />
                    </div>
                )}
                {error && (
                    <div className="max-w-2xl mx-auto text-center p-8 bg-white rounded-lg shadow-md border border-red-200">
                        <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-red-500" />
                        <h2 className="mt-4 text-xl font-bold text-slate-800">Não foi possível gerar o certificado</h2>
                        <p className="mt-2 text-slate-600">{error}</p>
                    </div>
                )}
                {ticketData && userProfile && (
                    <CertificateDisplay 
                        profile={userProfile} 
                        ticketData={ticketData} 
                        eventName={ticketData.event?.name || "Evento Especial"} 
                    />
                )}
            </main>
        </div>
    );
};



