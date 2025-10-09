import {
    CalendarDaysIcon, 
    MapPinIcon, 
} from '@heroicons/react/24/outline';

export const EventHero = ({ metadata }) => {
    // ✅ VALIDAÇÃO E FALLBACKS ROBUSTOS
    if (!metadata) {
        return (
            <header className="relative bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 min-h-[70vh] flex items-center justify-center text-white overflow-hidden">
                <div className="relative z-20 text-center p-8 max-w-6xl mx-auto">
                    <div className="animate-pulse">
                        <div className="h-8 bg-white/20 rounded-full w-48 mx-auto mb-6"></div>
                        <div className="h-16 bg-white/20 rounded-lg w-3/4 mx-auto mb-6"></div>
                        <div className="h-6 bg-white/20 rounded w-1/2 mx-auto"></div>
                    </div>
                </div>
            </header>
        );
    }

    // ✅ EXTRAÇÃO SEGURA DOS DADOS
    const {
        name = 'Evento sem nome',
        description = 'Descrição não disponível',
        category = 'Evento',
        tags = [],
        image,
        properties = {}
    } = metadata;

    const {
        dateTime = {},
        location = {}
    } = properties;

    // ✅ FORMATAÇÃO SEGURA DA DATA
    const formatEventDate = () => {
        if (!dateTime.start) return 'Data a definir';
        
        try {
            return new Date(dateTime.start).toLocaleDateString('pt-BR', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
            });
        } catch (error) {
            console.warn('Erro ao formatar data:', error);
            return 'Data inválida';
        }
    };

    // ✅ FORMATAÇÃO SEGURA DA LOCALIZAÇÃO
    const formatEventLocation = () => {
        return location.venueName || location.address?.city || 'Online';
    };

    // ✅ VALIDAÇÃO DA IMAGEM
    const backgroundImage = image || 'https://red-obedient-stingray-854.mypinata.cloud/ipfs/QmZDu6Ex1XXcYjnhikLYLUxDJtueSSHUre74cqmBxsFJBR';

    return (
        // 1. O container principal com um gradiente de fallback e posicionamento relativo
        <header className="relative bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 min-h-[70vh] flex items-center justify-center text-white overflow-hidden">
            
            {/* ✅ 2. Imagem de fundo com fallback */}
            <img 
                src={backgroundImage} 
                alt={name} 
                className="absolute top-0 left-0 w-full h-full object-cover z-0 opacity-40" 
                onError={(e) => {
                    e.target.src = 'https://red-obedient-stingray-854.mypinata.cloud/ipfs/QmZDu6Ex1XXcYjnhikLYLUxDJtueSSHUre74cqmBxsFJBR';
                }}
            />
            
            {/* ✅ 3. Múltiplas camadas de overlay */}
            <div className="absolute inset-0 bg-black/20 z-1"></div>
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/70 via-black/20 to-slate-900/60 z-1"></div>
            
            {/* Conteúdo textual, posicionado acima dos overlays */}
            <div className="relative z-20 text-center p-8 max-w-6xl mx-auto">
                {/* Categoria e Tags */}
                <div className="flex flex-wrap justify-center items-center gap-3 mb-6">
                    <span className="bg-white/20 backdrop-blur-sm text-white text-sm font-semibold px-4 py-2 rounded-full border border-white/30 shadow-lg">
                        {category}
                    </span>
                    {tags.slice(0, 3).map(tag => (
                        <span 
                            key={tag} 
                            className="bg-white/10 backdrop-blur-sm text-white/90 text-xs font-medium px-3 py-1.5 rounded-full border border-white/20 shadow-md"
                        >
                            #{tag}
                        </span>
                    ))}
                </div>
                
                {/* Título Principal */}
                <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight" style={{ textShadow: '0 4px 20px rgba(0, 0, 0, 0.6)' }}>
                    {name}
                </h1>
                
                {/* Descrição */}
                <p className="text-xl md:text-2xl text-white/90 max-w-3xl mx-auto leading-relaxed" style={{ textShadow: '0 2px 10px rgba(0, 0, 0, 0.7)' }}>
                    {description}
                </p>
                
                {/* Informações rápidas */}
                <div className="flex flex-wrap justify-center items-center gap-6 mt-8 text-white/90" style={{ textShadow: '0 1px 5px rgba(0, 0, 0, 0.7)' }}>
                    <div className="flex items-center gap-2">
                        <CalendarDaysIcon className="h-5 w-5" />
                        <span className="font-medium">
                            {formatEventDate()}
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <MapPinIcon className="h-5 w-5" />
                        <span className="font-medium">
                            {formatEventLocation()}
                        </span>
                    </div>
                </div>
            </div>
        </header>
    );
};