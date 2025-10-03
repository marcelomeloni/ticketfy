import React, { useState, useCallback, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  LockClosedIcon, 
  CheckCircleIcon, 
  ArrowLeftIcon,
  KeyIcon,
  DocumentTextIcon,
  UserCircleIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '@/contexts/AuthContext';

// Componente de Input com animação
const FloatingInput = ({ id, label, type = 'text', value, onChange, required = true, autoComplete }) => {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <div className="relative mt-2">
      <label
        htmlFor={id}
        className={`absolute left-3 transition-all duration-200 ${
          isFocused || value
            ? 'top-1 text-xs text-indigo-600 bg-white px-1 -mt-1'
            : 'top-3 text-sm text-gray-500'
        } pointer-events-none`}
      >
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={onChange}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        autoComplete={autoComplete}
        required={required}
        className="block w-full rounded-xl border-0 py-4 px-4 text-gray-900 shadow-sm ring-1 ring-gray-300 placeholder:text-transparent focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2 sm:text-sm transition-all duration-200"
      />
    </div>
  );
};

// Componente de Card para métodos de login
const LoginMethodCard = ({ icon: Icon, title, description, onClick, isActive }) => (
  <div
    onClick={onClick}
    className={`p-6 rounded-2xl border-2 cursor-pointer transition-all duration-300 transform hover:scale-[1.02] ${
      isActive
        ? 'border-indigo-500 bg-indigo-50 shadow-lg'
        : 'border-gray-200 bg-white hover:border-indigo-300 hover:shadow-md'
    }`}
  >
    <div className="flex items-center gap-4">
      <div className={`p-3 rounded-xl ${
        isActive ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-600'
      }`}>
        <Icon className="w-6 h-6" />
      </div>
      <div className="flex-1">
        <h3 className="font-semibold text-gray-900">{title}</h3>
        <p className="text-sm text-gray-600 mt-1">{description}</p>
      </div>
    </div>
  </div>
);

// Componente SeedPhrase com melhor UX
const SeedPhraseForm = ({ isLoading, error, loginWithSeedphrase }) => {
  const [seedWords, setSeedWords] = useState(Array(12).fill(''));
  const [showPasteSuccess, setShowPasteSuccess] = useState(false);

  const handlePaste = useCallback((event) => {
    event.preventDefault();
    const pastedText = event.clipboardData.getData('text');
    const words = pastedText.trim().split(/\s+/).slice(0, 12);

    setSeedWords(prevWords => {
      const newWords = [...prevWords];
      words.forEach((word, index) => {
        if (index < 12) {
          newWords[index] = word.toLowerCase();
        }
      });
      return newWords;
    });

    setShowPasteSuccess(true);
    setTimeout(() => setShowPasteSuccess(false), 2000);

    // Foca no próximo campo disponível
    setTimeout(() => {
      const focusIndex = Math.min(words.length, 11);
      const nextInput = document.getElementById(`word-${focusIndex}`);
      if (nextInput) nextInput.focus();
    }, 100);
  }, []);

  const handleChange = useCallback((index, value) => {
    setSeedWords(prevWords => {
      const newWords = [...prevWords];
      newWords[index] = value.toLowerCase().replace(/[^a-z]/g, '');
      
      // Auto-avançar se palavra completa
      if (value.includes(' ') && index < 11) {
        const nextInput = document.getElementById(`word-${index + 1}`);
        if (nextInput) nextInput.focus();
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
    <div className="space-y-6">
      <div className="text-center">
        <DocumentTextIcon className="mx-auto h-12 w-12 text-indigo-600 mb-3" />
        <h3 className="text-lg font-semibold text-gray-900">Recuperar com Seedphrase</h3>
        <p className="text-sm text-gray-600 mt-1">
          Digite suas 12 palavras de recuperação na ordem correta
        </p>
      </div>

      {showPasteSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-center">
          <p className="text-sm text-green-800">Seedphrase colada com sucesso!</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          {seedWords.map((word, index) => (
            <div key={index} className="relative">
              <span className="absolute -top-2 left-2 text-xs text-gray-400 bg-white px-1">
                {index + 1}
              </span>
              <input
                id={`word-${index}`}
                type="text"
                value={word}
                onChange={(e) => handleChange(index, e.target.value)}
                onPaste={index === 0 ? handlePaste : undefined}
                placeholder="..."
                required
                className="block w-full rounded-lg border-0 py-3 px-2 text-center text-gray-900 shadow-sm ring-1 ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-indigo-600 sm:text-sm transition-colors"
              />
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className={`${allFieldsFilled ? 'text-green-600' : 'text-gray-500'}`}>
            {allFieldsFilled ? '✓ Todas as palavras preenchidas' : 'Preencha todas as 12 palavras'}
          </span>
          <button
            type="button"
            onClick={() => setSeedWords(Array(12).fill(''))}
            className="text-indigo-600 hover:text-indigo-500 font-medium"
          >
            Limpar
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <p className="text-sm text-red-800 text-center">{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading || !allFieldsFilled}
          className="w-full flex justify-center items-center gap-2 py-3 px-4 rounded-xl bg-indigo-600 text-white font-semibold shadow-sm hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
        >
          {isLoading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Conectando...
            </>
          ) : (
            'Acessar Carteira'
          )}
        </button>
      </form>
    </div>
  );
};

// Componente Private Key melhorado
const PrivateKeyForm = ({ isLoading, error, loginWithPrivateKey }) => {
  const [privateKey, setPrivateKey] = useState('');
  const [showKey, setShowKey] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    loginWithPrivateKey(privateKey);
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <KeyIcon className="mx-auto h-12 w-12 text-indigo-600 mb-3" />
        <h3 className="text-lg font-semibold text-gray-900">Recuperar com Private Key</h3>
        <p className="text-sm text-gray-600 mt-1">
          Cole sua chave privada no formato Base58
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="relative">
          <textarea
            value={privateKey}
            onChange={(e) => setPrivateKey(e.target.value)}
            rows={4}
            required
            className="block w-full rounded-xl border-0 py-3 px-4 text-gray-900 shadow-sm ring-1 ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2 sm:text-sm font-mono resize-none transition-colors"
            placeholder="Cole sua Private Key aqui..."
          />
          <button
            type="button"
            onClick={() => setShowKey(!showKey)}
            className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
          >
            {showKey ? '👁️' : '👁️‍🗨️'}
          </button>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
          <p className="text-sm text-yellow-800 text-center">
            ⚠️ Mantenha sua private key segura. Ela dá acesso completo à sua carteira.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <p className="text-sm text-red-800 text-center">{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading || !privateKey.trim()}
          className="w-full flex justify-center items-center gap-2 py-3 px-4 rounded-xl bg-indigo-600 text-white font-semibold shadow-sm hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
        >
          {isLoading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Conectando...
            </>
          ) : (
            'Acessar Carteira'
          )}
        </button>
      </form>
    </div>
  );
};

// Componente principal LoginPage
export function LoginPage() {
  const { 
    login, 
    isAuthenticated, 
    isLoading, 
    error, 
    publicKey, 
    loginWithSeedphrase, 
    loginWithPrivateKey,
    setError 
  } = useAuth();
  
  const navigate = useNavigate();
  const location = useLocation();

  const [loginMode, setLoginMode] = useState('method-select'); // 'method-select' | 'standard' | 'seedphrase' | 'privateKey'
  const [formData, setFormData] = useState({ username: '', password: '' });

  const from = location.state?.from?.pathname || "/";

  // Limpa erro quando muda o modo
  useEffect(() => {
    setError(null);
  }, [loginMode, setError]);

  const handleStandardLogin = async (e) => {
    e.preventDefault();
    const success = await login(formData.username, formData.password);
    if (success) {
      navigate(from, { replace: true });
    }
  };

  const handleKeyLogin = async (loginFn, ...args) => {
    const success = await loginFn(...args);
    if (success) {
      navigate(from, { replace: true });
    }
  };

  // Tela de usuário já autenticado
  if (isAuthenticated && publicKey) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-white flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-gray-100 p-8 text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircleIcon className="w-10 h-10 text-green-600" />
          </div>
          
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Conectado com Sucesso!</h1>
          <p className="text-gray-600 mb-6">Sua carteira está pronta para uso</p>
          
          <div className="bg-gray-50 rounded-2xl p-4 mb-6">
            <p className="text-sm text-gray-500 mb-2">Sua carteira:</p>
            <p className="text-sm font-mono text-gray-900 break-all">
              {publicKey.toBase58()}
            </p>
          </div>

          <button
            onClick={() => navigate(from, { replace: true })}
            className="w-full py-3 px-4 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-500 transition-colors duration-200 shadow-sm"
          >
            Continuar para o App
          </button>
        </div>
      </div>
    );
  }

  // Tela de seleção de método
  if (loginMode === 'method-select') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-white flex items-center justify-center p-4">
        <div className="max-w-2xl w-full">
          <div className="text-center mb-12">
            <div className="w-20 h-20 bg-indigo-100 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <ShieldCheckIcon className="w-10 h-10 text-indigo-600" />
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Acesse sua Carteira
            </h1>
            <p className="text-xl text-gray-600 max-w-md mx-auto">
              Escolha como deseja acessar sua conta
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto">
            <LoginMethodCard
              icon={UserCircleIcon}
              title="Login Tradicional"
              description="Use seu nome de usuário e senha"
              onClick={() => setLoginMode('standard')}
              isActive={false}
            />
            
            <LoginMethodCard
              icon={DocumentTextIcon}
              title="Recuperar com Seedphrase"
              description="Use suas 12 palavras de recuperação"
              onClick={() => setLoginMode('seedphrase')}
              isActive={false}
            />
            
            <LoginMethodCard
              icon={KeyIcon}
              title="Recuperar com Private Key"
              description="Use sua chave privada direta"
              onClick={() => setLoginMode('privateKey')}
              isActive={false}
            />
            
            <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-6">
              <div className="flex items-start gap-4">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <LockClosedIcon className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-blue-900 mb-1">Primeiro Acesso?</h3>
                  <p className="text-sm text-blue-700">
                    Se você fez cadastro recentemente, use o login tradicional com usuário e senha.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Telas de login específicas
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-white flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white">
          <button
            onClick={() => setLoginMode('method-select')}
            className="flex items-center gap-2 text-white/80 hover:text-white transition-colors mb-4"
          >
            <ArrowLeftIcon className="w-5 h-5" />
            Voltar
          </button>
          
          {loginMode === 'standard' && (
            <>
              <UserCircleIcon className="w-12 h-12 mb-3" />
              <h1 className="text-2xl font-bold">Login Tradicional</h1>
              <p className="text-indigo-100 mt-1">Entre com suas credenciais</p>
            </>
          )}
          
          {loginMode === 'seedphrase' && (
            <>
              <DocumentTextIcon className="w-12 h-12 mb-3" />
              <h1 className="text-2xl font-bold">Seedphrase</h1>
              <p className="text-indigo-100 mt-1">Recupere com 12 palavras</p>
            </>
          )}
          
          {loginMode === 'privateKey' && (
            <>
              <KeyIcon className="w-12 h-12 mb-3" />
              <h1 className="text-2xl font-bold">Private Key</h1>
              <p className="text-indigo-100 mt-1">Acesso direto à carteira</p>
            </>
          )}
        </div>

        {/* Content */}
        <div className="p-8">
          {loginMode === 'standard' && (
            <form onSubmit={handleStandardLogin} className="space-y-6">
              <div className="space-y-4">
                <FloatingInput
                  id="username"
                  label="Nome de Usuário"
                  value={formData.username}
                  onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                  autoComplete="username"
                />
                <FloatingInput
                  id="password"
                  label="Senha"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  autoComplete="current-password"
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                  <p className="text-sm text-red-800 text-center">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading || !formData.username || !formData.password}
                className="w-full flex justify-center items-center gap-2 py-4 px-4 rounded-xl bg-indigo-600 text-white font-semibold shadow-sm hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                {isLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Entrando...
                  </>
                ) : (
                  'Entrar na Carteira'
                )}
              </button>
            </form>
          )}

          {loginMode === 'seedphrase' && (
            <SeedPhraseForm
              isLoading={isLoading}
              error={error}
              loginWithSeedphrase={(words) => handleKeyLogin(loginWithSeedphrase, words)}
            />
          )}

          {loginMode === 'privateKey' && (
            <PrivateKeyForm
              isLoading={isLoading}
              error={error}
              loginWithPrivateKey={(key) => handleKeyLogin(loginWithPrivateKey, key)}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
