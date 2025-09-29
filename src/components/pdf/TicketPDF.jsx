import React from 'react';
import { Page, Text, View, Document, StyleSheet, Image, Link, Canvas } from '@react-pdf/renderer';

// --- Estilos Premium ---
const styles = StyleSheet.create({
  // Documento
  document: {
    fontFamily: 'Helvetica',
  },
  
  // Página 1: Ingresso Principal
  page: {
    padding: 0,
    backgroundColor: '#FFFFFF',
  },
  
  // Header com gradiente
  header: {
    backgroundColor: '#4F46E5',
    paddingVertical: 25,
    paddingHorizontal: 30,
    position: 'relative',
  },
  
  // Elementos decorativos do header
  headerDecoration: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 150,
    height: 150,
    opacity: 0.1,
  },
  
  brandSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  
  brandLogo: {
    width: 32,
    height: 32,
    marginRight: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
  },
  
  brandTitle: {
    fontSize: 20,
    color: '#FFFFFF',
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 0.5,
  },
  
  ticketType: {
    fontSize: 10,
    color: '#E0E7FF',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 5,
  },
  
  eventName: {
    fontSize: 22,
    color: '#FFFFFF',
    fontFamily: 'Helvetica-Bold',
    lineHeight: 1.3,
  },
  
  // Corpo do ingresso
  ticketBody: {
    padding: 30,
  },
  
  // Grid de informações
  infoGrid: {
    flexDirection: 'row',
    marginBottom: 25,
  },
  
  infoColumn: {
    flex: 1,
  },
  
  infoBlock: {
    marginBottom: 20,
  },
  
  infoLabel: {
    fontSize: 9,
    color: '#64748B',
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  
  infoValue: {
    fontSize: 12,
    color: '#1E293B',
    lineHeight: 1.4,
  },
  
  // Seção QR Code
  qrSection: {
    alignItems: 'center',
    marginVertical: 20,
    padding: 25,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  
  qrContainer: {
    alignItems: 'center',
  },
  
  qrCodeImage: {
    width: 140,
    height: 140,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
  },
  
  qrLabel: {
    fontSize: 10,
    color: '#64748B',
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  
  mintAddress: {
    fontSize: 8,
    color: '#94A3B8',
    fontFamily: 'Courier',
    textAlign: 'center',
    lineHeight: 1.3,
  },
  
  // Footer profissional
  footer: {
    marginTop: 30,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  
  securityNotice: {
    fontSize: 9,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 1.4,
    marginBottom: 15,
  },
  
  certificateLink: {
    fontSize: 10,
    color: '#4F46E5',
    textAlign: 'center',
    textDecoration: 'none',
    fontFamily: 'Helvetica-Bold',
  },
  
  // Página 2: Segurança
  securityPage: {
    padding: 40,
    backgroundColor: '#FFFFFF',
  },
  
  securityHeader: {
    backgroundColor: '#4F46E5',
    padding: 25,
    marginBottom: 30,
    borderRadius: 12,
  },
  
  securityTitle: {
    fontSize: 18,
    color: '#FFFFFF',
    fontFamily: 'Helvetica-Bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  
  securitySubtitle: {
    fontSize: 11,
    color: '#E0E7FF',
    textAlign: 'center',
    lineHeight: 1.4,
  },
  
  // Alertas de segurança
  warningBox: {
    backgroundColor: '#FEF2F2',
    borderLeftWidth: 4,
    borderLeftColor: '#DC2626',
    padding: 20,
    marginBottom: 25,
    borderRadius: 8,
  },
  
  warningTitle: {
    fontSize: 12,
    color: '#DC2626',
    fontFamily: 'Helvetica-Bold',
    marginBottom: 8,
  },
  
  warningText: {
    fontSize: 10,
    color: '#991B1B',
    lineHeight: 1.5,
  },
  
  // Seção da seed phrase
  seedSection: {
    marginBottom: 25,
  },
  
  sectionTitle: {
    fontSize: 14,
    color: '#1E293B',
    fontFamily: 'Helvetica-Bold',
    marginBottom: 15,
    paddingBottom: 8,
    borderBottomWidth: 2,
    borderBottomColor: '#4F46E5',
  },
  
  seedGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 15,
  },
  
  seedWordBox: {
    width: '33.33%',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  
  seedNumber: {
    fontSize: 9,
    color: '#64748B',
    fontFamily: 'Courier',
    width: 20,
  },
  
  seedWord: {
    fontSize: 10,
    color: '#1E293B',
    fontFamily: 'Helvetica-Bold',
  },
  
  // Seção da private key
  privateKeySection: {
    marginBottom: 20,
  },
  
  privateKeyBox: {
    backgroundColor: '#1E293B',
    borderRadius: 8,
    padding: 20,
  },
  
  privateKeyLabel: {
    fontSize: 10,
    color: '#94A3B8',
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  
  privateKeyText: {
    fontSize: 8,
    color: '#E2E8F0',
    fontFamily: 'Courier',
    lineHeight: 1.4,
    wordBreak: 'break-all',
  },
  
  // Final da página de segurança
  finalNotice: {
    backgroundColor: '#F0FDF4',
    padding: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    marginTop: 10,
  },
  
  finalNoticeText: {
    fontSize: 10,
    color: '#166534',
    textAlign: 'center',
    lineHeight: 1.4,
    fontFamily: 'Helvetica-Bold',
  },
  
  // Elementos decorativos
  decorativeLine: {
    height: 3,
    backgroundColor: '#4F46E5',
    marginVertical: 15,
    borderRadius: 2,
  },
  
  dotPattern: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginVertical: 10,
  },
  
  dot: {
    width: 4,
    height: 4,
    backgroundColor: '#CBD5E1',
    borderRadius: 2,
    marginHorizontal: 3,
  }
});

// --- COMPONENTES PERSONALIZADOS ---

const DotPattern = () => (
  <View style={styles.dotPattern}>
    {[...Array(20)].map((_, i) => (
      <View key={i} style={styles.dot} />
    ))}
  </View>
);

const DecorativeLine = () => (
  <View style={styles.decorativeLine} />
);

// --- COMPONENTE PRINCIPAL DO DOCUMENTO ---

export const TicketPDF = ({ ticketData, qrCodeImage }) => {
  const { eventName, eventDate, eventLocation, mintAddress, seedPhrase, privateKey } = ticketData;

  // Funções auxiliares para formatação
  const formatFullAddress = (location) => {
    if (!location || location.type !== 'Physical' || !location.address) { 
      return "Local a definir"; 
    }
    const { venueName, address } = location;
    const line1 = `${address.street}${address.number ? `, ${address.number}` : ''}`;
    const line2 = `${address.neighborhood ? `${address.neighborhood}, ` : ''}${address.city} - ${address.state}`;
    return `${venueName}\n${line1}\n${line2}`;
  };

  const formatDisplayDate = (dateString) => {
    if (!dateString) return 'Data a definir';
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const formatDisplayTime = (dateString) => {
    if (!dateString) return 'Horário a definir';
    return new Date(dateString).toLocaleTimeString('pt-BR', { 
      timeStyle: 'short', 
      timeZone: 'America/Sao_Paulo' 
    });
  };

  return (
    <Document style={styles.document} author="Ticketfy" title={`Ingresso - ${eventName}`}>
      {/* PÁGINA 1: INGRESSO PRINCIPAL */}
      <Page size="A5" style={styles.page}>
        {/* Header com gradiente */}
        <View style={styles.header}>
          <View style={styles.brandSection}>
            <View style={styles.brandLogo} />
            <Text style={styles.brandTitle}>TICKETFY</Text>
          </View>
          
          <Text style={styles.ticketType}>Ingresso Digital NFT</Text>
          <Text style={styles.eventName}>{eventName}</Text>
        </View>

        {/* Corpo do ingresso */}
        <View style={styles.ticketBody}>
          {/* Grid de informações */}
          <View style={styles.infoGrid}>
            <View style={styles.infoColumn}>
              <View style={styles.infoBlock}>
                <Text style={styles.infoLabel}>Data do Evento</Text>
                <Text style={styles.infoValue}>{formatDisplayDate(eventDate)}</Text>
              </View>
              
              <View style={styles.infoBlock}>
                <Text style={styles.infoLabel}>Localização</Text>
                <Text style={styles.infoValue}>{formatFullAddress(eventLocation)}</Text>
              </View>
            </View>
            
            <View style={styles.infoColumn}>
              <View style={styles.infoBlock}>
                <Text style={styles.infoLabel}>Horário</Text>
                <Text style={styles.infoValue}>{formatDisplayTime(eventDate)}</Text>
                <Text style={[styles.infoValue, { fontSize: 9, color: '#64748B' }]}>
                  (Horário de Brasília)
                </Text>
              </View>
              
              <View style={styles.infoBlock}>
                <Text style={styles.infoLabel}>Tipo de Ingresso</Text>
                <Text style={styles.infoValue}>NFT Digital • Único</Text>
              </View>
            </View>
          </View>

          <DotPattern />
          
          {/* Seção QR Code */}
          <View style={styles.qrSection}>
            <Text style={styles.qrLabel}>Código de Validação</Text>
            {qrCodeImage && <Image style={styles.qrCodeImage} src={qrCodeImage} />}
            <Text style={styles.mintAddress}>
              {mintAddress}
            </Text>
          </View>

          <DotPattern />

          {/* Informações adicionais */}
          <View style={styles.footer}>
            <Text style={styles.securityNotice}>
              Este ingresso é um token NFT único na blockchain Solana. 
              Apresente este QR code na entrada do evento.
            </Text>
            
            <Text style={styles.securityNotice}>
              Após o evento, seu certificado de participação estará disponível em:
            </Text>
            
            <Link 
              src={`https://ticketfy.app/certificate/${mintAddress}`} 
              style={styles.certificateLink}
            >
              ticketfy.app/certificate/{mintAddress?.slice(0, 8)}...
            </Link>
          </View>
        </View>
      </Page>

      {/* PÁGINA 2: INFORMAÇÕES DE SEGURANÇA (SE NECESSÁRIO) */}
      {seedPhrase && privateKey && (
        <Page size="A5" style={styles.securityPage}>
          {/* Header de segurança */}
          <View style={styles.securityHeader}>
            <Text style={styles.securityTitle}>Carteira Digital</Text>
            <Text style={styles.securitySubtitle}>
              Informações confidenciais para acesso à sua carteira blockchain
            </Text>
          </View>

          {/* Alerta de segurança */}
          <View style={styles.warningBox}>
            <Text style={styles.warningTitle}>⚠️ INFORMAÇÕES EXTREMAMENTE CONFIDENCIAIS</Text>
            <Text style={styles.warningText}>
              Estas chaves dão acesso total aos seus ativos digitais. Guarde esta página em local seguro e OFFLINE. 
              Nunca compartilhe, fotografe ou digitalize estas informações. A perda pode resultar em roubo irreversível.
            </Text>
          </View>

          {/* Seed Phrase */}
          <View style={styles.seedSection}>
            <Text style={styles.sectionTitle}>Frase de Recuperação (Seed Phrase)</Text>
            <View style={styles.seedGrid}>
              {seedPhrase.split(' ').map((word, index) => (
                <View key={index} style={styles.seedWordBox}>
                  <Text style={styles.seedNumber}>{index + 1}.</Text>
                  <Text style={styles.seedWord}>{word}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Private Key */}
          <View style={styles.privateKeySection}>
            <Text style={styles.sectionTitle}>Chave Privada</Text>
            <View style={styles.privateKeyBox}>
              <Text style={styles.privateKeyLabel}>Para importação em carteiras externas</Text>
              <Text style={styles.privateKeyText}>{privateKey}</Text>
            </View>
          </View>

          {/* Aviso final */}
          <View style={styles.finalNotice}>
            <Text style={styles.finalNoticeText}>
              ✅ Recomendamos guardar este documento em cofre físico. 
              Estas informações não podem ser recuperadas se perdidas.
            </Text>
          </View>
        </Page>
      )}
    </Document>
  );
};
