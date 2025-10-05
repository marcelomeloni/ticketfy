// src/hooks/useAppWallet.js
import { useMemo } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useAuth } from '@/contexts/AuthContext';
import { PublicKey } from '@solana/web3.js';

export const useAppWallet = () => {
    const walletAdapter = useWallet();
    const auth = useAuth();

    const appWallet = useMemo(() => {
        // Prioridade 1: Carteira externa (Phantom, Solflare, etc.)
        if (walletAdapter.connected && walletAdapter.publicKey) {
            return {
                ...walletAdapter,
                walletType: 'adapter',
                // Garantir que todas as funções necessárias existam
                signTransaction: walletAdapter.signTransaction || (async (tx) => tx),
                signAllTransactions: walletAdapter.signAllTransactions || (async (txs) => txs),
            };
        }

        // Prioridade 2: Usuário autenticado via sistema local
        if (auth.isAuthenticated && auth.publicKey) {
            return {
                connected: true,
                connecting: false,
                disconnecting: false,
                publicKey: auth.publicKey,
                walletType: 'local',
                disconnect: auth.logout,
                signTransaction: auth.signTransaction,
                signAllTransactions: async (transactions) => {
                    return transactions.map(tx => {
                        tx.partialSign(auth.keypair);
                        return tx;
                    });
                },
                // Stubs para compatibilidade
                connect: async () => console.warn("Connect not applicable for local wallet"),
                sendTransaction: async (transaction, connection, options) => {
                    if (!auth.signAndSendTransaction) {
                        throw new Error("signAndSendTransaction not available");
                    }
                    return auth.signAndSendTransaction(transaction, connection);
                },
                wallet: null,
            };
        }

        // Caso padrão: Nenhuma carteira conectada
        return {
            ...walletAdapter,
            connected: false,
            publicKey: null,
            walletType: 'none',
        };
    }, [walletAdapter, auth]);

    return appWallet;
};
