import { useState } from 'react'; // 1. Importe o useState
import { NavLink } from 'react-router-dom';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useWallet } from '@solana/wallet-adapter-react';
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline'; // 2. Importe ícones

export function Navbar() {
  const { connected } = useWallet();
  const [isMenuOpen, setIsMenuOpen] = useState(false); // 3. Estado para controlar o menu mobile

  const activeStyle = {
    color: '#4f46e5', // Cor indigo-600
    fontWeight: '600',
  };

  // Função para fechar o menu ao clicar em um link
  const closeMobileMenu = () => setIsMenuOpen(false);

  return (
    <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-50">
      <div className="container mx-auto flex justify-between items-center h-20 px-4">
        {/* Logo */}
        <NavLink to="/" className="text-2xl font-bold text-slate-900" onClick={closeMobileMenu}>
          Ticketfy
        </NavLink>

        {/* Links de Navegação para Desktop */}
        <nav className="hidden md:flex items-center space-x-8 text-sm font-medium text-slate-600">
          <NavLink to="/events" style={({ isActive }) => (isActive ? activeStyle : undefined)} className="hover:text-slate-900 transition-colors">Eventos</NavLink>
          {connected && (
            <NavLink to="/my-tickets" style={({ isActive }) => (isActive ? activeStyle : undefined)} className="hover:text-slate-900 transition-colors">
              Meus Ingressos
            </NavLink>
          )}
          <NavLink to="/create-event" style={({ isActive }) => (isActive ? activeStyle : undefined)} className="hover:text-slate-900 transition-colors">Criar Evento</NavLink>
        </nav>

        {/* Botão da Carteira (visível em desktop) */}
        <div className="hidden md:block text-sm">
          <WalletMultiButton />
        </div>
        
        {/* Botão Hambúrguer para Mobile */}
        <div className="md:hidden">
          <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="text-slate-900">
            {isMenuOpen ? (
              <XMarkIcon className="h-7 w-7" />
            ) : (
              <Bars3Icon className="h-7 w-7" />
            )}
          </button>
        </div>
      </div>

      {/* Menu Mobile */}
      {isMenuOpen && (
        <div className="md:hidden bg-white border-t border-slate-200">
          <nav className="flex flex-col items-center space-y-6 text-base font-medium text-slate-600 py-8">
            <NavLink to="/events" onClick={closeMobileMenu} style={({ isActive }) => (isActive ? activeStyle : undefined)}>Eventos</NavLink>
            {connected && (
              <NavLink to="/my-tickets" onClick={closeMobileMenu} style={({ isActive }) => (isActive ? activeStyle : undefined)}>Meus Ingressos</NavLink>
            )}
            <NavLink to="/marketplace" onClick={closeMobileMenu} style={({ isActive }) => (isActive ? activeStyle : undefined)}>Marketplace</NavLink>
            <NavLink to="/create-event" onClick={closeMobileMenu} style={({ isActive }) => (isActive ? activeStyle : undefined)}>Criar Evento</NavLink>
            
            {/* Botão da Carteira dentro do menu mobile */}
            <div className="pt-4">
              <WalletMultiButton />
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}