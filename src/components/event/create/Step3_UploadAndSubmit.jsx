// Step3_UploadAndSubmit.jsx - versão corrigida
import { ActionButton } from '@/components/ui/ActionButton';
import { Step } from './common/Step';
import { RocketLaunchIcon, CheckCircleIcon, DocumentArrowDownIcon } from '@heroicons/react/24/outline';
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';
import { generateFlyerPdf } from '@/lib/generateFlyer';

export function Step3_UploadAndSubmit({ isActive, generatedJson, loading, eventAddress, eventImageUrl }) {
    const { isAuthenticated, publicKey } = useAuth();
    
    const handleDownloadFlyer = async () => {
        if (!generatedJson || !eventAddress) {
            toast.error("Dados do evento ou endereço não disponíveis para gerar o flyer.");
            return;
        }

        const eventData = JSON.parse(generatedJson);
        const { offChain } = eventData;
        const eventName = offChain.name || "Evento";
        
        // ✅ USE A URL DA IMAGEM REAL SE DISPONÍVEL
        let finalImageUrl = eventImageUrl;

        // Se não temos a URL real, tente usar a do generatedJson (pode ser placeholder)
        if (!finalImageUrl) {
            finalImageUrl = offChain.image;
            
            // Se for um placeholder, não podemos usar
            if (finalImageUrl && typeof finalImageUrl === 'string' && finalImageUrl.startsWith('[Arquivo:')) {
                finalImageUrl = null;
                toast("⚠️ A imagem do flyer não está disponível. O flyer será gerado sem imagem.", {
                    icon: '⚠️',
                    duration: 4000,
                });
            }
        }

        console.log('🖼️ Tentando gerar flyer com imagem:', finalImageUrl);

        try {
            await generateFlyerPdf({ 
                eventName, 
                eventImageUrl: finalImageUrl, 
                eventAddress 
            });
            toast.success("Flyer gerado com sucesso!");
        } catch (error) {
            console.error("Erro ao gerar flyer:", error);
            toast.error(`Erro ao gerar flyer: ${error.message}`);
        }
    };
    
    if (!isActive) {
        return <Step title="Passo 3: Criação do Evento" disabled={true} />;
    }
    
    return (
        <Step title="Passo 3: Crie o Evento" isActive={true}>
            {/* Banner de Modo Automático */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                <div className="flex items-start">
                    <CheckCircleIcon className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                    <div>
                        <h4 className="text-green-800 font-medium text-sm">
                            Modo Automático Ativado
                        </h4>
                        <p className="text-green-700 text-sm mt-1">
                            O evento será criado automaticamente usando sua conta interna.
                            {publicKey && (
                                <span className="block mt-1 font-mono text-xs">
                                    Conta: {publicKey.toString().slice(0, 8)}...{publicKey.toString().slice(-8)}
                                </span>
                            )}
                        </p>
                    </div>
                </div>
            </div>
            
            <p className="text-sm text-slate-600 mb-6 bg-blue-50 p-4 rounded-lg border border-blue-100">
                💡 <strong>Fluxo automático:</strong> Ao clicar no botão abaixo, faremos automaticamente:
                <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                    <li>Upload das imagens para IPFS</li>
                    <li>Upload dos metadados para IPFS</li>
                    <li>Criação do evento na blockchain</li>
                    <li>Confirmação da transação</li>
                </ul>
            </p>
            
            {generatedJson && (
                <div className="mt-6 border rounded-lg overflow-hidden">
                    <div className="bg-slate-800 text-white px-4 py-2">
                        <h4 className="font-semibold text-sm">Pré-visualização dos Dados do Evento:</h4>
                    </div>
                    <pre className="bg-slate-50 p-4 text-xs overflow-x-auto max-h-64 border-t">
                        <code>{generatedJson}</code>
                    </pre>
                </div>
            )}
            
            <div className="pt-6 border-t">
                <ActionButton 
                    type="submit" 
                    loading={loading} 
                    disabled={!isAuthenticated || loading || eventAddress}
                    className="w-full text-lg py-4 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700"
                >
                    <RocketLaunchIcon className="h-6 w-6 mr-2" />
                    {loading ? (
                        "Criando Evento na Blockchain..."
                    ) : isAuthenticated && !eventAddress ? (
                        "🎉 Criar Evento Automaticamente"
                    ) : isAuthenticated && eventAddress ? (
                        "Evento Criado!"
                    ) : (
                        "Faça Login para Criar o Evento"
                    )}
                </ActionButton>
                
                {eventAddress && (
                    <div className="mt-6">
                        <ActionButton
                            type="button"
                            onClick={handleDownloadFlyer}
                            loading={false}
                            className="w-full text-lg py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                        >
                            <DocumentArrowDownIcon className="h-6 w-6 mr-2" />
                            Baixar Flyer do Evento
                        </ActionButton>
                    </div>
                )}
                
                {!isAuthenticated && (
                    <p className="text-red-600 text-sm text-center mt-3 bg-red-50 p-3 rounded border border-red-200">
                        ⚠️ Você precisa estar logado para criar um evento.
                    </p>
                )}
                
                {isAuthenticated && !loading && !eventAddress && (
                    <div className="mt-4 text-center">
                        <p className="text-xs text-slate-500">
                            📍 O evento será criado na blockchain usando sua conta interna
                        </p>
                        <p className="text-xs text-slate-400 mt-1">
                            Não será necessário aprovar transações manualmente
                        </p>
                    </div>
                )}

                {eventAddress && (
                    <div className="mt-4 text-center">
                        <p className="text-xs text-green-600 font-medium">
                            ✅ Evento criado com sucesso!
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                            Baixe o flyer para compartilhar seu evento
                        </p>
                    </div>
                )}
            </div>
            
            {/* Status de Loading Detalhado */}
            {loading && (
                <div className="mt-6 p-4 bg-slate-50 rounded-lg border">
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-600">Processando...</span>
                        <div className="flex space-x-2">
                            <div className="h-2 w-2 bg-blue-500 rounded-full animate-bounce"></div>
                            <div className="h-2 w-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                            <div className="h-2 w-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                        </div>
                    </div>
                    <div className="mt-2 space-y-2 text-xs text-slate-500">
                        <div className="flex items-center">
                            <div className="h-2 w-2 bg-green-500 rounded-full mr-2"></div>
                            <span>Upload de imagens para IPFS</span>
                        </div>
                        <div className="flex items-center">
                            <div className="h-2 w-2 bg-blue-500 rounded-full mr-2"></div>
                            <span>Upload de metadados para IPFS</span>
                        </div>
                        <div className="flex items-center">
                            <div className="h-2 w-2 bg-purple-500 rounded-full mr-2"></div>
                            <span>Criação do evento na blockchain</span>
                        </div>
                    </div>
                </div>
            )}
        </Step>
    );
}