import React from 'react';
import { Page, Text, View, Document, StyleSheet, Image, Link, Font } from '@react-pdf/renderer';

// --- Registro de Fontes (Opcional, mas melhora o profissionalismo) ---
// Para usar fontes customizadas, você precisaria baixá-las (ex: do Google Fonts)
// Font.register({
//   family: 'Inter',
//   fonts: [
//     { src: '/path/to/fonts/Inter-Regular.ttf' },
//     { src: '/path/to/fonts/Inter-Bold.ttf', fontWeight: 'bold' },
//   ],
// });

// --- Estilos ---
const styles = StyleSheet.create({
    // Estilos Gerais
    document: {
        fontFamily: 'Helvetica',
    },
    page: {
        paddingVertical: 40,
        paddingHorizontal: 30,
        backgroundColor: '#F1F5F9', // Fundo cinza claro
    },
    // Cabeçalho
    header: {
        textAlign: 'center',
        marginBottom: 20,
    },
    brandTitle: {
        fontSize: 28,
        fontFamily: 'Helvetica-Bold',
        color: '#4F46E5', // Roxo da marca
    },
    slogan: {
        fontSize: 10,
        color: '#64748B', // Cinza
    },
    // Corpo do Ingresso
    ticketBody: {
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        padding: 20,
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
    },
    eventName: {
        fontSize: 24,
        fontFamily: 'Helvetica-Bold',
        color: '#1E2B3B',
        textAlign: 'center',
        marginBottom: 20,
    },
    contentRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    infoColumn: {
        flex: 1.5, // Ocupa mais espaço que o QR code
        paddingRight: 15,
    },
    qrColumn: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    infoBlock: {
        marginBottom: 15,
    },
    infoLabel: {
        fontSize: 9,
        fontFamily: 'Helvetica-Bold',
        color: '#64748B',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    infoValue: {
        fontSize: 11,
        marginTop: 2,
    },
    qrCodeImage: {
        width: 110,
        height: 110,
    },
    mintAddress: {
        fontSize: 7,
        fontFamily: 'Courier',
        marginTop: 5,
        color: '#64748B',
    },
    // Rodapé do Ingresso
    footer: {
        marginTop: 25,
        textAlign: 'center',
    },
    footerText: {
        fontSize: 10,
    },
    footerLink: {
        fontSize: 10,
        color: '#4F46E5',
        textDecoration: 'underline',
    },
    // Página de Segurança
    securityPage: {
        padding: 30,
        fontFamily: 'Helvetica',
    },
    warningBox: {
        backgroundColor: '#FEF2F2',
        borderLeftWidth: 4,
        borderLeftColor: '#DC2626',
        padding: 15,
        marginBottom: 20,
    },
    warningTitle: {
        fontFamily: 'Helvetica-Bold',
        fontSize: 14,
        color: '#B91C1C',
        marginBottom: 5,
    },
    warningText: {
        fontSize: 10,
        lineHeight: 1.5,
        color: '#991B1B',
    },
    keySection: {
        marginBottom: 20,
    },
    keyTitle: {
        fontSize: 16,
        fontFamily: 'Helvetica-Bold',
        marginBottom: 10,
    },
    seedGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 4,
        padding: 10,
    },
    seedWordBox: {
        width: '50%',
        paddingVertical: 4,
        flexDirection: 'row',
    },
    seedNumber: {
        fontSize: 10,
        fontFamily: 'Courier',
        color: '#64748B',
        width: 20,
    },
    seedWord: {
        fontSize: 11,
        fontFamily: 'Courier-Bold',
    },
    privateKeyBox: {
        backgroundColor: '#F8FAFC',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 4,
        padding: 10,
    },
    privateKeyText: {
        fontSize: 9,
        fontFamily: 'Courier',
        wordBreak: 'break-all',
    },
});

// --- COMPONENTE PRINCIPAL DO DOCUMENTO ---

export const TicketPDF = ({ ticketData, qrCodeImage }) => {
    const { eventName, eventDate, eventLocation, mintAddress, seedPhrase, privateKey } = ticketData;

    // Funções auxiliares para formatação
    const formatFullAddress = (location) => {
        if (!location || location.type !== 'Physical' || !location.address) { return "Local a definir"; }
        const { venueName, address } = location;
        const line1 = `${address.street}${address.number ? `, ${address.number}` : ''}`;
        const line2 = `${address.neighborhood ? `${address.neighborhood}, ` : ''}${address.city} - ${address.state}`;
        return `${venueName}\n${line1}\n${line2}`;
    };
    const formatDisplayDate = (dateString) => {
        if (!dateString) return 'Data a definir';
        return new Date(dateString).toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    };
    const formatDisplayTime = (dateString) => {
        if (!dateString) return 'Horário a definir';
        return new Date(dateString).toLocaleTimeString('pt-BR', { timeStyle: 'short', timeZone: 'America/Sao_Paulo' });
    };

    return (
        <Document style={styles.document} author="Ticketfy">
            {/* PÁGINA 1: O INGRESSO */}
            <Page size="A5" style={styles.page}>
                <View style={styles.header}>
                    <Text style={styles.brandTitle}>Ticketfy</Text>
                    <Text style={styles.slogan}>O Futuro dos Eventos é Descentralizado</Text>
                </View>

                <View style={styles.ticketBody}>
                    <Text style={styles.eventName}>{eventName}</Text>
                    
                    <View style={styles.contentRow}>
                        {/* Coluna de Informações */}
                        <View style={styles.infoColumn}>
                            <View style={styles.infoBlock}>
                                <Text style={styles.infoLabel}>DATA</Text>
                                <Text style={styles.infoValue}>{formatDisplayDate(eventDate)}</Text>
                            </View>
                            <View style={styles.infoBlock}>
                                <Text style={styles.infoLabel}>HORÁRIO</Text>
                                <Text style={styles.infoValue}>{formatDisplayTime(eventDate)} (Horário de Brasília)</Text>
                            </View>
                            <View style={styles.infoBlock}>
                                <Text style={styles.infoLabel}>LOCAL</Text>
                                <Text style={styles.infoValue}>{formatFullAddress(eventLocation)}</Text>
                            </View>
                        </View>

                        {/* Coluna do QR Code */}
                        <View style={styles.qrColumn}>
                            {qrCodeImage && <Image style={styles.qrCodeImage} src={qrCodeImage} />}
                            <Text style={styles.mintAddress}>{mintAddress}</Text>
                        </View>
                    </View>
                </View>

                <View style={styles.footer}>
                    <Text style={styles.footerText}>Após o evento, seu certificado estará disponível em:</Text>
                    <Link src={`https://ticketfy.app/certificate/${mintAddress}`} style={styles.footerLink}>
                        ticketfy.app/certificate/{mintAddress.slice(0, 10)}...
                    </Link>
                </View>
            </Page>

            {/* PÁGINA 2: A CARTEIRA DE PAPEL (SÓ RENDERIZA SE NECESSÁRIO) */}
            {seedPhrase && privateKey && (
                <Page size="A5" style={styles.securityPage}>
                    <View style={styles.warningBox}>
                        <Text style={styles.warningTitle}>INFORMAÇÃO CONFIDENCIAL E SECRETA</Text>
                        <Text style={styles.warningText}>
                            Trate esta página como a senha do seu banco. Guarde em um local seguro e OFFLINE. Nunca compartilhe ou tire fotos. A perda destes dados pode resultar no roubo de seus ativos.
                        </Text>
                    </View>

                    <View style={styles.keySection}>
                        <Text style={styles.keyTitle}>Frase Secreta de Recuperação</Text>
                        <View style={styles.seedGrid}>
                            {seedPhrase.split(' ').map((word, index) => (
                                <View key={index} style={styles.seedWordBox}>
                                    <Text style={styles.seedNumber}>{`${index + 1}.`}</Text>
                                    <Text style={styles.seedWord}>{word}</Text>
                                </View>
                            ))}
                        </View>
                    </View>

                    <View style={styles.keySection}>
                        <Text style={styles.keyTitle}>Chave Privada (para Importar)</Text>
                        <View style={styles.privateKeyBox}>
                           <Text style={styles.privateKeyText}>{privateKey}</Text>
                        </View>
                    </View>
                </Page>
            )}
        </Document>
    );
};
