import toast from 'react-hot-toast';

/**
 * Converte um array de objetos em uma string no formato CSV.
 * @param {Array<Object>} data O array de dados a ser convertido.
 * @returns {string} Uma string formatada como CSV.
 */
function convertToCsv(data) {
    if (!data || data.length === 0) {
        return "";
    }

    // Pega os cabeçalhos do primeiro objeto de dados
    const headers = Object.keys(data[0]);
    const csvRows = [];

    // Adiciona a linha de cabeçalho ao CSV
    csvRows.push(headers.join(','));

    // Itera sobre cada linha de dados
    for (const row of data) {
        const values = headers.map(header => {
            const rawValue = row[header];
            // Garante que o valor seja uma string e escapa aspas duplas internas
            const escaped = ('' + (rawValue ?? '')).replace(/"/g, '""');
            return `"${escaped}"`; // Envolve todos os campos com aspas para segurança
        });
        csvRows.push(values.join(','));
    }

    return csvRows.join('\n');
}

/**
 * Inicia o download de um arquivo CSV a partir de um array de objetos.
 * Esta função agora espera os dados já formatados e "achatados".
 * @param {Array<Object>} dataToExport O array de objetos prontos para exportação.
 * @param {string} filename O nome do arquivo a ser baixado (sem a extensão .csv).
 */
export function exportToCsv(dataToExport, filename = 'export') {
    if (!dataToExport || dataToExport.length === 0) {
        console.error("Exportação cancelada: não há dados para exportar.");
        toast.error("Não há participantes para exportar.");
        return;
    }

    try {
        const csvString = convertToCsv(dataToExport);
        const blob = new Blob([`\uFEFF${csvString}`], { type: 'text/csv;charset=utf-8;' }); // Adiciona BOM para compatibilidade com Excel
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");

        link.setAttribute("href", url);
        const finalFilename = `${filename.replace(/\s+/g, '_')}.csv`;
        link.setAttribute("download", finalFilename);
        link.style.visibility = 'hidden';

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        URL.revokeObjectURL(url);
        toast.success("Download da planilha iniciado!");
    } catch (error) {
        console.error("Falha ao exportar para CSV:", error);
        toast.error("Ocorreu um erro ao gerar o arquivo.");
    }
}