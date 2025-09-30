// src/contexts/AuthContext.jsx

import React, { createContext, useState, useContext, useMemo, useCallback, useEffect } from 'react';
import { Keypair } from '@solana/web3.js';
import { getKeypairFromCredentials } from '../lib/authUtils';

const AuthContext = createContext(null);

// Chave que usaremos para salvar os dados no localStorage
const LOCAL_STORAGE_KEY = 'solana-local-wallet-credentials';

export function AuthProvider({ children }) {
    const [keypair, setKeypair] = useState(null);
    // ✅ Alterado: O estado inicial de isLoading agora é `true`
    // para que a aplicação espere a verificação do localStorage.
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    // ✅ NOVO: Efeito que roda uma vez quando o componente é montado.
    // Ele tenta restaurar a sessão a partir do localStorage.
    useEffect(() => {
        try {
            const savedCredentials = localStorage.getItem(LOCAL_STORAGE_KEY);

            if (savedCredentials) {
                console.log("Credenciais encontradas no localStorage, tentando login automático...");
                const { username, password } = JSON.parse(savedCredentials);
                // Usamos a função de login já existente para restaurar o estado
                login(username, password);
            }
        } catch (err) {
            console.error("Falha ao ler credenciais do localStorage:", err);
            // Se falhar, limpamos para não tentar de novo com dados corrompidos.
            localStorage.removeItem(LOCAL_STORAGE_KEY);
        } finally {
            // ✅ Garante que o loading termine mesmo se não houver credenciais salvas.
            setIsLoading(false);
        }
    }, []); // O array vazio [] garante que este efeito rode apenas uma vez.

    const login = useCallback(async (username, password) => {
        setIsLoading(true);
        setError(null);
        try {
            console.log("Derivando chave a partir das credenciais...");
            const generatedKeypair = await getKeypairFromCredentials(username, password);

            setKeypair(generatedKeypair);
            console.log("Login bem-sucedido! Endereço:", generatedKeypair.publicKey.toBase58());

            // ✅ ALTERADO: Salvar credenciais no localStorage após login bem-sucedido
            const credentialsToSave = JSON.stringify({ username, password });
            localStorage.setItem(LOCAL_STORAGE_KEY, credentialsToSave);

            return true; // Retornar sucesso para a LoginPage

        } catch (err) {
            console.error("Falha no login:", err);
            setError("Credenciais inválidas ou falha ao gerar a carteira. Tente novamente.");
            setKeypair(null);

            // ✅ ALTERADO: Limpar o localStorage em caso de falha no login
            // Isso previne que credenciais inválidas fiquem salvas.
            localStorage.removeItem(LOCAL_STORAGE_KEY);
            return false; // Retornar falha

        } finally {
            setIsLoading(false);
        }
    }, []);

    const logout = useCallback(() => {
        setKeypair(null);
        setError(null);

        // ✅ ALTERADO: Limpar credenciais do localStorage ao fazer logout
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
        logout,
    }), [keypair, isLoading, error, login, logout]);

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth deve ser usado dentro de um AuthProvider');
    }
    return context;
};