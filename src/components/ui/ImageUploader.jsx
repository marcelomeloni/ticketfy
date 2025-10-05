// Em: src/components/ui/ImageUploader.jsx

import { useState, useRef, useEffect } from 'react';
import { PhotoIcon, ArrowUpTrayIcon } from '@heroicons/react/24/outline';

export const ImageUploader = ({ label, onFileSelect, existingImageUrl, helperText }) => {
    const [preview, setPreview] = useState(null);
    const fileInputRef = useRef(null);

    useEffect(() => {
        if (existingImageUrl) {
            setPreview(existingImageUrl);
        }
    }, [existingImageUrl]);

    const handleFileChange = (event) => {
        const file = event.target.files?.[0];
        if (!file) {
            onFileSelect(null);
            setPreview(null);
            return;
        }

        // ✅ DEBUG: Verificar o arquivo recebido
        console.log('📁 Arquivo selecionado no ImageUploader:');
        console.log('- Nome:', file.name);
        console.log('- Tipo:', file.type);
        console.log('- Tamanho:', file.size);
        console.log('- É File?:', file instanceof File);
        console.log('- É Blob?:', file instanceof Blob);
        console.log('- Constructor:', file.constructor.name);

        // Verificar se é uma imagem WebP válida
        if (!file.type.startsWith('image/')) {
            console.error('❌ Arquivo não é uma imagem:', file.type);
            alert('Por favor, selecione um arquivo de imagem válido.');
            return;
        }

        if (!file.type.includes('webp') && !file.type.includes('jpeg') && !file.type.includes('png')) {
            console.warn('⚠️ Tipo de imagem não comum:', file.type);
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            setPreview(reader.result);
        };
        reader.readAsDataURL(file);

        // Passa o arquivo para o componente pai
        onFileSelect(file);
    };

    return (
        <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
            <div className="mt-1 flex items-center gap-4">
                <div className="w-32 h-20 bg-slate-100 rounded-md flex items-center justify-center border-2 border-dashed border-slate-300 overflow-hidden">
                    {preview ? (
                        <img src={preview} alt="Pré-visualização" className="w-full h-full object-cover" />
                    ) : (
                        <PhotoIcon className="h-8 w-8 text-slate-400" />
                    )}
                </div>
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/png, image/jpeg, image/gif, image/webp"
                    className="hidden"
                />
                <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-md shadow-sm text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                    <ArrowUpTrayIcon className="h-5 w-5"/>
                    {preview ? 'Trocar Imagem' : 'Selecionar Imagem'}
                </button>
            </div>
            {helperText && <p className="mt-2 text-xs text-slate-500">{helperText}</p>}
        </div>
    );
};