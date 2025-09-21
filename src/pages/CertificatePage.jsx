// src/pages/CertificatePage.jsx

import { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import QRCode from 'react-qr-code';
import { AcademicCapIcon, ArrowDownTrayIcon, ExclamationTriangleIcon, ShieldCheckIcon, ClockIcon } from '@heroicons/react/24/outline';

const API_URL = "https://gasless-api-ke68.onrender.com";

// Componente para exibir o certificado
const CertificateDisplay = ({ data, eventName }) => {
    const certificateRef = useRef(null);
    // ✅ CORREÇÃO: Defina a ref que estava faltando.
    const qrCodeContainerRef = useRef(null);

    const handleDownload = () => {
        // A lógica de download agora vai procurar o SVG dentro de qrCodeContainerRef,
        // o que é mais seguro do que procurar em todo o 'certificateRef'.
        const svgElement = qrCodeContainerRef.current?.querySelector('svg');
        if (!svgElement) {
            alert("Não foi possível encontrar o QR Code para gerar a imagem.");
            return;
        }

        const svgData = new XMLSerializer().serializeToString(svgElement);
        const img = new Image();
        const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(svgBlob);

        img.onload = () => {
            const scale = 2;
            const canvas = document.createElement('canvas');
            canvas.width = 800 * scale;
            canvas.height = 560 * scale;
            const ctx = canvas.getContext('2d');

            // Fundo
            ctx.fillStyle = '#f8fafc'; // slate-50
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // Título
            ctx.fillStyle = '#0f172a'; // slate-900
            ctx.font = `bold ${48 * scale}px serif`;
            ctx.textAlign = 'center';
            ctx.fillText('Certificado de Participação', canvas.width / 2, 80 * scale);
            
            // Texto
            ctx.fillStyle = '#334155'; // slate-700
            ctx.font = `${20 * scale}px sans-serif`;
            ctx.fillText('Este certificado é concedido a', canvas.width / 2, 160 * scale);
            
            // Nome do Participante
            ctx.fillStyle = '#4f46e5'; // indigo-600
            ctx.font = `bold ${40 * scale}px sans-serif`;
            ctx.fillText(data.profile.name, canvas.width / 2, 230 * scale);

            // Descrição
            ctx.fillStyle = '#334155';
            ctx.font = `${20 * scale}px sans-serif`;
            ctx.fillText(`pela sua participação no evento`, canvas.width / 2, 290 * scale);
            
            // Nome do Evento
            ctx.font = `bold ${24 * scale}px sans-serif`;
            ctx.fillText(eventName, canvas.width / 2, 330 * scale);

            // QR Code de Validação
            const qrSize = 100 * scale;
            ctx.drawImage(img, (canvas.width / 2) - (qrSize / 2), 370 * scale, qrSize, qrSize);
            URL.revokeObjectURL(url);

            const image = canvas.toDataURL('image/png');
            const link = document.createElement('a');
            link.href = image;
            link.download = `certificado-${data.profile.name.replace(/\s/g, '-')}.png`;
            link.click();
            document.body.removeChild(link); // Limpeza do elemento
        };
        img.onerror = () => {
            alert("Ocorreu um erro ao carregar a imagem do QR Code.");
        };
        img.src = url;
    };

    return (
        <div className="max-w-4xl mx-auto">
            {/* Agora o 'certificateRef' envolve apenas o visual do certificado */}
            <div ref={certificateRef} className="bg-slate-50 p-10 sm:p-16 border-8 border-double border-slate-300 rounded-lg shadow-2xl text-center">
                <AcademicCapIcon className="mx-auto h-16 w-16 text-indigo-500 mb-4" />
                <h1 className="text-4xl sm:text-5xl font-serif font-bold text-slate-900">Certificado de Participação</h1>
                <p className="mt-8 text-xl text-slate-700">Este certificado é concedido a</p>
                <p className="mt-4 text-4xl sm:text-5xl font-bold text-indigo-600">{data.profile.name}</p>
                <p className="mt-6 text-xl text-slate-700">pela sua participação no evento</p>
                <p className="mt-2 text-2xl font-bold text-slate-800">{eventName}</p>
                <div className="mt-10 flex flex-col items-center">
                    <p className="text-sm text-slate-500 mb-2">Validação On-chain</p>
                    {/* A ref é aplicada diretamente no contêiner do QR Code */}
                    <div className="p-2 bg-white rounded-md" ref={qrCodeContainerRef}>
                        <QRCode value={`https://solscan.io/token/${data.ticket.nftMint}?cluster=devnet`} size={100} />
                    </div>
                </div>
            </div>
            <div className="mt-8 text-center">
                <button 
                    onClick={handleDownload}
                    className="inline-flex items-center gap-2 px-6 py-3 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-indigo-600 hover:bg-indigo-700"
                >
                    <ArrowDownTrayIcon className="h-5 w-5"/>
                    Baixar Certificado
                </button>
            </div>
        </div>
    );
};


// Componente principal da página (sem alterações)
export const CertificatePage = () => {
    const { mintAddress } = useParams();
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [data, setData] = useState(null);

    // TODO: Obter o nome do evento dinamicamente se necessário
    const eventName = "Meu Evento Incrível na Solana";

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

                // A VERIFICAÇÃO CRUCIAL!
                if (!result.ticket.redeemed) {
                    throw new Error("Este ingresso precisa ser validado no evento para gerar o certificado.");
                }

                setData(result);
            } catch (err) {
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        };

        fetchCertificateData();
    }, [mintAddress]);

    if (isLoading) {
        return <div className="flex justify-center items-center h-screen"><ClockIcon className="h-12 w-12 animate-spin text-slate-500" /></div>;
    }
    
    if (error) {
        return (
            <div className="flex justify-center items-center h-screen text-center p-4">
                <div>
                    <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-red-500" />
                    <h2 className="mt-4 text-xl font-bold">Não foi possível gerar o certificado</h2>
                    <p className="mt-2 text-slate-600">{error}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-slate-200 min-h-screen py-12 px-4">
            <header className="text-center mb-12">
                <div className="inline-flex items-center gap-3 bg-white py-2 px-6 rounded-full shadow-md">
                    <ShieldCheckIcon className="h-6 w-6 text-green-500"/>
                    <h1 className="text-2xl font-bold text-slate-800">Certificado Verificado</h1>
                </div>
            </header>
            <main>
                {data && <CertificateDisplay data={data} eventName={eventName} />}
            </main>
        </div>
    );
};
