// Em: /pages/api/meta/[eventId]/[ticketId].js

import { Connection, PublicKey } from '@solana/web3.js';
import { Program, AnchorProvider, BN } from '@coral-xyz/anchor';
import idl from '../../../../idl/ticketing_system.json'; 

// --- CONFIGURAÇÕES ---

const PROGRAM_ID = "GRDPcYTxrXv1mX3ExUS2UUjjAWNezUdiwvRtn3EQP8Ci"; 

const RPC_URL = "https://api.devnet.solana.com"; 

export default async function handler(req, res) {
    // Extrai os IDs da URL da requisição
    const { eventId, ticketId } = req.query;

    if (!eventId || !ticketId) {
        return res.status(400).json({ error: "eventId e ticketId são obrigatórios." });
    }

    try {
        // --- 1. CONECTAR À BLOCKCHAIN ---
        const connection = new Connection(RPC_URL, 'confirmed');
        // Criamos um 'provider' anônimo (sem carteira), pois só faremos leitura
        const provider = new AnchorProvider(connection, {}, AnchorProvider.defaultOptions());
        const program = new Program(idl, PROGRAM_ID, provider);

        // --- 2. ENCONTRAR A CONTA DO EVENTO NA BLOCKCHAIN ---
        // O `eventId` vem como string da URL, então convertemos para BN para usar na seed
        const eventIdBN = new BN(eventId);
        const [eventPda] = PublicKey.findProgramAddressSync(
            [Buffer.from("event"), eventIdBN.toArrayLike(Buffer, 'le', 8)],
            program.programId
        );

        // --- 3. BUSCAR OS DADOS ON-CHAIN DO EVENTO ---
        const eventAccount = await program.account.event.fetch(eventPda);
        
        // --- 4. MONTAR O JSON DE METADADOS DINAMICAMENTE ---
        // Usamos os dados frescos da blockchain para criar a resposta
        const metadata = {
            name: `${eventAccount.name} #${ticketId}`,
            symbol: "TICKET", // Você pode buscar isso do evento se quiser
            description: eventAccount.description,
            image: eventAccount.imageUri, // O link para a imagem principal do evento
            attributes: [
                { 
                  trait_type: "Evento", 
                  value: eventAccount.name 
                },
                { 
                  trait_type: "Local", 
                  value: eventAccount.location 
                },
                { 
                  trait_type: "Ingresso Nº", 
                  value: ticketId.toString() 
                },
                {
                  trait_type: "Data",
                  value: new Date(eventAccount.startDateTime.toNumber() * 1000).toLocaleDateString('pt-BR')
                }
            ],
            properties: {
                files: [{
                    uri: eventAccount.imageUri,
                    type: "image/png" // Ajuste o tipo se usar outros formatos
                }]
            }
        };

        // --- 5. RETORNAR O JSON ---
        // Definimos o cabeçalho para indicar que a resposta é um JSON
        res.setHeader('Content-Type', 'application/json');
        res.status(200).json(metadata);

    } catch (error) {
        console.error(`Erro ao gerar metadados para evento ${eventId}, ticket ${ticketId}:`, error);
        res.status(500).json({ error: "Erro interno ao gerar metadados." });
    }
}