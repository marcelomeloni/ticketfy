// 1. Removida a dependência externa 'argon2-browser'. Usaremos a Web Crypto API nativa.
import { Keypair } from '@solana/web3.js';

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

