// Em: src/components/ui/InfoBox.jsx
export const InfoBox = ({ title, message, status = 'info' }) => (
    <div className={`text-center p-8 bg-white rounded-lg border ${status === 'error' ? 'border-red-200' : 'border-slate-200'} shadow-sm max-w-3xl mx-auto`}>
        <h2 className={`text-2xl font-bold ${status === 'error' ? 'text-red-600' : 'text-slate-800'}`}>{title}</h2>
        <p className="mt-2 text-slate-600">{message}</p>
    </div>
);