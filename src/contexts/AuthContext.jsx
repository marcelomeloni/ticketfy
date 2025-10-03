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

    // Efeito para login automático do localStorage
    useEffect(() => {
        const tryRestoreSession = async () => {
            try {
                const savedCredentials = localStorage.getItem(LOCAL_STORAGE_KEY);
                if (savedCredentials) {
                    const { username, password, loginType, seedPhrase, privateKey } = JSON.parse(savedCredentials);
                    
                    if (loginType === 'credentials' && username && password) {
                        console.log("Restaurando sessão com credenciais...");
                        const generatedKeypair = await getKeypairFromCredentials(username, password);
                        setKeypair(generatedKeypair);
                    }
                    else if (loginType === 'seedphrase' && seedPhrase) {
                        console.log("Restaurando sessão com seedphrase...");
                        const keypair = await getKeypairFromSeedphrase(seedPhrase);
                        setKeypair(keypair);
                    }
                    else if (loginType === 'privateKey' && privateKey) {
                        console.log("Restaurando sessão com private key...");
                        const keypair = await getKeypairFromPrivateKey(privateKey);
                        setKeypair(keypair);
                    }
                }
            } catch (err) {
                console.error("Falha ao restaurar sessão:", err);
                localStorage.removeItem(LOCAL_STORAGE_KEY);
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
            
            // Salva no localStorage
            const credentialsToSave = JSON.stringify({ 
                username, 
                password,
                loginType: 'credentials'
            });
            localStorage.setItem(LOCAL_STORAGE_KEY, credentialsToSave);
            
            return true;
        } catch (err) {
            console.error("Falha no login:", err);
            setError("Credenciais inválidas ou falha ao gerar a carteira.");
            localStorage.removeItem(LOCAL_STORAGE_KEY);
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
            
            // Salva no localStorage (apenas a seedphrase, não as palavras individuais)
            const credentialsToSave = JSON.stringify({ 
                seedPhrase: seedWords,
                loginType: 'seedphrase'
            });
            localStorage.setItem(LOCAL_STORAGE_KEY, credentialsToSave);
            
            return true;
        } catch (err) {
            console.error("Falha no login com seedphrase:", err);
            setError(err.message || "Seedphrase inválida. Verifique as palavras.");
            localStorage.removeItem(LOCAL_STORAGE_KEY);
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
            
            // Salva no localStorage
            const credentialsToSave = JSON.stringify({ 
                privateKey: privateKey,
                loginType: 'privateKey'
            });
            localStorage.setItem(LOCAL_STORAGE_KEY, credentialsToSave);
            
            return true;
        } catch (err) {
            console.error("Falha no login com private key:", err);
            setError(err.message || "Private key inválida. Verifique o formato.");
            localStorage.removeItem(LOCAL_STORAGE_KEY);
            return false;
        } finally {
            setIsLoading(false);
        }
    }, [getKeypairFromPrivateKey]);

    const logout = useCallback(() => {
        setKeypair(null);
        setError(null);
        localStorage.removeItem(LOCAL_STORAGE_KEY);
        console.log("Usuário deslogado.");
    }, []);

    const value = useMemo(() => ({
        keypair,
        publicKey: keypair?.publicKey,
        isAuthenticated: !!keypair,
        isLoading,
        error,
        login,
        loginWithSeedphrase,
        loginWithPrivateKey,
        logout,
    }), [keypair, isLoading, error, login, loginWithSeedphrase, loginWithPrivateKey, logout]);

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth deve ser usado dentro de um AuthProvider');
    }
    return context;
};