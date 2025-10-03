import { useState, useEffect } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { 
    Bars3Icon, 
    XMarkIcon, 
    ArrowRightOnRectangleIcon, 
    ArrowLeftOnRectangleIcon,
} from '@heroicons/react/24/outline';

import { useAppWallet } from '@/hooks/useAppWallet';

/**
 * Componente que decide qual botão de conexão/conta mostrar.
 */
const ConnectionDisplay = () => {
    const { connected, disconnect, publicKey, walletType } = useAppWallet();

    // Estado 1: Usuário logado com a carteira local (username/senha)
    if (walletType === 'local' && connected && publicKey) {
        return (
            <div className="flex items-center gap-3">
                <div className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200">
                    <span className="text-sm font-medium text-blue-800">
                        {publicKey.toBase58().slice(0, 4)}...{publicKey.toBase58().slice(-4)}
                    </span>
                </div>
                <button
                    onClick={disconnect}
                    className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition-all hover:shadow-blue-600/25 hover:scale-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600"
                >
                    <ArrowRightOnRectangleIcon className="h-4 w-4" />
                    <span className="hidden sm:inline">Sair</span>
                </button>
            </div>
        );
    }

    // Estado 2: Usuário está desconectado
    if (!connected) {
        return (
            <div className="flex items-center gap-3">
                <Link
                    to="/login"
                    className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-slate-100 to-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-800 shadow-sm ring-1 ring-slate-300 transition-all hover:shadow-md hover:scale-105"
                >
                    <ArrowLeftOnRectangleIcon className="h-4 w-4" />
                    <span className="hidden sm:inline">Entrar</span>
                </Link>
                <div className="wallet-connect-wrapper">
                    <WalletMultiButton />
                </div>
            </div>
        );
    }

    // Estado 3: Usuário conectado com carteira externa
    return (
        <div className="wallet-connect-wrapper">
            <WalletMultiButton />
        </div>
    );
};

// Componente de partículas animadas para o background
const AnimatedBackground = () => (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-4 -right-4 w-8 h-8 bg-blue-400 rounded-full opacity-20 animate-pulse"></div>
        <div className="absolute top-12 -left-4 w-6 h-6 bg-indigo-400 rounded-full opacity-30 animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute bottom-8 right-20 w-4 h-4 bg-purple-400 rounded-full opacity-40 animate-pulse" style={{ animationDelay: '2s' }}></div>
    </div>
);

export function Navbar() {
    const { connected } = useAppWallet();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isScrolled, setIsScrolled] = useState(false);
    const location = useLocation();

    // Efeito de scroll para navbar
    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 10);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const activeStyle = {
        background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
        color: 'white',
        boxShadow: '0 4px 15px 0 rgba(79, 70, 229, 0.3)'
    };

    const closeMobileMenu = () => setIsMenuOpen(false);

    // Fechar menu quando a rota mudar
    useEffect(() => {
        closeMobileMenu();
    }, [location]);

   
    const navItems = [
        { to: "/events", label: "Eventos" },
    ];

    if (connected) {
        navItems.push({ to: "/my-tickets", label: "Meus Ingressos" });
    }
    navItems.push({ to: "/marketplace", label: "Marketplace" });
    navItems.push({ to: "/create-event", label: "Criar Evento" });

    return (
        <header className={`sticky top-0 z-50 transition-all duration-300 ${
            isScrolled 
                ? 'bg-white/95 backdrop-blur-xl shadow-2xl shadow-blue-500/5 border-b border-slate-200/80' 
                : 'bg-white/80 backdrop-blur-lg border-b border-slate-200/60'
        }`}>
            <AnimatedBackground />
            
            <div className="relative container mx-auto flex justify-between items-center h-20 px-4 lg:px-8">
                <NavLink 
                    to="/" 
                    className="flex items-center gap-3 group"
                    onClick={closeMobileMenu}
                >
                    <img 
                        src="/logo.png" 
                        alt="Ticketfy Logo" 
                        className="w-10 h-10 transition-all duration-300 group-hover:scale-105 group-hover:drop-shadow-lg" 
                    />
                    <div className="flex flex-col">
                        <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                            Ticketfy
                        </span>
                        <span className="text-xs text-slate-500 font-medium">WEB3 TICKETS</span>
                    </div>
                </NavLink>

                {/* Navegação Desktop */}
                <nav className="hidden lg:flex items-center space-x-1">
                    {/* ✅ ALTERAÇÃO: Mapeia a lista de navegação dinâmica */}
                    {navItems.map((item) => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            style={({ isActive }) => (isActive ? activeStyle : undefined)}
                            className="relative px-6 py-3 text-sm font-semibold text-slate-700 rounded-2xl transition-all duration-300 hover:bg-slate-100 hover:scale-105 hover:shadow-lg mx-1"
                        >
                            {item.label}
                            {({ isActive }) => isActive && (
                                <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full"></div>
                            )}
                        </NavLink>
                    ))}
                </nav>

                {/* Botões de Conexão Desktop */}
                <div className="hidden lg:flex items-center">
                    <ConnectionDisplay />
                </div>

                {/* Menu Mobile */}
                <div className="lg:hidden">
                    <button 
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                        className="p-2 rounded-2xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition-all duration-300 hover:scale-105"
                    >
                        {isMenuOpen ? <XMarkIcon className="h-6 w-6" /> : <Bars3Icon className="h-6 w-6" />}
                    </button>
                </div>
            </div>

            {/* Menu Mobile Expandido */}
            {isMenuOpen && (
                <div className="lg:hidden bg-white/95 backdrop-blur-xl border-t border-slate-200/80 shadow-2xl">
                    <nav className="flex flex-col items-center space-y-2 py-6 px-4">
                        {/* ✅ ALTERAÇÃO: Mapeia a lista de navegação dinâmica */}
                        {navItems.map((item) => (
                            <NavLink
                                key={item.to}
                                to={item.to}
                                onClick={closeMobileMenu}
                                style={({ isActive }) => (isActive ? activeStyle : undefined)}
                                className="w-full max-w-xs text-center px-6 py-4 text-base font-semibold text-slate-700 rounded-2xl transition-all duration-300 hover:bg-slate-100 hover:scale-105"
                            >
                                {item.label}
                            </NavLink>
                        ))}

                        <div className="pt-4 w-full max-w-xs">
                            <ConnectionDisplay />
                        </div>
                    </nav>
                </div>
            )}

            {/* CSS customizado para os botões de wallet */}
            <style>{`
                .wallet-connect-wrapper :global(.wallet-adapter-button) {
                    background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%) !important;
                    border-radius: 12px !important;
                    padding: 12px 20px !important;
                    font-weight: 600 !important;
                    font-size: 14px !important;
                    box-shadow: 0 4px 15px 0 rgba(79, 70, 229, 0.3) !important;
                    transition: all 0.3s ease !important;
                    border: none !important;
                }
                
                .wallet-connect-wrapper :global(.wallet-adapter-button:hover) {
                    transform: translateY(-2px) !important;
                    box-shadow: 0 8px 25px 0 rgba(79, 70, 229, 0.4) !important;
                }
                
                .wallet-connect-wrapper :global(.wallet-adapter-button:not([disabled]):hover) {
                    background: linear-gradient(135deg, #4338ca 0%, #6d28d9 100%) !important;
                }
            `}</style>
        </header>
    );
}

