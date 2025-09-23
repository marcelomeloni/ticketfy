📖 Sobre o Projeto
O objetivo do Ticketfy é revolucionar a indústria de eventos, trazendo transparência, segurança e novas possibilidades através da Web3.

Para Organizadores: Uma ferramenta completa para criar eventos, definir lotes de ingressos (tiers), gerenciar validadores e sacar os fundos de forma segura e transparente após o término das vendas.

Para Participantes: Uma experiência de compra segura onde o ingresso é um NFT de sua propriedade. Após o evento, o próprio ingresso pode se transformar em um certificado de participação, um item de colecionador ou um passe para benefícios futuros.

A plataforma utiliza um programa (Smart Contract) na Solana, escrito com o framework Anchor, para garantir que todas as regras de negócio sejam executadas de forma autônoma e segura na blockchain.

✨ Funcionalidades
🎟️ Ingressos em NFT: Cada ingresso é um token único na blockchain da Solana, garantindo autenticidade e prevenindo fraudes.

🛠️ Gestão Completa para Eventos:

Criação de eventos com metadados detalhados (descrição, data, local, etc.).

Adição de múltiplos lotes de ingressos com preços e quantidades diferentes.

Gerenciamento de validadores autorizados a realizar o check-in.

📱 Validação por QR Code: Um painel de validação simples e eficiente, onde validadores podem escanear o QR code do ingresso (que contém o endereço do NFT) para confirmar a entrada.

🎓 Certificados de Participação: Após a validação do ingresso, o participante pode resgatar um certificado digital atrelado ao seu NFT.

💼 Integração com Carteiras Solana: Suporte para as principais carteiras do ecossistema, como Phantom e Solflare, através do Wallet-Adapter.

👤 Perfis de Usuário: Integração com Supabase para associar nomes de usuário a endereços de carteira, enriquecendo a experiência.

🗺️ Mapa Interativo: Visualização do local do evento em um mapa interativo usando React-Leaflet.

🚀 Tecnologias Utilizadas
Este projeto é uma aplicação full-stack Web3, combinando tecnologias de frontend, blockchain e backend.

Frontend:

React.js - Biblioteca principal para a construção da interface.

Vite - Ferramenta de build extremamente rápida.

React Router - Para gerenciamento de rotas.

Tailwind CSS - Para estilização ágil e moderna.

React-Leaflet - Para a exibição de mapas interativos.

jsPDF - Para a geração de ingressos em PDF.

Blockchain (Solana):

Anchor Framework - Para desenvolvimento rápido e seguro de programas Solana.

@solana/web3.js - Para interagir com a blockchain Solana.

@solana/wallet-adapter - Para integração com carteiras.

IDL (Interface Definition Language) - Para conectar o frontend ao programa na blockchain.

Backend & Banco de Dados:

Supabase - Utilizado como banco de dados para armazenar perfis de usuário e metadados.
