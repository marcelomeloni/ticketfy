import toast from 'react-hot-toast';

// Função para exportar os dados para um arquivo CSV
export const exportToCsv = (participants, eventName) => {
    if (!participants || participants.length === 0) {
        toast.error("Não há participantes para exportar.");
        return;
    }

    const headers = ["Nome", "Email", "Telefone", "Empresa", "Setor", "Cargo", "Carteira"];
    
    const rows = participants.map(p => [
        `"${p.name || ''}"`,
        `"${p.email || ''}"`,
        `"${p.phone || ''}"`,
        `"${p.company || ''}"`,
        `"${p.sector || ''}"`,
        `"${p.role || ''}"`,
        `"${p.wallet_address || ''}"`
    ].join(','));

    const csvContent = [
        headers.join(','),
        ...rows
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    const filename = `participantes_${eventName.replace(/\s+/g, '_')}.csv`;
    link.setAttribute("download", filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Download da planilha iniciado!");
};