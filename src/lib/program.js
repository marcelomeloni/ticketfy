// Em: src/lib/program.js

import { Program, AnchorProvider, web3 } from '@coral-xyz/anchor';
import idl from '@/idl/ticketing_system.json';

const PROGRAM_ADDRESS = "6BpG2uYeLSgHEynoT7VrNb6BpHSiwXPyayvECgCaizL5";

/**
 * Cria uma instância do programa Anchor para transações que exigem assinatura (escrita).
 * Retorna null se a carteira não estiver conectada.
 */
export function createWritableProgram(connection, wallet) {
    if (!wallet) return null;
    const provider = new AnchorProvider(connection, wallet, AnchorProvider.defaultOptions());
    return new Program(idl, PROGRAM_ADDRESS, provider);
}

/**
 * Cria uma instância do programa Anchor para operações de apenas leitura.
 * Nunca depende de uma carteira conectada, usando uma "carteira falsa" segura.
 */
export function createReadOnlyProgram(connection) {
    const dummyWallet = {
        publicKey: web3.Keypair.generate().publicKey,
        signTransaction: () => Promise.reject(new Error("Dummy wallet cannot sign")),
        signAllTransactions: () => Promise.reject(new Error("Dummy wallet cannot sign")),
    };
    const provider = new AnchorProvider(connection, dummyWallet, AnchorProvider.defaultOptions());
    return new Program(idl, PROGRAM_ADDRESS, provider);
}