// Em: src/components/ui/AdminCard.jsx
export function AdminCard({ title, subtitle, children }) {
    return (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
            {subtitle && <p className="text-sm text-slate-500 mb-4">{subtitle}</p>}
            <div className="mt-6">{children}</div>
        </div>
    );
}