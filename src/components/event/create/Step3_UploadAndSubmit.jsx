import { InputField } from '@/components/ui/InputField';
import { ActionButton } from '@/components/ui/ActionButton';
import { Step } from './common/Step';
import { ArrowDownTrayIcon } from '@heroicons/react/24/outline';

export function Step3_UploadAndSubmit({ isActive, generatedJson, metadataUrl, setMetadataUrl, loading, wallet }) {
     if (!isActive) {
         return <Step title="Passo 3: Upload e Criação" disabled={true} />;
    }
    
    const handleDownloadJson = () => {
        if (!generatedJson) return;
        const blob = new Blob([generatedJson], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'metadata.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    return (
        <Step title="Passo 3: Faça o Upload e Crie o Evento" isActive={true}>
            <p className="text-sm text-slate-500 mb-4">Seu arquivo de metadados está pronto. Siga as instruções abaixo para finalizar.</p>
            <div className="p-4 border-l-4 border-indigo-500 bg-indigo-50 rounded-md space-y-4">
                <p><strong>1. Baixe o arquivo de metadados:</strong></p>
                <ActionButton type="button" onClick={handleDownloadJson} disabled={!generatedJson} className="w-auto bg-green-600 hover:bg-green-700">
                    <ArrowDownTrayIcon className="h-5 w-5 mr-2" /> Baixar metadata.json
                </ActionButton>
                
                <p><strong>2. Faça o upload desse arquivo</strong> em um serviço como <a href="https://pinata.cloud" target="_blank" rel="noopener noreferrer" className="font-bold underline">Pinata</a> ou <a href="https://nft.storage" target="_blank" rel="noopener noreferrer" className="font-bold underline">NFT.Storage</a>.</p>
                
                <p><strong>3. Cole a URL final abaixo:</strong></p>
                <InputField label="URL Final dos Metadados" placeholder="https://gateway.pinata.cloud/ipfs/..." value={metadataUrl} onChange={e => setMetadataUrl(e.target.value)} required />
            </div>

            {generatedJson && (
                <div className="mt-4">
                    <h4 className="font-semibold text-sm mb-2">Pré-visualização do JSON:</h4>
                    <pre className="bg-slate-800 text-white p-4 rounded-md text-xs overflow-x-auto">
                        <code>{generatedJson}</code>
                    </pre>
                </div>
            )}
            
            <div className="pt-4">
                <ActionButton type="submit" loading={loading} disabled={!wallet?.publicKey || loading || !metadataUrl} className="w-full">
                    {wallet?.publicKey ? "Criar Evento na Blockchain" : "Conecte a Carteira"}
                </ActionButton>
            </div>
        </Step>
    );
}