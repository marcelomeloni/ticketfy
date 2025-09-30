import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { LockClosedIcon, CheckCircleIcon, ArrowLeftIcon } from '@heroicons/react/24/solid';

export function LoginPage() {
    // 1. Pegar também o `publicKey` do contexto
    const { login, isAuthenticated, isLoading, error, publicKey } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const from = location.state?.from?.pathname || "/";

    const handleSubmit = async (event) => {
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

    // 2. Se o usuário já está autenticado, mostrar uma tela de confirmação em vez do formulário
    if (isAuthenticated && publicKey) {
        return (
            <div className="flex min-h-full flex-col justify-center items-center px-6 py-12 lg:px-8 bg-slate-50">
                <div className="sm:mx-auto sm:w-full sm:max-w-md bg-white p-8 rounded-2xl shadow-lg border border-slate-200 text-center">
                    <CheckCircleIcon className="mx-auto h-12 w-12 text-green-500" />
                    <h2 className="mt-6 text-center text-2xl font-bold leading-9 tracking-tight text-gray-900">
                        Você já está conectado
                    </h2>
                    <p className="mt-4 text-sm text-gray-500">
                        Sua carteira conectada é:
                    </p>
                    <div className="mt-2 text-xs font-mono text-gray-600 bg-slate-100 p-3 rounded-md break-all">
                        {publicKey.toBase58()}
                    </div>
                    <div className="mt-8">
                        <button
                            onClick={() => navigate(from, { replace: true })}
                            className="flex w-full items-center justify-center gap-2 rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                        >
                            <ArrowLeftIcon className="h-4 w-4" />
                            Voltar para a página anterior
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    // 3. Se não estiver autenticado, mostrar o formulário de login padrão
    return (
        <div className="flex min-h-full flex-col justify-center items-center px-6 py-12 lg:px-8 bg-slate-50">
            <div className="sm:mx-auto sm:w-full sm:max-w-sm">
                <LockClosedIcon className="mx-auto h-10 w-auto text-indigo-600" />
                <h2 className="mt-6 text-center text-2xl font-bold leading-9 tracking-tight text-gray-900">
                    Acesse sua Carteira
                </h2>
                <p className="mt-2 text-center text-sm text-gray-500">
                    Entre com seu usuário e senha para continuar.
                </p>
            </div>

            <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-sm">
                <form className="space-y-6" onSubmit={handleSubmit}>
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
                                className="block w-full rounded-md border-0 py-1.5 px-2 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
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
                                className="block w-full rounded-md border-0 py-1.5 px-2 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                            />
                        </div>
                    </div>
                    
                    {error && <p className="text-sm text-red-600 text-center">{error}</p>}

                    <div>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="flex w-full justify-center rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading ? 'Entrando...' : 'Entrar'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

