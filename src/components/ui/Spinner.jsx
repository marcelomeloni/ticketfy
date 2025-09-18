// Em: src/components/ui/Spinner.jsx

export function Spinner() {
    return (
        <div 
            className="animate-spin rounded-full h-12 w-12 border-b-2 border-t-2 border-indigo-500"
            role="status"
            aria-label="loading"
        >
            <span className="sr-only">Loading...</span>
        </div>
    );
}