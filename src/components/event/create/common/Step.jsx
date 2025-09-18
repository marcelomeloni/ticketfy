import { CheckCircleIcon } from '@heroicons/react/24/solid';

export const Step = ({ title, isActive, isComplete, disabled, children }) => (
    <div className={`p-6 border rounded-lg transition-all ${isActive ? 'border-indigo-500 bg-white' : 'border-slate-200 bg-slate-50'} ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
        <h3 className="font-semibold text-xl mb-1 flex items-center">
            {isComplete && <CheckCircleIcon className="h-6 w-6 text-green-500 mr-2" />}
            {title}
        </h3>
        {isActive && <div>{children}</div>}
    </div>
);