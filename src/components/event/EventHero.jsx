import {
    CalendarDaysIcon, 
    MapPinIcon, 
} from '@heroicons/react/24/outline';

export const EventHero = ({ metadata }) => (
    // 1. O container principal com um gradiente de fallback e posicionamento relativo
    <header className="relative bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 min-h-[70vh] flex items-center justify-center text-white overflow-hidden">
        
        {/* ✅ 2. Imagem de fundo com opacidade aumentada e desfoque mantido */}
        <img 
            src={metadata.image} 
            alt={metadata.name} 
            className="absolute top-0 left-0 w-full h-full object-cover z-0 opacity-40 " 
        />
        
        {/* ✅ 3. Múltiplas camadas de overlay, agora mais suaves */}
        {/* Overlay escuro geral (mais suave) */}
        <div className="absolute inset-0 bg-black/20 z-1"></div>
        {/* Overlay em gradiente (mais suave no centro) */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/70 via-black/20 to-slate-900/60 z-1"></div>
        
        {/* Conteúdo textual, posicionado acima dos overlays */}
        <div className="relative z-20 text-center p-8 max-w-6xl mx-auto">
            {/* Categoria e Tags */}
            <div className="flex flex-wrap justify-center items-center gap-3 mb-6">
                <span className="bg-white/20 backdrop-blur-sm text-white text-sm font-semibold px-4 py-2 rounded-full border border-white/30 shadow-lg">
                    {metadata.category}
                </span>
                {metadata.tags?.slice(0, 3).map(tag => (
                    <span 
                        key={tag} 
                        className="bg-white/10 backdrop-blur-sm text-white/90 text-xs font-medium px-3 py-1.5 rounded-full border border-white/20 shadow-md"
                    >
                        #{tag}
                    </span>
                ))}
            </div>
            
            {/* Título Principal com sombra de texto forte para garantir legibilidade */}
            <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight" style={{ textShadow: '0 4px 20px rgba(0, 0, 0, 0.6)' }}>
                {metadata.name}
            </h1>
            
            {/* Descrição com sombra de texto */}
            <p className="text-xl md:text-2xl text-white/90 max-w-3xl mx-auto leading-relaxed" style={{ textShadow: '0 2px 10px rgba(0, 0, 0, 0.7)' }}>
                {metadata.description}
            </p>
            
            {/* Informações rápidas com sombra de texto */}
            <div className="flex flex-wrap justify-center items-center gap-6 mt-8 text-white/90" style={{ textShadow: '0 1px 5px rgba(0, 0, 0, 0.7)' }}>
                <div className="flex items-center gap-2">
                    <CalendarDaysIcon className="h-5 w-5" />
                    <span className="font-medium">
                        {new Date(metadata.properties.dateTime.start).toLocaleDateString('pt-BR', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric'
                        })}
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <MapPinIcon className="h-5 w-5" />
                    <span className="font-medium">
                        {metadata.properties.location.venueName || 'Online'}
                    </span>
                </div>
            </div>
        </div>
    </header>
);

