export const PageSkeleton = () => (
    <div className="animate-pulse">
        <div className="h-96 bg-slate-200"></div>
        <div className="container mx-auto px-4 py-12"><div className="grid grid-cols-1 lg:grid-cols-3 gap-12"><div className="lg:col-span-2 space-y-12"><div className="h-40 bg-slate-200 rounded-lg"></div><div className="h-24 bg-slate-200 rounded-lg"></div></div><div className="lg:col-span-1"><div className="h-96 bg-slate-200 rounded-lg"></div></div></div></div>
    </div>
);
