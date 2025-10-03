// src/contexts/AuthContext.jsx
import React, { createContext, useState, useContext, useMemo, useCallback, useEffect } from 'react';
import { getKeypairFromCredentials, getKeypairFromSeedPhrase, getKeypairFromPrivateKey } from '../lib/authUtils';
import { checkRole } from '../api/authService';

export const USER_ROLES = {
  BATCH_OWNER: 'batchOwner',
  NO_AUTH: 'noAuth',
  PRODUCER: 'producer',
  LOGISTICS: 'logistics',
  WAREHOUSE: 'warehouse',
  GRADER: 'grader',
  ROASTER: 'roaster',
  PACKAGER: 'packager',
  DISTRIBUTOR: 'distributor',
  BENEFICIAMENTO: 'beneficiamento',
  END_CONSUMER: 'end_consumer',
  SUSTAINABILITY: 'sustainability',
};

const AuthContext = createContext(null);
const LOCAL_STORAGE_KEY = 'coffee-trace-credentials';

export function AuthProvider({ children }) {
    const [keypair, setKeypair] = useState(null);
    const [userRole, setUserRole] = useState(null);
    const [partnerId, setPartnerId] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [unregisteredPublicKey, setUnregisteredPublicKey] = useState(null);
    const [sessionRestored, setSessionRestored] = useState(false);

    // 🆕 Função auxiliar para verificar role após obter keypair
    const verifyRoleAndCompleteLogin = async (generatedKeypair, loginMethod = 'credentials') => {
      const publicKeyStr = generatedKeypair.publicKey.toBase58();
      console.log(`🔐 Verificando role para: ${publicKeyStr} (método: ${loginMethod})`);
      
      const roleResponse = await checkRole(publicKeyStr);
      console.log('📋 Resposta da API:', roleResponse);

      if (!roleResponse || !roleResponse.role) {
        throw new Error('Resposta inválida da API - role não encontrado');
      }

      const { role, partnerId } = roleResponse;

      if (role === USER_ROLES.NO_AUTH) {
        const authError = "Usuário não autorizado. Sua carteira não está registrada no sistema.";
        console.warn('❌ Usuário não autorizado:', publicKeyStr);
        setError(authError);
        setUnregisteredPublicKey(publicKeyStr);
        return false;
      }

      console.log('💾 Configurando dados de autenticação...');
      setKeypair(generatedKeypair);
      setUserRole(role);
      setPartnerId(partnerId);
      setError(null);
      setUnregisteredPublicKey(null);
      
      // 🆕 Só salva no localStorage se for login por credenciais
      if (loginMethod === 'credentials') {
        console.log('💾 Salvando credenciais no localStorage...');
      }
      
      console.log('🎉 Login realizado com sucesso! Role:', role, 'ID:', partnerId);
      return true;
    };

    // Login tradicional com username/password
    const login = useCallback(async (username, password) => {
        setIsLoading(true);
        setError(null);
        setUnregisteredPublicKey(null);

        try {
            console.log('🔐 Iniciando login com credenciais...');
            const generatedKeypair = await getKeypairFromCredentials(username, password);
            const success = await verifyRoleAndCompleteLogin(generatedKeypair, 'credentials');
            
            if (success) {
              localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify({ username, password }));
            } else {
              localStorage.removeItem(LOCAL_STORAGE_KEY);
            }
            
            setIsLoading(false);
            return success;

        } catch (err) {
            console.error("💥 Falha na autenticação:", err);
            const errorMessage = err.message || "Credenciais inválidas ou falha de comunicação.";
            setError(errorMessage);
            setKeypair(null);
            setUserRole(null);
            setPartnerId(null);
            setUnregisteredPublicKey(null);
            
            localStorage.removeItem(LOCAL_STORAGE_KEY);
            setIsLoading(false);
            return false;
        }
    }, []);

    // 🆕 NOVO: Login com Seed Phrase
    const loginWithSeedphrase = useCallback(async (seedWords) => {
        setIsLoading(true);
        setError(null);
        setUnregisteredPublicKey(null);

        try {
            console.log('🔐 Iniciando login com seed phrase...');
            const seedPhrase = seedWords.join(' ');
            const generatedKeypair = await getKeypairFromSeedPhrase(seedPhrase);
            const success = await verifyRoleAndCompleteLogin(generatedKeypair, 'seedphrase');
            
            // 🆕 Não salva seed phrase no localStorage por segurança
            setIsLoading(false);
            return success;

        } catch (err) {
            console.error("💥 Falha no login com seed phrase:", err);
            const errorMessage = err.message || "Seed phrase inválida ou falha de comunicação.";
            setError(errorMessage);
            setKeypair(null);
            setUserRole(null);
            setPartnerId(null);
            setUnregisteredPublicKey(null);
            
            setIsLoading(false);
            return false;
        }
    }, []);

    // 🆕 NOVO: Login com Private Key
    const loginWithPrivateKey = useCallback(async (privateKey) => {
        setIsLoading(true);
        setError(null);
        setUnregisteredPublicKey(null);

        try {
            console.log('🔐 Iniciando login com private key...');
            const generatedKeypair = await getKeypairFromPrivateKey(privateKey);
            const success = await verifyRoleAndCompleteLogin(generatedKeypair, 'privatekey');
            
            // 🆕 Não salva private key no localStorage por segurança
            setIsLoading(false);
            return success;

        } catch (err) {
            console.error("💥 Falha no login com private key:", err);
            const errorMessage = err.message || "Private key inválida ou falha de comunicação.";
            setError(errorMessage);
            setKeypair(null);
            setUserRole(null);
            setPartnerId(null);
            setUnregisteredPublicKey(null);
            
            setIsLoading(false);
            return false;
        }
    }, []);

    const logout = useCallback(() => {
        console.log('🚪 Realizando logout...');
        setKeypair(null);
        setUserRole(null);
        setPartnerId(null);
        setError(null);
        setUnregisteredPublicKey(null);
        localStorage.removeItem(LOCAL_STORAGE_KEY);
        console.log('✅ Logout concluído');
    }, []);

    useEffect(() => {
        const restoreSession = async () => {
            if (sessionRestored) {
                return;
            }

            console.log('🔄 Tentando restaurar sessão...');
            const savedCredentials = localStorage.getItem(LOCAL_STORAGE_KEY);

            if (!savedCredentials) {
                console.log('🔍 Nenhuma sessão anterior encontrada');
                setIsLoading(false);
                setSessionRestored(true);
                return;
            }

            try {
                console.log('📦 Credenciais encontradas no localStorage');
                const { username, password } = JSON.parse(savedCredentials);
                
                const generatedKeypair = await getKeypairFromCredentials(username, password);
                const publicKeyStr = generatedKeypair.publicKey.toBase58();
                
                const roleResponse = await checkRole(publicKeyStr);
                
                if (roleResponse.role !== USER_ROLES.NO_AUTH) {
                    setKeypair(generatedKeypair);
                    setUserRole(roleResponse.role);
                    setPartnerId(roleResponse.partnerId);
                    console.log('✅ Sessão restaurada com sucesso:', roleResponse.role, 'ID:', roleResponse.partnerId);
                } else {
                    console.warn('⚠️ Role não autorizado, forçando logout');
                    logout();
                }
            } catch (err) {
                console.error('❌ Erro ao restaurar sessão:', err);
                logout();
            } finally {
                setIsLoading(false); 
                setSessionRestored(true);
            }
        };
        
        restoreSession();
    }, [sessionRestored, logout]);

    const value = useMemo(() => ({
        keypair,
        publicKey: keypair?.publicKey,
        userRole,
        partnerId,
        isLoading,
        error,
        unregisteredPublicKey,
        isAuthenticated: !!keypair && !!userRole && userRole !== USER_ROLES.NO_AUTH,
        isBatchOwner: userRole === USER_ROLES.BATCH_OWNER,
        login,
        loginWithSeedphrase, // 🆕 Exportando novo método
        loginWithPrivateKey, // 🆕 Exportando novo método
        logout,
        USER_ROLES,
    }), [
        keypair, 
        userRole, 
        partnerId,
        isLoading, 
        error, 
        unregisteredPublicKey, 
        login, 
        loginWithSeedphrase,
        loginWithPrivateKey,
        logout
    ]);

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth deve ser usado dentro de um AuthProvider');
    }
    return context;
};