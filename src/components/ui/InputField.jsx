// Em: src/components/ui/InputField.jsx

export const InputField = ({ label, as: Component = 'input', helperText, ...props }) => (
    <div className="w-full">
        <label htmlFor={props.id || props.name} className="block text-sm font-medium text-slate-600 mb-1">{label}</label>
        <Component
            {...props}
            className="w-full bg-slate-50 border border-slate-300 rounded-md shadow-sm text-slate-800 p-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition disabled:opacity-50"
        />
        {helperText && (
            <p className="mt-1 text-xs text-slate-500">{helperText}</p>
        )}
    </div>
);