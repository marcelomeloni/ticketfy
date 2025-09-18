import { NavLink } from 'react-router-dom';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useWallet } from '@solana/wallet-adapter-react'; // 1. Importe o hook useWallet

export function Navbar() {
  const { connected } = useWallet(); // 2. Pega o estado de conexão da carteira

  const activeStyle = {
    color: '#4f46e5', // Cor indigo-600
    fontWeight: '600',
  };

  return (
    <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-50">
      <div className="container mx-auto flex justify-between items-center h-20 px-4">
        <NavLink to="/" className="text-2xl font-bold text-slate-900">
          Ticketfy
        </NavLink>

        <nav className="hidden md:flex items-center space-x-8 text-sm font-medium text-slate-600">
     
          <NavLink to="/events" style={({ isActive }) => isActive ? activeStyle : undefined} className="hover:text-slate-900 transition-colors">Eventos</NavLink>
          
          {/* 3. Link condicional para "Meus Ingressos" */}
          {connected && (
            <NavLink to="/my-tickets" style={({ isActive }) => isActive ? activeStyle : undefined} className="hover:text-slate-900 transition-colors">
              Meus Ingressos
            </NavLink>
          )}

          <NavLink to="/marketplace" style={({ isActive }) => isActive ? activeStyle : undefined} className="hover:text-slate-900 transition-colors">Marketplace</NavLink>
          <NavLink to="/create-event" style={({ isActive }) => isActive ? activeStyle : undefined} className="hover:text-slate-900 transition-colors">Criar Evento</NavLink>

        </nav>

        <div className="text-sm">
          <WalletMultiButton />
        </div>
      </div>
    </header>
  );
}