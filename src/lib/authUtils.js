// 1. Removida a dependência externa 'argon2-browser'. Usaremos a Web Crypto API nativa.
import { Keypair } from '@solana/web3.js';
import * as bs58 from 'bs58';
/**
 * Deriva uma semente de 32 bytes de um username e senha usando PBKDF2 da Web Crypto API.
 * Esta abordagem é nativa do navegador e evita problemas de importação com o Vite.
 * @param {string} username - O nome de usuário, usado como "salt" para a derivação.
 * @param {string} password - A senha do usuário.
 * @returns {Promise<Uint8Array>} Uma promessa que resolve para a semente de 32 bytes (Uint8Array).
 */
export const deriveKeyFromCredentials = async (username, password) => {
  const passwordBytes = new TextEncoder().encode(password);
  const salt = new TextEncoder().encode(username);

  // 2. Importamos a senha como uma chave "crua" que pode ser usada para derivação.
  const masterKey = await crypto.subtle.importKey(
    'raw',
    passwordBytes,
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );

  // 3. Derivamos os bits usando PBKDF2 com parâmetros seguros.
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000, // Número de iterações. Padrão seguro.
      hash: 'SHA-256',
    },
    masterKey,
    256 // O tamanho da saída em bits (256 bits = 32 bytes).
  );

  // O resultado é um ArrayBuffer, que convertemos para o Uint8Array esperado.
  return new Uint8Array(derivedBits);
};
export const getKeypairFromSeedPhrase = (seedPhrase) => {
  try {
    // Para Solana, podemos usar uma abordagem simplificada
    // Em produção, você usaria bip39 com derivação de caminho específica
    const seed = new TextEncoder().encode(seedPhrase);
    
    // Usamos SHA-256 para criar um seed determinístico a partir da seed phrase
    return crypto.subtle.digest('SHA-256', seed)
      .then(hash => {
        const seedArray = new Uint8Array(hash).slice(0, 32);
        return Keypair.fromSeed(seedArray);
      });
  } catch (error) {
    throw new Error('Falha ao derivar keypair da seed phrase: ' + error.message);
  }
};

/**
 * Deriva um Keypair a partir de uma private key (base58 ou array de bytes)
 * @param {string} privateKey - A private key em formato base58
 * @returns {Keypair} O keypair derivado da private key
 */
export const getKeypairFromPrivateKey = (privateKey) => {
  try {
    // Decodifica a private key de base58 para bytes
    const privateKeyBytes = bs58.decode(privateKey);
    
    // Verifica se tem o tamanho correto (64 bytes para Solana keypair)
    if (privateKeyBytes.length !== 64) {
      throw new Error('Private key deve ter 64 bytes');
    }
    
    return Keypair.fromSecretKey(privateKeyBytes);
  } catch (error) {
    throw new Error('Falha ao derivar keypair da private key: ' + error.message);
  }
};
/**
 * Gera um Keypair da Solana a partir de credenciais.
 * Combina a derivação da chave e a criação do Keypair em uma única função.
 * @param {string} username - O nome de usuário.
 * @param {string} password - A senha.
 * @returns {Promise<Keypair>} Uma promessa que resolve para o objeto Keypair da Solana.
 */
export const getKeypairFromCredentials = async (username, password) => {
    const seed = await deriveKeyFromCredentials(username, password);
    const keypair = Keypair.fromSeed(seed);
    return keypair;
};

