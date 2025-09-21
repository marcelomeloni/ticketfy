import { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import QRCode from 'react-qr-code';
import toast from 'react-hot-toast';
import { ArrowDownTrayIcon, ExclamationTriangleIcon, ShieldCheckIcon, ClockIcon } from '@heroicons/react/24/outline';

const API_URL = "https://gasless-api-ke68.onrender.com";

// --- Componente de Exibição do Certificado (com Logo real) ---
const CertificateDisplay = ({ data, eventName }) => {
    const qrCodeContainerRef = useRef(null);

    const handleDownload = () => {
        const loadingToast = toast.loading("Gerando seu certificado...");

        // ✅ 1. FUNÇÃO AUXILIAR PARA CARREGAR UMA IMAGEM
        // Isso nos permite usar Promises para um controle mais robusto.
        const loadImage = (src) => {
            return new Promise((resolve, reject) => {
                const img = new Image();
                img.crossOrigin = "anonymous"; // Essencial para carregar imagens em canvas
                img.onload = () => resolve(img);
                img.onerror = (err) => reject(err);
                img.src = src;
            });
        };

        // Prepara o QR Code como uma imagem
        const svgElement = qrCodeContainerRef.current?.querySelector('svg');
        if (!svgElement) {
            toast.error("QR Code não encontrado.", { id: loadingToast });
            return;
        }
        const svgData = new XMLSerializer().serializeToString(svgElement);
        const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
        const qrCodeUrl = URL.createObjectURL(svgBlob);

        // ✅ 2. CARREGA AS DUAS IMAGENS (LOGO E QR CODE) EM PARALELO
        Promise.all([
            loadImage(qrCodeUrl),
            loadImage('/logo.png') // Caminho direto para o logo na pasta /public
        ]).then(([qrCodeImage, logoImage]) => {
            // ✅ 3. TODO O CÓDIGO DE DESENHO VAI AQUI DENTRO
            // Isso garante que ele só execute após AMBAS as imagens estarem carregadas.
            const scale = 2;
            const canvas = document.createElement('canvas');
            canvas.width = 842 * scale;
            canvas.height = 595 * scale;
            const ctx = canvas.getContext('2d');

            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.strokeStyle = '#E2E8F0';
            ctx.lineWidth = 1 * scale;
            ctx.strokeRect(20 * scale, 20 * scale, canvas.width - 40 * scale, canvas.height - 40 * scale);

            ctx.textAlign = 'center';
            ctx.fillStyle = '#1E293B';
            ctx.font = `bold ${40 * scale}px "Times New Roman", serif`;
            ctx.fillText('Certificado de Participação', canvas.width / 2, 110 * scale);
            
            // Desenha a imagem do logo no topo
            const logoWidth = 60 * scale;
            const logoHeight = (logoWidth / logoImage.width) * logoImage.height;
            ctx.drawImage(logoImage, canvas.width / 2 - logoWidth / 2, 35 * scale, logoWidth, logoHeight);
            
            ctx.strokeStyle = '#CBD5E1';
            ctx.lineWidth = 0.5 * scale;
            ctx.beginPath();
            ctx.moveTo(canvas.width / 2 - 150 * scale, 135 * scale);
            ctx.lineTo(canvas.width / 2 + 150 * scale, 135 * scale);
            ctx.stroke();

            ctx.fillStyle = '#475569';
            ctx.font = `${18 * scale}px "Helvetica Neue", sans-serif`;
            ctx.fillText('Este certificado é concedido a', canvas.width / 2, 190 * scale);
            ctx.fillStyle = '#4338CA';
            ctx.font = `bold ${48 * scale}px "Helvetica Neue", sans-serif`;
            ctx.fillText(data.profile.name, canvas.width / 2, 260 * scale);
            ctx.fillStyle = '#475569';
            ctx.font = `${18 * scale}px "Helvetica Neue", sans-serif`;
            ctx.fillText('pela sua participação bem-sucedida no evento', canvas.width / 2, 320 * scale);
            ctx.fillStyle = '#1E293B';
            ctx.font = `bold ${24 * scale}px "Helvetica Neue", sans-serif`;
            ctx.fillText(eventName, canvas.width / 2, 360 * scale);

            const issueDate = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
            ctx.textAlign = 'left';
            ctx.fillStyle = '#64748B';
            ctx.font = `normal ${12 * scale}px "Helvetica Neue", sans-serif`;
            ctx.fillText(`Emitido em: ${issueDate}`, 60 * scale, canvas.height - 80 * scale);
            ctx.fillText(`ID de Verificação:`, 60 * scale, canvas.height - 60 * scale);
            ctx.font = `normal ${12 * scale}px monospace`;
            ctx.fillStyle = '#475569';
            ctx.fillText(data.ticket.nftMint, 60 * scale, canvas.height - 45 * scale);
            
            // ✅ 4. DESENHA A IMAGEM DO LOGO COMO SELO
            const sealSize = 80 * scale;
            const sealX = canvas.width - 120 * scale;
            const sealY = canvas.height - 120 * scale;
            ctx.drawImage(logoImage, sealX - sealSize / 2, sealY - sealSize / 2, sealSize, sealSize);

            const qrSize = 80 * scale;
            ctx.drawImage(qrCodeImage, canvas.width / 2 - qrSize / 2, canvas.height - 120 * scale, qrSize, qrSize);
            URL.revokeObjectURL(qrCodeUrl);

            const image = canvas.toDataURL('image/png');
            const link = document.createElement('a');
            link.href = image;
            link.download = `Certificado-${eventName}-${data.profile.name.replace(/\s/g, '_')}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            toast.success("Download do certificado iniciado!", { id: loadingToast });

        }).catch(error => {
            console.error("Erro ao carregar imagens:", error);
            toast.error("Não foi possível carregar as imagens para o certificado.", { id: loadingToast });
        });
    };

    const certificateId = data.ticket.nftMint;
    const issueDate = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });

    return (
        <div className="max-w-5xl mx-auto bg-white rounded-lg shadow-2xl p-4 sm:p-6 border border-slate-200">
            <div className="border-2 border-slate-300 rounded p-6 sm:p-10 text-center relative overflow-hidden">
                <div className="absolute -top-12 -left-12 w-48 h-48 border-8 border-slate-100 rounded-full"></div>
                <div className="absolute -bottom-16 -right-16 w-64 h-64 border-[12px] border-slate-50"></div>

                <div className="relative z-10">
                    <h3 className="text-sm uppercase tracking-widest text-slate-500">Certificado de Participação</h3>
                    <h1 className="mt-2 text-4xl sm:text-5xl font-serif font-bold text-slate-800">{eventName}</h1>
                    <p className="mt-12 text-lg text-slate-600">Este certificado é concedido a</p>
                    <p className="mt-3 text-4xl sm:text-5xl font-bold text-indigo-600 tracking-wide">{data.profile.name}</p>

                    <div className="mt-12 grid sm:grid-cols-3 gap-8 items-end">
                        <div className="text-left">
                            <p className="text-sm font-semibold text-slate-700">Emitido em</p>
                            <p className="text-lg text-slate-900">{issueDate}</p>
                        </div>
                        {/* ✅ 5. USA A IMAGEM DO LOGO NO JSX */}
                        <div className="flex flex-col items-center">
                            <img src="/logo.png" alt="Ticketfy Logo" className="h-28 w-28" />
                            <p className="mt-2 text-xs text-slate-500 font-semibold">Emitido por Ticketfy</p>
                        </div>
                        <div className="text-right">
                            <p className="text-sm font-semibold text-slate-700">ID de Verificação</p>
                            <p className="text-sm text-slate-500 font-mono break-all" title={certificateId}>
                                {certificateId.slice(0, 8)}...{certificateId.slice(-8)}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-6 p-6 bg-slate-50 rounded-lg">
                <div className="flex items-center gap-3">
                    <div className="p-1 bg-white rounded-md shadow-sm" ref={qrCodeContainerRef}>
                        <QRCode value={`https://solscan.io/token/${data.ticket.nftMint}?cluster=devnet`} size={64} />
                    </div>
                    <div>
                        <h4 className="font-bold text-slate-800">Validação On-chain</h4>
                        <p className="text-sm text-slate-600">Use o QR code para verificar a autenticidade.</p>
                    </div>
                </div>

                <button
                    onClick={handleDownload}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-indigo-600 hover:bg-indigo-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                    <ArrowDownTrayIcon className="h-5 w-5" />
                    Baixar Certificado
                </button>
            </div>
        </div>
    );
};

// --- Componente Principal da Página (sem alterações) ---
export const CertificatePage = () => {
    const { mintAddress } = useParams();
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [data, setData] = useState(null);
    const [eventName, setEventName] = useState("Carregando...");

    useEffect(() => {
        if (!mintAddress) {
            setError("Endereço do ingresso não fornecido.");
            setIsLoading(false);
            return;
        }

        const fetchCertificateData = async () => {
            try {
                const response = await fetch(`${API_URL}/ticket-data/${mintAddress}`);
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || "Ingresso não encontrado.");
                }

                const result = await response.json();

                if (!result.ticket.redeemed) {
                    throw new Error("Este ingresso precisa ser validado no evento para gerar o certificado.");
                }

                setData(result);
                setEventName(result.event?.name || "Evento Especial");

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
                {data && <CertificateDisplay data={data} eventName={eventName} />}
            </main>
        </div>
    );
};
