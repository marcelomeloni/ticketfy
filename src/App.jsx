// Em: src/App.jsx

import { useMemo } from 'react';
import { Routes, Route } from 'react-router-dom';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets';
import { clusterApiUrl } from '@solana/web3.js';
import { Toaster } from 'react-hot-toast';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { Home } from './pages/Home';
import { Events } from './pages/Events';
import { Admin } from './pages/Admin';
import { CreateEvent } from './pages/CreateEvent';
import { ValidatorPage } from './pages/ValidatorPage';
import { ManageEvent } from './pages/ManageEvent';
import { EventDetail } from './pages/EventDetail';
import { MyTickets } from './pages/MyTickets';
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
          {/* Este layout garante que o footer fique sempre no final da página */}
          <div className="flex flex-col min-h-screen">
          <Toaster position="bottom-center" />
            <Navbar />
            <main className="flex-grow w-full">
              {/* O padding agora é aplicado por página para maior controle */}
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/events" element={<Events />} />
                <Route path="/admin" element={<Admin />} />
                <Route path="/event/:eventAddress/validate" element={<ValidatorPage />} />
                <Route path="/certificate/:mintAddress" element={<CertificatePage />} />
                <Route path="/event/:eventAddress" element={<EventDetail />} />
                <Route path="/my-tickets" element={<MyTickets />} />
                <Route path="/manage-event/:eventAddress" element={<ManageEvent />} />
                <Route path="/create-event" element={<CreateEvent />} /> 
              </Routes>
            </main>
            <Footer />
          </div>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}

export default App;