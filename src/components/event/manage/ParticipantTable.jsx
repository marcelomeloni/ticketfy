import { UserIcon } from '@heroicons/react/24/outline';

const TableRowSkeleton = () => (
    <tr className="animate-pulse">
        <td className="p-3"><div className="h-4 bg-slate-200 rounded w-3/4"></div></td>
        <td className="p-3"><div className="h-4 bg-slate-200 rounded w-full"></div></td>
        <td className="p-3 hidden md:table-cell"><div className="h-4 bg-slate-200 rounded w-full"></div></td>
        <td className="p-3 hidden lg:table-cell"><div className="h-4 bg-slate-200 rounded w-3/4"></div></td>
    </tr>
);

export const ParticipantTable = ({ participants, isLoading }) => {
    if (isLoading) {
        return (
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-slate-500">
                    <thead className="text-xs text-slate-700 uppercase bg-slate-100">
                        <tr>
                            <th scope="col" className="p-3">Participante</th>
                            <th scope="col" className="p-3">Email</th>
                            <th scope="col" className="p-3 hidden md:table-cell">Telefone</th>
                            <th scope="col" className="p-3 hidden lg:table-cell">Comprador</th>
                        </tr>
                    </thead>
                    <tbody>
                        {[...Array(5)].map((_, i) => <TableRowSkeleton key={i} />)}
                    </tbody>
                </table>
            </div>
        );
    }

    if (participants.length === 0) {
        return (
            <div className="text-center py-10 px-4 bg-slate-50 rounded-lg">
                <UserIcon className="mx-auto h-12 w-12 text-slate-400" />
                <h3 className="mt-2 text-sm font-semibold text-slate-900">Nenhum Participante Encontrado</h3>
                <p className="mt-1 text-sm text-slate-500">Ainda não há ingressos vendidos para este evento.</p>
            </div>
        );
    }

    return (
        <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm text-left text-slate-500">
                <thead className="text-xs text-slate-700 uppercase bg-slate-100">
                    <tr>
                        <th scope="col" className="p-3">Participante</th>
                        <th scope="col" className="p-3">Email</th>
                        <th scope="col" className="p-3 hidden md:table-cell">Telefone</th>
                        <th scope="col" className="p-3 hidden lg:table-cell">Comprador (Carteira)</th>
                    </tr>
                </thead>
                <tbody>
                    {participants.map((p) => (
                        <tr key={p.id} className="bg-white border-b hover:bg-slate-50">
                            <td className="p-3 font-medium text-slate-900">{p.participantDetails?.name || 'N/A'}</td>
                            <td className="p-3">{p.participantDetails?.email || 'N/A'}</td>
                            <td className="p-3 hidden md:table-cell">{p.participantDetails?.phone || 'N/A'}</td>
                            <td className="p-3 hidden lg:table-cell">
                                <span className="font-medium text-slate-700">{p.buyerProfile?.name || 'Desconhecido'}</span>
                                <span 
                                    className="block font-mono text-xs text-slate-500" 
                                    title={p.buyerProfile?.wallet_address}
                                >
                                    {p.buyerProfile?.wallet_address.slice(0, 6)}...{p.buyerProfile?.wallet_address.slice(-6)}
                                </span>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};