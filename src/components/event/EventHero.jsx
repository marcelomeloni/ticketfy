export const EventHero = ({ metadata }) => (
    <header className="relative bg-slate-800 h-96 flex items-center justify-center text-white overflow-hidden">
        <img src={metadata.image} alt={metadata.name} className="absolute top-0 left-0 w-full h-full object-cover opacity-30" />
        <div className="relative z-10 text-center p-4">
            <div className="flex justify-center items-center gap-3">
                <span className="bg-white/10 text-white text-xs font-semibold px-3 py-1 rounded-full">{metadata.category}</span>
                {metadata.tags?.map(tag => <span key={tag} className="bg-white/10 text-white text-xs font-semibold px-3 py-1 rounded-full">#{tag}</span>)}
            </div>
            <h1 className="text-4xl md:text-6xl font-extrabold mt-4 drop-shadow-lg">{metadata.name}</h1>
        </div>
    </header>
);