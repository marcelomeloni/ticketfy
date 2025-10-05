import { useMemo } from 'react';
// 1. Importar BrowserRouter para o roteamento funcionar
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets';
import { clusterApiUrl } from '@solana/web3.js';
import { Toaster } from 'react-hot-toast';

// 2. Importar o AuthProvider
import { AuthProvider } from './contexts/AuthContext';

import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { Home } from './pages/Home';
import PaymentSuccess from './pages/PaymentSuccess';
import { Events } from './pages/Events';
import { Marketplace } from './pages/Marketplace';
import { EventDetail } from './pages/EventDetail';
import { MyTickets } from './pages/MyTickets';
import { CreateEvent } from './pages/CreateEvent';
// 3. Importar a página de Login (você precisará criar este arquivo)
import { LoginPage } from './pages/LoginPage';
import { Admin } from './pages/Admin';
import { ValidatorPage } from './pages/ValidatorPage';
import { ManageEvent } from './pages/ManageEvent';
import { CertificatePage } from './pages/CertificatePage';

import '@solana/wallet-adapter-react-ui/styles.css';
import 'leaflet/dist/leaflet.css';

function App() {
  const network = WalletAdapterNetwork.Devnet;
  const endpoint = useMemo(() => clusterApiUrl(network), [network]);
  const wallets = useMemo(
    () => [new PhantomWalletAdapter(), new SolflareWalletAdapter({ network })],
    [network]
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          {/* 4. Envolver a aplicação com o Router e o AuthProvider */}
          <Router>
            <AuthProvider>
              <div className="flex flex-col min-h-screen bg-slate-50">
                <Toaster position="bottom-center" />
                <Navbar />
                <main className="flex-grow w-full">
                  <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/events" element={<Events />} />
                    <Route path="/event/:eventAddress" element={<EventDetail />} />
                    {/* 5. Adicionar a rota para a página de login */}
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/marketplace" element={<Marketplace />} />
                    <Route path="/payment/success" element={<PaymentSuccess />} />
                    {/* Rotas que precisam de autenticação (a lógica de proteção será interna) */}
                    <Route path="/my-tickets" element={<MyTickets />} />
                    <Route path="/create-event" element={<CreateEvent />} />
                    
                    {/* Rotas de Admin */}
                    <Route path="/admin" element={<Admin />} />
                    <Route path="/manage-event/:eventAddress" element={<ManageEvent />} />
                    <Route path="/event/:eventAddress/validate" element={<ValidatorPage />} />
                    <Route path="/certificate/:mintAddress" element={<CertificatePage />} />
                  </Routes>
                </main>
                <Footer />
              </div>
            </AuthProvider>
          </Router>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}

export default App;
