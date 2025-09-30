// src/hooks/useAppWallet.js
import { useMemo } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useAuth } from '@/contexts/AuthContext';
import { PublicKey } from '@solana/web3.js'; // Importar PublicKey para tipagem

/**
 * @typedef {'adapter' | 'local' | 'none'} WalletType
 */

/**
 * @typedef {object} AppWallet
 * @property {boolean} connected
 * @property {boolean} connecting
 * @property {boolean} disconnecting
 * @property {PublicKey | null} publicKey
 * @property {() => Promise<void>} disconnect
 * @property {(transaction: Transaction) => Promise<Transaction>} signTransaction
 * @property {(transactions: Transaction[]) => Promise<Transaction[]>} signAllTransactions
 * @property {WalletType} walletType - Indica a origem da carteira ('adapter', 'local', ou 'none')
 */

/**
 * Hook unificado para gerenciar o estado da carteira.
 * Combina o estado do `@solana/wallet-adapter-react` (para carteiras como Phantom)
 * com o estado do nosso `AuthContext` (para login com username/senha).
 * O hook é memoizado para performance, evitando re-renderizações desnecessárias.
 * @returns {AppWallet}
 */
export const useAppWallet = () => {
    const walletAdapter = useWallet();
    const auth = useAuth();

    // useMemo garante que este objeto complexo só seja recalculado se
    // o estado de `walletAdapter` ou `auth` mudar.
    const appWallet = useMemo(() => {
        // Prioridade 1: Carteira externa (Phantom, Solflare, etc.) está conectada.
        if (walletAdapter.connected && walletAdapter.publicKey) {
            return {
                ...walletAdapter,
                walletType: 'adapter', // Identificador da origem
            };
        }

        // Prioridade 2: Usuário está autenticado via nosso sistema local.
        if (auth.isAuthenticated && auth.keypair) {
            // Criamos um objeto que imita a interface do `useWallet` para consistência.
            const localWallet = {
                connected: true,
                connecting: false,
                disconnecting: false,
                publicKey: auth.publicKey,
                walletType: 'local',

                // A função de desconectar para o nosso sistema é o logout.
                disconnect: auth.logout,

                // Funções de assinatura usando o keypair em memória.
                signTransaction: async (transaction) => {
                    transaction.partialSign(auth.keypair);
                    return transaction;
                },
                signAllTransactions: async (transactions) => {
                    for (const tx of transactions) {
                        tx.partialSign(auth.keypair);
                    }
                    return transactions;
                },
                // Adicionamos stubs para outras funções/propriedades para evitar erros de `undefined`.
                connect: async () => console.warn("Connect not applicable for local wallet"),
                sendTransaction: async () => { throw new Error("SendTransaction not implemented for local wallet.") },
                wallet: null,
            };
            return localWallet;
        }

        // Caso padrão: Ninguém está conectado.
        // Retornamos o estado do adapter para que botões como <WalletMultiButton />
        // continuem funcionando para iniciar a conexão.
        return {
            ...walletAdapter,
            connected: false,
            publicKey: null,
            walletType: 'none',
        };
    }, [walletAdapter, auth]); // Dependências do useMemo

    return appWallet;
};