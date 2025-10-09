import React, { useState, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  LockClosedIcon, 
  CheckCircleIcon, 
  ArrowLeftIcon 
} from '@heroicons/react/24/solid';
import { useAuth } from '@/contexts/AuthContext';


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
      const focusIndex = words.length < 12 ? words.length : 11;
      const nextInput = event.target.closest('form').querySelector(`#word-${focusIndex}`);
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
    } else {
      console.error('Por favor, preencha todas as 12 palavras da Seedphrase.');
    }
  };

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <div className="grid grid-cols-3 gap-3 md:grid-cols-4 md:gap-4">
        {seedWords.map((word, index) => (
          <div key={index} className="relative">
            <span className="absolute left-2 top-0 text-xs text-gray-400">
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
              className="block w-full rounded-lg border-0 pt-5 pb-1.5 px-2 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 text-center"
            />
          </div>
        ))}
      </div>
      {error && <p className="text-sm text-red-600 text-center">{error}</p>}
      <button
        type="submit"
        disabled={isLoading}
        className="flex w-full justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition duration-150"
      >
        {isLoading ? 'Conectando com Seedphrase...' : 'Conectar com Seedphrase'}
      </button>
    </form>
  );
};


const PrivateKeyForm = ({ isLoading, error, loginWithPrivateKey }) => {
  const [privateKey, setPrivateKey] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    loginWithPrivateKey(privateKey);
  };

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <div>
        <label htmlFor="private-key" className="block text-sm font-medium leading-6 text-gray-900">
          Sua Private Key (Base58)
        </label>
        <div className="mt-2">
          <textarea
            id="private-key"
            value={privateKey}
            onChange={(e) => setPrivateKey(e.target.value)}
            rows={3}
            required
            className="block w-full rounded-md border-0 py-1.5 px-2 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 font-mono resize-none"
            placeholder="Cole sua Private Key aqui..."
          />
        </div>
      </div>
      {error && <p className="text-sm text-red-600 text-center">{error}</p>}
      <button
        type="submit"
        disabled={isLoading}
        className="flex w-full justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition duration-150"
      >
        {isLoading ? 'Conectando com Private Key...' : 'Conectar com Private Key'}
      </button>
    </form>
  );
};


export function LoginPage() {
  const { 
    login, 
    isAuthenticated, 
    isLoading, 
    error, 
    publicKey, 
    loginWithSeedphrase, 
    loginWithPrivateKey,
    setError,
  } = useAuth();
  
  const navigate = useNavigate();
  const location = useLocation();

  const [loginMode, setLoginMode] = useState('standard');
  const [keyType, setKeyType] = useState('seedphrase');

  const from = location.state?.from?.pathname || '/';

  const handleSubmitStandard = async (event) => {
    event.preventDefault();
    const formData = new FormData(event.target);
    const username = formData.get('username');
    const password = formData.get('password');
    
    if (username && password) {
      const success = await login(username, password);
      if (success) {
        navigate(from, { replace: true });
      }
    }
  };

  const toggleLoginMode = (mode) => {
    setLoginMode(mode);
    if (setError) {
      setError(null);
    }
  };

  // Se o usuário já está autenticado
  if (isAuthenticated && publicKey) {
    return (
      <div className="flex min-h-screen flex-col justify-center items-center px-6 py-12 lg:px-8 bg-slate-50">
        <div className="sm:mx-auto sm:w-full sm:max-w-md bg-white p-8 rounded-2xl shadow-xl border border-slate-200 text-center">
          <CheckCircleIcon className="mx-auto h-12 w-12 text-green-500" />
          <h2 className="mt-6 text-center text-2xl font-bold leading-9 tracking-tight text-gray-900">
            Você já está conectado
          </h2>
          <p className="mt-4 text-sm text-gray-500">
            Sua carteira conectada é:
          </p>
          <div className="mt-2 text-xs font-mono text-gray-600 bg-slate-100 p-3 rounded-xl break-all select-all">
            {publicKey.toBase58()}
          </div>
          <div className="mt-8">
            <button
              onClick={() => navigate(from, { replace: true })}
              className="flex w-full items-center justify-center gap-2 rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 transition duration-150"
            >
              <ArrowLeftIcon className="h-4 w-4" />
              Voltar para a página anterior
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Conteúdo para recuperação de chave
  const KeyLoginContent = (
    <div className="w-full">
      <div className="flex border-b border-gray-200">
        <button
          type="button"
          onClick={() => setKeyType('seedphrase')}
          className={`flex-1 py-3 text-sm font-medium transition duration-200 ${
            keyType === 'seedphrase'
              ? 'border-b-2 border-indigo-600 text-indigo-600 bg-indigo-50/50'
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
          } rounded-t-lg`}
        >
          Seedphrase (12 Palavras)
        </button>
        <button
          type="button"
          onClick={() => setKeyType('privateKey')}
          className={`flex-1 py-3 text-sm font-medium transition duration-200 ${
            keyType === 'privateKey'
              ? 'border-b-2 border-indigo-600 text-indigo-600 bg-indigo-50/50'
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
          } rounded-t-lg`}
        >
          Private Key
        </button>
      </div>

      <div className="pt-6">
        {keyType === 'seedphrase' ? (
          <SeedPhraseForm
            isLoading={isLoading}
            error={error}
            loginWithSeedphrase={loginWithSeedphrase}
          />
        ) : (
          <PrivateKeyForm
            isLoading={isLoading}
            error={error}
            loginWithPrivateKey={loginWithPrivateKey}
          />
        )}
      </div>
    </div>
  );

  // Conteúdo do login padrão
  const StandardLoginContent = (
    <form className="space-y-6" onSubmit={handleSubmitStandard}>
      <div>
        <label htmlFor="username" className="block text-sm font-medium leading-6 text-gray-900">
          Nome de Usuário
        </label>
        <div className="mt-2">
          <input
            id="username"
            name="username"
            type="text"
            autoComplete="username"
            required
            className="block w-full rounded-md border-0 py-2 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 transition duration-150"
          />
        </div>
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium leading-6 text-gray-900">
          Senha
        </label>
        <div className="mt-2">
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className="block w-full rounded-md border-0 py-2 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 transition duration-150"
          />
        </div>
      </div>

      {error && <p className="text-sm text-red-600 text-center">{error}</p>}

      <div>
        <button
          type="submit"
          disabled={isLoading}
          className="flex w-full justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold leading-6 text-white shadow-md hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition duration-150"
        >
          {isLoading ? 'Entrando...' : 'Entrar com Usuário e Senha'}
        </button>
      </div>
    </form>
  );

  return (
    <div className="flex min-h-screen flex-col justify-center items-center px-6 py-12 lg:px-8 bg-slate-50">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {loginMode === 'standard' ? (
          <>
            <LockClosedIcon className="mx-auto h-10 w-auto text-indigo-600" />
            <h2 className="mt-6 text-center text-3xl font-extrabold leading-9 tracking-tight text-gray-900">
              Acesse sua Carteira
            </h2>
            <p className="mt-2 text-center text-sm text-gray-500">
              Entre com seu usuário e senha para continuar.
            </p>
          </>
        ) : (
          <>
            <ArrowLeftIcon
              className="h-6 w-6 text-gray-500 hover:text-indigo-600 cursor-pointer transition duration-150"
              onClick={() => toggleLoginMode('standard')}
              title="Voltar ao login padrão"
            />
            <h2 className="mt-6 text-center text-3xl font-extrabold leading-9 tracking-tight text-gray-900">
              Recuperação de Carteira
            </h2>
            <p className="mt-2 text-center text-sm text-gray-500">
              Use sua <strong>Seedphrase</strong> ou <strong>Private Key</strong> para acessar.
            </p>
          </>
        )}
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md bg-white p-8 rounded-2xl shadow-xl w-full border border-slate-200">
        {loginMode === 'standard' ? (
          <>
            {StandardLoginContent}
            
            <div className="mt-6 border-t border-gray-200 pt-6">
              <button
                type="button"
                onClick={() => toggleLoginMode('key')}
                className="flex w-full justify-center rounded-md border border-indigo-600 bg-white px-3 py-2 text-sm font-semibold leading-6 text-indigo-600 shadow-sm hover:bg-indigo-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 transition duration-150"
              >
                Entrar com Private Key ou Seedphrase
              </button>
            </div>
          </>
        ) : (
          KeyLoginContent
        )}
      </div>
    </div>
  );
}

export default LoginPage;