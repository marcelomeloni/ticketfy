import React, { useState, useCallback, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

// Ícones modernos
const LockClosedIcon = (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path fillRule="evenodd" d="M12 1.5a5.25 5.25 0 0 0-5.25 5.25v3a3 3 0 0 0-3 3v6.75a3 3 0 0 0 3 3h10.5a3 3 0 0 0 3-3v-6.75a3 3 0 0 0-3-3v-3c0-2.9-2.35-5.25-5.25-5.25Zm3.75 8.25v-3a3.75 3.75 0 1 0-7.5 0v3h7.5Z" clipRule="evenodd" /></svg>;
const CheckCircleIcon = (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm13.36-1.815a.75.75 0 0 0-1.065-1.065L11.755 13.14l-2.22-2.22a.75.75 0 1 0-1.065 1.065l2.75 2.75a.75.75 0 0 0 1.065 0l4.5-4.5Z" clipRule="evenodd" /></svg>;
const ArrowLeftIcon = (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path fillRule="evenodd" d="M11.03 3.513l-7.585 7.586a1.5 1.5 0 0 0 0 2.121l7.585 7.586a1.5 1.5 0 0 0 2.121-2.121l-5.657-5.657H20.25a1.5 1.5 0 0 0 0-3H7.575l5.657-5.657a1.5 1.5 0 0 0-2.121-2.121Z" clipRule="evenodd" /></svg>;
const KeyIcon = (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path fillRule="evenodd" d="M15.75 1.5a6.75 6.75 0 0 0-6.651 7.906c.067.39-.032.717-.221.906l-6.5 6.499a3 3 0 0 0-.878 2.121v2.818c0 .414.336.75.75.75H6a.75.75 0 0 0 .75-.75v-1.5h1.5A.75.75 0 0 0 9 19.5V18h1.5a.75.75 0 0 0 .53-.22l2.658-2.658c.19-.189.517-.288.906-.22A6.75 6.75 0 1 0 15.75 1.5Zm0 3a.75.75 0 0 0 0 1.5A2.25 2.25 0 0 1 18 8.25a.75.75 0 0 0 1.5 0 3.75 3.75 0 0 0-3.75-3.75Z" clipRule="evenodd" /></svg>;
const SeedIcon = (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path fillRule="evenodd" d="M4.5 9.75a6 6 0 0 1 11.573-2.226 3.75 3.75 0 0 1 4.133 4.303A4.5 4.5 0 0 1 18 20.25H6.75a5.25 5.25 0 0 1-2.23-10.004 6.072 6.072 0 0 1-.02-.496Z" clipRule="evenodd" /></svg>;
const UserIcon = (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 1 1 9 0 4.5 4.5 0 0 1-9 0ZM3.751 20.105a8.25 8.25 0 0 1 16.498 0 .75.75 0 0 1-.437.695A18.683 18.683 0 0 1 12 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 0 1-.437-.695Z" clipRule="evenodd" /></svg>;
const WalletIcon = (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M2.273 5.625A4.483 4.483 0 0 1 5.25 4.5h13.5c1.141 0 2.183.425 2.977 1.125A3 3 0 0 0 18.75 3H5.25a3 3 0 0 0-2.977 2.625ZM2.273 8.625A4.483 4.483 0 0 1 5.25 7.5h13.5c1.141 0 2.183.425 2.977 1.125A3 3 0 0 0 18.75 6H5.25a3 3 0 0 0-2.977 2.625ZM5.25 9a3 3 0 0 0-3 3v6a3 3 0 0 0 3 3h13.5a3 3 0 0 0 3-3v-6a3 3 0 0 0-3-3H15a.75.75 0 0 0-.75.75 2.25 2.25 0 0 1-4.5 0A.75.75 0 0 0 9 9H5.25Z" /></svg>;

// Componente para o formulário de Seedphrase
const SeedPhraseForm = ({ isLoading, error, loginWithSeedphrase }) => {
    const [seedWords, setSeedWords] = useState(Array(12).fill(''));

    const handlePaste = useCallback((event) => {
        event.preventDefault();
        const pastedText = event.clipboardData.getData('text');
        const words = pastedText.trim().split(/\s+/).slice(0, 12);

        setSeedWords(prevWords => {
            const newWords = [...prevWords];
            words.forEach((word, index) => {
                if (index < 12) {
                    newWords[index] = word;
                }
            });
            return newWords;
        });

        if (words.length > 0) {
            const nextInput = event.target.closest('form').querySelector(`#word-${words.length}`);
            if (nextInput) {
                nextInput.focus();
            }
        }
    }, []);

    const handleChange = useCallback((index, value) => {
        setSeedWords(prevWords => {
            const newWords = [...prevWords];
            newWords[index] = value.trim();

            if (value.trim() && index < 11) {
                const nextInput = document.getElementById(`word-${index + 1}`);
                if (nextInput) {
                    nextInput.focus();
                }
            }

            return newWords;
        });
    }, []);

    const handleSubmit = (e) => {
        e.preventDefault();
        const cleanedWords = seedWords.map(w => w.trim()).filter(w => w.length > 0);
        if (cleanedWords.length === 12) {
            loginWithSeedphrase(cleanedWords);
        }
    };

    const allFieldsFilled = seedWords.every(word => word.trim().length > 0);

    return (
        <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-xl border border-blue-100">
                <div className="flex items-center gap-2 mb-3">
                    <SeedIcon className="h-5 w-5 text-blue-600" />
                    <h3 className="text-sm font-semibold text-blue-900">Seed Phrase Recovery</h3>
                </div>
                <p className="text-xs text-blue-700">
                    Digite suas 12 palavras de recuperação na ordem correta
                </p>
            </div>

            <div className="grid grid-cols-3 gap-2 md:grid-cols-4 md:gap-3">
                {seedWords.map((word, index) => (
                    <div key={index} className="relative group">
                        <span className="absolute left-2 top-1.5 text-xs font-medium text-gray-500 z-10">
                            {index + 1}
                        </span>
                        <input
                            id={`word-${index}`}
                            type="text"
                            value={word}
                            onChange={(e) => handleChange(index, e.target.value)}
                            onPaste={index === 0 ? handlePaste : undefined}
                            placeholder="palavra"
                            required
                            className="block w-full rounded-lg border-0 pt-6 pb-2 px-2 text-gray-900 bg-white shadow-sm ring-1 ring-gray-200 placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 transition-all duration-200 text-sm text-center font-medium group-hover:ring-blue-300"
                        />
                    </div>
                ))}
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="text-sm text-red-700 text-center">{error}</p>
                </div>
            )}

            <button
                type="submit"
                disabled={isLoading || !allFieldsFilled}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 px-4 rounded-xl font-semibold shadow-lg hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98]"
            >
                {isLoading ? (
                    <div className="flex items-center justify-center gap-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Conectando...
                    </div>
                ) : (
                    'Recuperar Carteira'
                )}
            </button>
        </form>
    );
};

// Componente para o formulário de Private Key
const PrivateKeyForm = ({ isLoading, error, loginWithPrivateKey }) => {
    const [privateKey, setPrivateKey] = useState('');
    const [showKey, setShowKey] = useState(false);

    const handleSubmit = (e) => {
        e.preventDefault();
        loginWithPrivateKey(privateKey);
    };

    return (
        <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="bg-gradient-to-br from-orange-50 to-amber-50 p-4 rounded-xl border border-orange-100">
                <div className="flex items-center gap-2 mb-3">
                    <KeyIcon className="h-5 w-5 text-orange-600" />
                    <h3 className="text-sm font-semibold text-orange-900">Private Key Access</h3>
                </div>
                <p className="text-xs text-orange-700">
                    Cole sua chave privada para acessar sua carteira
                </p>
            </div>

            <div className="space-y-2">
                <div className="flex justify-between items-center">
                    <label htmlFor="private-key" className="block text-sm font-semibold text-gray-700">
                        Private Key
                    </label>
                    <button
                        type="button"
                        onClick={() => setShowKey(!showKey)}
                        className="text-xs text-gray-500 hover:text-gray-700"
                    >
                        {showKey ? 'Ocultar' : 'Mostrar'}
                    </button>
                </div>
                <div className="relative">
                    <textarea
                        id="private-key"
                        value={privateKey}
                        onChange={(e) => setPrivateKey(e.target.value)}
                        rows={3}
                        required
                        type={showKey ? "text" : "password"}
                        className="block w-full rounded-xl border-0 py-3 px-4 text-gray-900 bg-white shadow-sm ring-1 ring-gray-200 placeholder:text-gray-400 focus:ring-2 focus:ring-orange-500 focus:ring-offset-1 transition-all duration-200 font-mono resize-none"
                        placeholder="Cole sua Private Key aqui (base58 ou hex)..."
                    />
                </div>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="text-sm text-red-700 text-center">{error}</p>
                </div>
            )}

            <button
                type="submit"
                disabled={isLoading || !privateKey.trim()}
                className="w-full bg-gradient-to-r from-orange-500 to-amber-500 text-white py-3 px-4 rounded-xl font-semibold shadow-lg hover:from-orange-600 hover:to-amber-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98]"
            >
                {isLoading ? (
                    <div className="flex items-center justify-center gap-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Conectando...
                    </div>
                ) : (
                    'Acessar com Private Key'
                )}
            </button>
        </form>
    );
};

// Componente Principal
export function LoginPage() {
    const { 
        login, 
        loginWithSeedphrase, 
        loginWithPrivateKey, 
        isAuthenticated, 
        isLoading, 
        error, 
        publicKey 
    } = useAuth();
    
    const navigate = useNavigate();
    const location = useLocation();
    const from = location.state?.from?.pathname || "/";

    const [loginMode, setLoginMode] = useState('standard');
    const [keyType, setKeyType] = useState('seedphrase');

    const handleSubmitStandard = async (event) => {
        event.preventDefault();
        const username = event.target.username.value;
        const password = event.target.password.value;
        if (username && password) {
            const success = await login(username, password);
            if (success) {
                navigate(from, { replace: true });
            }
        }
    };

    const handleSeedphraseLogin = async (seedWords) => {
        const success = await loginWithSeedphrase(seedWords);
        if (success) {
            navigate(from, { replace: true });
        }
    };

    const handlePrivateKeyLogin = async (privateKey) => {
        const success = await loginWithPrivateKey(privateKey);
        if (success) {
            navigate(from, { replace: true });
        }
    };

    // Tela de usuário já autenticado
    if (isAuthenticated && publicKey) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex flex-col justify-center items-center px-6 py-12">
                <div className="sm:mx-auto sm:w-full sm:max-w-md bg-white/80 backdrop-blur-sm p-8 rounded-3xl shadow-2xl border border-white/20 text-center">
                    <div className="w-20 h-20 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                        <CheckCircleIcon className="h-10 w-10 text-white" />
                    </div>
                    <h2 className="text-3xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                        Conectado com Sucesso!
                    </h2>
                    <p className="mt-3 text-gray-600">
                        Sua carteira está conectada e pronta para uso
                    </p>
                    
                    <div className="mt-6 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl border border-green-200">
                        <p className="text-sm font-semibold text-green-800 mb-2">Endereço da Carteira:</p>
                        <div className="text-xs font-mono text-green-900 bg-white/50 p-3 rounded-xl break-all select-all border border-green-200">
                            {publicKey.toBase58()}
                        </div>
                    </div>
                    
                    <div className="mt-8">
                        <button
                            onClick={() => navigate(from, { replace: true })}
                            className="w-full bg-gradient-to-r from-green-500 to-emerald-500 text-white py-3 px-4 rounded-xl font-semibold shadow-lg hover:from-green-600 hover:to-emerald-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98]"
                        >
                            Continuar para o Dashboard
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Conteúdo para login com chaves
    const KeyLoginContent = (
        <div className="w-full space-y-6">
            {/* Abas estilizadas */}
            <div className="flex bg-gray-100 p-1 rounded-2xl">
                <button
                    onClick={() => setKeyType('seedphrase')}
                    className={`flex-1 py-3 px-4 text-sm font-semibold rounded-xl transition-all duration-200 ${
                        keyType === 'seedphrase'
                            ? 'bg-white text-blue-600 shadow-md'
                            : 'text-gray-600 hover:text-gray-800'
                    }`}
                >
                    <div className="flex items-center justify-center gap-2">
                        <SeedIcon className="h-4 w-4" />
                        Seed Phrase
                    </div>
                </button>
                <button
                    onClick={() => setKeyType('privateKey')}
                    className={`flex-1 py-3 px-4 text-sm font-semibold rounded-xl transition-all duration-200 ${
                        keyType === 'privateKey'
                            ? 'bg-white text-orange-600 shadow-md'
                            : 'text-gray-600 hover:text-gray-800'
                    }`}
                >
                    <div className="flex items-center justify-center gap-2">
                        <KeyIcon className="h-4 w-4" />
                        Private Key
                    </div>
                </button>
            </div>

            {/* Conteúdo da aba */}
            <div>
                {keyType === 'seedphrase' ? (
                    <SeedPhraseForm
                        isLoading={isLoading}
                        error={error}
                        loginWithSeedphrase={handleSeedphraseLogin}
                    />
                ) : (
                    <PrivateKeyForm
                        isLoading={isLoading}
                        error={error}
                        loginWithPrivateKey={handlePrivateKeyLogin}
                    />
                )}
            </div>
        </div>
    );

    // Conteúdo para login padrão
    const StandardLoginContent = (
        <form className="space-y-6" onSubmit={handleSubmitStandard}>
            <div className="space-y-4">
                <div>
                    <label htmlFor="username" className="block text-sm font-semibold text-gray-700 mb-2">
                        Nome de Usuário
                    </label>
                    <div className="relative">
                        <UserIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                            id="username"
                            name="username"
                            type="text"
                            autoComplete="username"
                            required
                            className="block w-full rounded-xl border-0 py-3 pl-10 pr-4 text-gray-900 bg-white shadow-sm ring-1 ring-gray-200 placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 transition-all duration-200"
                            placeholder="seu.usuario"
                        />
                    </div>
                </div>

                <div>
                    <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
                        Senha
                    </label>
                    <div className="relative">
                        <LockClosedIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                            id="password"
                            name="password"
                            type="password"
                            autoComplete="current-password"
                            required
                            className="block w-full rounded-xl border-0 py-3 pl-10 pr-4 text-gray-900 bg-white shadow-sm ring-1 ring-gray-200 placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 transition-all duration-200"
                            placeholder="sua senha"
                        />
                    </div>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                    <p className="text-sm text-red-700 text-center">{error}</p>
                </div>
            )}

            <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-blue-500 to-indigo-500 text-white py-3 px-4 rounded-xl font-semibold shadow-lg hover:from-blue-600 hover:to-indigo-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98]"
            >
                {isLoading ? (
                    <div className="flex items-center justify-center gap-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Entrando...
                    </div>
                ) : (
                    'Entrar na Plataforma'
                )}
            </button>
        </form>
    );

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex flex-col justify-center items-center px-4 py-8">
            {/* Header */}
            <div className="text-center mb-8">
                <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                    <WalletIcon className="h-8 w-8 text-white" />
                </div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                    CoffeeTrace
                </h1>
                <p className="text-gray-600 mt-2">Rastreabilidade do Café na Blockchain</p>
            </div>

            {/* Card Principal */}
            <div className="w-full max-w-md">
                <div className="bg-white/80 backdrop-blur-sm p-8 rounded-3xl shadow-2xl border border-white/20">
                    {/* Cabeçalho do Card */}
                    <div className="text-center mb-8">
                        {loginMode === 'standard' ? (
                            <>
                                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center mx-auto mb-4">
                                    <UserIcon className="h-6 w-6 text-white" />
                                </div>
                                <h2 className="text-2xl font-bold text-gray-800">
                                    Acesso à Plataforma
                                </h2>
                                <p className="text-gray-600 mt-2">
                                    Entre com suas credenciais para continuar
                                </p>
                            </>
                        ) : (
                            <>
                                <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-amber-500 rounded-xl flex items-center justify-center mx-auto mb-4">
                                    <KeyIcon className="h-6 w-6 text-white" />
                                </div>
                                <h2 className="text-2xl font-bold text-gray-800">
                                    Recuperar Carteira
                                </h2>
                                <p className="text-gray-600 mt-2">
                                    Acesse com suas chaves de recuperação
                                </p>
                            </>
                        )}
                    </div>

                    {/* Conteúdo do Formulário */}
                    {loginMode === 'standard' ? StandardLoginContent : KeyLoginContent}

                    {/* Alternância entre Modos */}
                    <div className="mt-6 pt-6 border-t border-gray-200">
                        {loginMode === 'standard' ? (
                            <button
                                onClick={() => setLoginMode('key')}
                                className="w-full py-3 px-4 text-gray-600 bg-gray-50 rounded-xl font-medium hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-1 transition-all duration-200 border border-gray-200"
                            >
                                <div className="flex items-center justify-center gap-2">
                                    <KeyIcon className="h-4 w-4" />
                                    Acessar com Chaves Web3
                                </div>
                            </button>
                        ) : (
                            <button
                                onClick={() => setLoginMode('standard')}
                                className="w-full py-3 px-4 text-gray-600 bg-gray-50 rounded-xl font-medium hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-1 transition-all duration-200 border border-gray-200"
                            >
                                <div className="flex items-center justify-center gap-2">
                                    <UserIcon className="h-4 w-4" />
                                    Voltar ao Login Tradicional
                                </div>
                            </button>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="text-center mt-6">
                    <p className="text-sm text-gray-500">
                        Sistema seguro de rastreabilidade blockchain
                    </p>
                </div>
            </div>
        </div>
    );
}

export default LoginPage;