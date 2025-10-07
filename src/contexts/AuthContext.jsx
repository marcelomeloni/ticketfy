// src/contexts/AuthContext.jsx

import React, { createContext, useState, useContext, useMemo, useCallback, useEffect } from 'react';
import { Keypair } from '@solana/web3.js';
import * as bip39 from 'bip39';
import { derivePath } from 'ed25519-hd-key';
import bs58 from 'bs58';
import { getKeypairFromCredentials } from '../lib/authUtils';

const AuthContext = createContext(null);
const LOCAL_STORAGE_KEY = 'solana-local-wallet-credentials';

export function AuthProvider({ children }) {
    const [keypair, setKeypair] = useState(null);
    const [loginType, setLoginType] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    // Função para derivar keypair de seedphrase
    const getKeypairFromSeedphrase = useCallback(async (seedWords) => {
        // Junta as palavras e normaliza
        const mnemonic = seedWords.join(' ').trim().toLowerCase();
        
        // Valida se é uma seedphrase válida
        if (!bip39.validateMnemonic(mnemonic)) {
            throw new Error('Seedphrase inválida');
        }

        // Deriva a seed da mnemonic
        const seed = await bip39.mnemonicToSeed(mnemonic);
        
        // Deriva o keypair usando o path padrão do Solana
        const path = "m/44'/501'/0'/0'";
        const derivedSeed = derivePath(path, seed.toString('hex')).key;
        
        return Keypair.fromSeed(derivedSeed.slice(0, 32));
    }, []);

    // Função para derivar keypair de private key
    const getKeypairFromPrivateKey = useCallback(async (privateKey) => {
        try {
            // Tenta decodificar como base58 (formato comum do Solana)
            const secretKey = bs58.decode(privateKey.trim());
            return Keypair.fromSecretKey(secretKey);
        } catch (e) {
            try {
                // Tenta como hex string
                const hexString = privateKey.trim();
                if (hexString.length === 64 || hexString.length === 128) {
                    const secretKey = Uint8Array.from(Buffer.from(hexString, 'hex'));
                    return Keypair.fromSecretKey(secretKey);
                }
                throw new Error('Formato de private key inválido');
            } catch (hexError) {
                throw new Error('Private key inválida. Use base58 ou hex format');
            }
        }
    }, []);

    useEffect(() => {
        const tryRestoreSession = async () => {
            try {
                const savedCredentials = localStorage.getItem(LOCAL_STORAGE_KEY);
                if (savedCredentials) {
                    const { username, password, loginType: savedLoginType, seedPhrase, privateKey } = JSON.parse(savedCredentials);
                    
                    console.log("Restaurando sessão com tipo:", savedLoginType);
                    
                    if (savedLoginType === 'credentials' && username && password) {
                        console.log("Restaurando sessão com credenciais...");
                        const generatedKeypair = await getKeypairFromCredentials(username, password);
                        setKeypair(generatedKeypair);
                        setLoginType('credentials'); // ✅ DEFINIR LOGIN TYPE
                        console.log("✅ Sessão restaurada com credenciais");
                    }
                    else if (savedLoginType === 'seedphrase' && seedPhrase) {
                        console.log("Restaurando sessão com seedphrase...");
                        const keypair = await getKeypairFromSeedphrase(seedPhrase);
                        setKeypair(keypair);
                        setLoginType('seedphrase'); // ✅ DEFINIR LOGIN TYPE
                        console.log("✅ Sessão restaurada com seedphrase");
                    }
                    else if (savedLoginType === 'privateKey' && privateKey) {
                        console.log("Restaurando sessão com private key...");
                        const keypair = await getKeypairFromPrivateKey(privateKey);
                        setKeypair(keypair);
                        setLoginType('privateKey'); // ✅ DEFINIR LOGIN TYPE
                        console.log("✅ Sessão restaurada com private key");
                    } else {
                        console.log("❌ Credenciais salvas inválidas ou incompletas");
                        localStorage.removeItem(LOCAL_STORAGE_KEY);
                    }
                } else {
                    console.log("Nenhuma sessão salva encontrada");
                }
            } catch (err) {
                console.error("❌ Falha ao restaurar sessão:", err);
                localStorage.removeItem(LOCAL_STORAGE_KEY);
                setKeypair(null);
                setLoginType(null);
            } finally {
                setIsLoading(false);
            }
        };

        tryRestoreSession();
    }, [getKeypairFromSeedphrase, getKeypairFromPrivateKey]);

    // Login com username/senha
    const login = useCallback(async (username, password) => {
        setIsLoading(true);
        setError(null);
        try {
            const generatedKeypair = await getKeypairFromCredentials(username, password);
            setKeypair(generatedKeypair);
            setLoginType('credentials'); // ✅ DEFINIR LOGIN TYPE
            
            // Salva no localStorage
            const credentialsToSave = JSON.stringify({ 
                username, 
                password,
                loginType: 'credentials'
            });
            localStorage.setItem(LOCAL_STORAGE_KEY, credentialsToSave);
            
            console.log("✅ Login realizado com credenciais");
            return true;
        } catch (err) {
            console.error("❌ Falha no login:", err);
            setError("Credenciais inválidas ou falha ao gerar a carteira.");
            localStorage.removeItem(LOCAL_STORAGE_KEY);
            setKeypair(null);
            setLoginType(null);
            return false;
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Login com seedphrase
    const loginWithSeedphrase = useCallback(async (seedWords) => {
        setIsLoading(true);
        setError(null);
        try {
            const keypair = await getKeypairFromSeedphrase(seedWords);
            setKeypair(keypair);
            setLoginType('seedphrase'); // ✅ DEFINIR LOGIN TYPE
            
            // Salva no localStorage (apenas a seedphrase, não as palavras individuais)
            const credentialsToSave = JSON.stringify({ 
                seedPhrase: seedWords,
                loginType: 'seedphrase'
            });
            localStorage.setItem(LOCAL_STORAGE_KEY, credentialsToSave);
            
            console.log("✅ Login realizado com seedphrase");
            return true;
        } catch (err) {
            console.error("❌ Falha no login com seedphrase:", err);
            setError(err.message || "Seedphrase inválida. Verifique as palavras.");
            localStorage.removeItem(LOCAL_STORAGE_KEY);
            setKeypair(null);
            setLoginType(null);
            return false;
        } finally {
            setIsLoading(false);
        }
    }, [getKeypairFromSeedphrase]);

    // Login com private key
    const loginWithPrivateKey = useCallback(async (privateKey) => {
        setIsLoading(true);
        setError(null);
        try {
            const keypair = await getKeypairFromPrivateKey(privateKey);
            setKeypair(keypair);
            setLoginType('privateKey'); // ✅ DEFINIR LOGIN TYPE
            
            // Salva no localStorage
            const credentialsToSave = JSON.stringify({ 
                privateKey: privateKey,
                loginType: 'privateKey'
            });
            localStorage.setItem(LOCAL_STORAGE_KEY, credentialsToSave);
            
            console.log("✅ Login realizado com private key");
            return true;
        } catch (err) {
            console.error("❌ Falha no login com private key:", err);
            setError(err.message || "Private key inválida. Verifique o formato.");
            localStorage.removeItem(LOCAL_STORAGE_KEY);
            setKeypair(null);
            setLoginType(null);
            return false;
        } finally {
            setIsLoading(false);
        }
    }, [getKeypairFromPrivateKey]);

    const logout = useCallback(() => {
        console.log("🚪 Usuário deslogado");
        setKeypair(null);
        setLoginType(null); // ✅ LIMPAR LOGIN TYPE
        setError(null);
        localStorage.removeItem(LOCAL_STORAGE_KEY);
    }, []);

    const signTransaction = useCallback(async (transaction) => {
        if (!keypair) {
            throw new Error("Usuário não autenticado");
        }
        
        // Assina a transação com o keypair do usuário
        transaction.partialSign(keypair);
        return transaction;
    }, [keypair]);
    
    const signAndSendTransaction = useCallback(async (transaction, connection) => {
        if (!keypair) {
            throw new Error("Usuário não autenticado");
        }
    
        try {
            // Assina a transação
            const signedTransaction = await signTransaction(transaction);
            
            // Envia a transação
            const signature = await connection.sendRawTransaction(
                signedTransaction.serialize()
            );
            
            // Confirma a transação
            const confirmation = await connection.confirmTransaction(signature);
            
            return { signature, confirmation };
        } catch (error) {
            console.error("Erro ao assinar e enviar transação:", error);
            throw error;
        }
    }, [keypair, signTransaction]);

    const value = useMemo(() => ({
        keypair,
        publicKey: keypair?.publicKey,
        isAuthenticated: !!keypair,
        loginType, // ✅ EXPOR LOGIN TYPE
        isLoading,
        error,
        login,
        loginWithSeedphrase,
        loginWithPrivateKey,
        logout,
        signTransaction,
        signAndSendTransaction,
        // Para compatibilidade com wallets externas
        signAllTransactions: async (transactions) => {
            if (!keypair) {
                throw new Error("Usuário não autenticado");
            }
            return transactions.map(tx => {
                tx.partialSign(keypair);
                return tx;
            });
        }
    }), [keypair, loginType, isLoading, error, login, loginWithSeedphrase, loginWithPrivateKey, logout, signTransaction, signAndSendTransaction]);

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth deve ser usado dentro de um AuthProvider');
    }
    return context;
};