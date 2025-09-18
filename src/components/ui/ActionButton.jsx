// Em: src/components/ui/ActionButton.jsx
export function ActionButton({ loading, children, ...props }) {
    return (
        <button {...props} disabled={loading} className={`w-full font-semibold py-2 px-4 rounded-lg disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors text-white bg-indigo-600 hover:bg-indigo-700 ${props.className}`}>
            {loading ? "Processando..." : children}
        </button>
    );
}