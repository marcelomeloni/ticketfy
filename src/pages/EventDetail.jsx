import { useState, useMemo, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useConnection } from '@solana/wallet-adapter-react';
import { Program, AnchorProvider } from '@coral-xyz/anchor';

import { useAppWallet } from '@/hooks/useAppWallet';
import { PurchaseCard } from '@/components/event/PurchaseCard';
import { EventHero } from '@/components/event/EventHero';
import { EventSections, EventDetailsSidebar } from '@/components/event/EventSections';
import { EventCard } from '@/components/event/EventCard';
import {useTicketCalculations} from '@/hooks/useTicketCalculations'
import { PROGRAM_ID, API_URL } from '@/lib/constants';
import idl from '@/idl/ticketing_system.json';
import { PageSkeleton } from '@/components/ui/PageSkeleton';

// Novos ícones para melhorar a UI
import {
  ShareIcon,
  HeartIcon,
  ArrowLeftIcon,
  ExclamationCircleIcon,
  CalendarIcon,
  MapPinIcon,
  UserGroupIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';

export function EventDetail() {
    const { eventAddress } = useParams();
    const { connection } = useConnection();
    const wallet = useAppWallet();

    const [eventData, setEventData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [relatedEvents, setRelatedEvents] = useState([]);
    const [isLiked, setIsLiked] = useState(false);
    const [activeTab, setActiveTab] = useState('details');
    const { totalTicketsSold, maxTotalSupply } = useTicketCalculations(eventData?.account);
    const program = useMemo(() => {
        const anchorWallet = (wallet.connected && wallet.publicKey) ? {
            publicKey: wallet.publicKey,
            signTransaction: wallet.signTransaction,
            signAllTransactions: wallet.signAllTransactions,
        } : {};
        const provider = new AnchorProvider(connection, anchorWallet, AnchorProvider.defaultOptions());
        return new Program(idl, PROGRAM_ID, provider);
    }, [connection, wallet]);


    const fetchEventDataFromFastAPI = useCallback(async () => {
        if (!eventAddress) return;

        setIsLoading(true);
        setError(null);
        try {
            console.log('🎯 Buscando dados do evento via API rápida...');
            
            const response = await fetch(`${API_URL}/api/events/${eventAddress}/fast`);
            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.error || "Falha ao buscar dados do evento.");
            }
            
            setEventData(data.event);
            console.log('✅ Dados do evento carregados via API rápida');

            // Buscar eventos relacionados
            await fetchRelatedEvents(data.event.metadata?.category);

        } catch (err) {
            console.error("Erro ao carregar dados do evento:", err);
            
            // Fallback para API antiga se necessário
            try {
                console.log('🔄 Tentando fallback para API completa...');
                const fallbackResponse = await fetch(`${API_URL}/api/events/${eventAddress}`);
                const fallbackData = await fallbackResponse.json();
                
                if (fallbackResponse.ok && fallbackData.success) {
                    setEventData(fallbackData.event);
                    console.log('✅ Dados carregados via fallback');
                } else {
                    throw new Error("Evento não encontrado");
                }
            } catch (fallbackError) {
                setError("Evento não encontrado ou indisponível.");
            }
        } finally {
            setIsLoading(false);
        }
    }, [eventAddress]);

    // Buscar eventos relacionados
    const fetchRelatedEvents = async (category) => {
        try {
            const response = await fetch(`${API_URL}/api/events/active/fast`);
            if (response.ok) {
                const events = await response.json();
                const related = events
                    .filter(event => 
                        event.metadata?.category === category && 
                        event.publicKey !== eventAddress
                    )
                    .slice(0, 4);
                setRelatedEvents(related);
            }
        } catch (error) {
            console.error("Erro ao buscar eventos relacionados:", error);
        }
    };

    useEffect(() => {
        fetchEventDataFromFastAPI();
    }, [fetchEventDataFromFastAPI]);

    // ✅ Atualização em segundo plano
    const refetchEventDataInBackground = useCallback(async () => {
        if (!eventAddress) return;
        try {
            const response = await fetch(`${API_URL}/api/events/${eventAddress}/fast`);
            const data = await response.json();
            if (response.ok && data.success) {
                setEventData(data.event);
                console.log("✅ Dados atualizados em segundo plano");
            }
        } catch (err) {
            console.error("Falha ao atualizar dados:", err);
        }
    }, [eventAddress]);

    // Funções de interação
    const handleLike = () => {
        setIsLiked(!isLiked);
        // TODO: Integrar com sistema de favoritos
    };

    const handleShare = async () => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: eventData?.metadata?.name,
                    text: eventData?.metadata?.description,
                    url: window.location.href,
                });
            } catch (error) {
                console.log('Erro ao compartilhar:', error);
            }
        } else {
            navigator.clipboard.writeText(window.location.href);
            // TODO: Mostrar toast de confirmação
        }
    };

    // Loading State Melhorado
    if (isLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
                <PageSkeleton />
            </div>
        );
    }

    // Error State Melhorado
    if (error) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center px-4">
                <div className="text-center max-w-md">
                    <div className="bg-white rounded-3xl shadow-xl p-8 border border-slate-200">
                        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <ExclamationCircleIcon className="h-10 w-10 text-red-500" />
                        </div>
                        <h1 className="text-2xl font-bold text-slate-900 mb-2">Evento Não Encontrado</h1>
                        <p className="text-slate-600 mb-6">{error}</p>
                        <div className="space-y-3">
                            <Link 
                                to="/events" 
                                className="block w-full bg-gradient-to-r from-cyan-500 to-fuchsia-600 text-white font-bold py-3 px-6 rounded-2xl hover:shadow-lg transition-all duration-300"
                            >
                                Explorar Outros Eventos
                            </Link>
                            <button 
                                onClick={fetchEventDataFromFastAPI}
                                className="block w-full bg-slate-100 text-slate-700 font-bold py-3 px-6 rounded-2xl hover:bg-slate-200 transition-all duration-300"
                            >
                                Tentar Novamente
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (!eventData) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="text-center">
                    <p className="text-slate-600">Nenhum dado de evento encontrado.</p>
                </div>
            </div>
        );
    }

    const { metadata, account: eventAccount } = eventData;
    console.log('🔍 DEBUG EventDetail - Dados do evento:', {
    eventData,
    totalTicketsSoldFromAccount: eventData?.account?.totalTicketsSold,
    tiers: eventData?.account?.tiers
});
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
            {/* Header de Navegação */}
            <nav className="bg-white/80 backdrop-blur-sm border-b border-slate-200 sticky top-0 z-50">
                <div className="container mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        <Link 
                            to="/events" 
                            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors font-semibold"
                        >
                            <ArrowLeftIcon className="h-5 w-5" />
                            Voltar para Eventos
                        </Link>
                        
                        <div className="flex items-center gap-3">
                            <button
                                onClick={handleLike}
                                className={`p-2 rounded-xl transition-all duration-300 ${
                                    isLiked 
                                        ? 'bg-red-100 text-red-500' 
                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                            >
                                <HeartIcon className={`h-5 w-5 ${isLiked ? 'fill-current' : ''}`} />
                            </button>
                            
                            <button
                                onClick={handleShare}
                                className="p-2 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-all duration-300"
                            >
                                <ShareIcon className="h-5 w-5" />
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Conteúdo Principal */}
            <EventHero metadata={metadata} />
            
            <main className="container mx-auto px-4 py-8">
                {/* Abas de Navegação */}
                <div className="mb-8">
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-2 inline-flex">
                        {['details', 'organizer'].map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`px-6 py-3 rounded-xl font-semibold transition-all duration-300 ${
                                    activeTab === tab
                                        ? 'bg-gradient-to-r from-cyan-500 to-fuchsia-600 text-white shadow-lg'
                                        : 'text-slate-600 hover:text-slate-900'
                                }`}
                            >
                                {tab === 'details' && 'Detalhes'}
                              
                                {tab === 'organizer' && 'Organizador'}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">
                    {/* Conteúdo Principal */}
                    <div className="lg:col-span-2">
                        <div className="space-y-8">
                            {/* Cartão de Informações Rápidas */}
                            <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-6">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div className="text-center p-4 bg-blue-50 rounded-2xl">
                                        <CalendarIcon className="h-6 w-6 text-blue-500 mx-auto mb-2" />
                                        <p className="text-sm text-slate-600">Data</p>
                                        <p className="font-bold text-slate-900">
                                            {new Date(metadata.properties?.dateTime?.start).toLocaleDateString('pt-BR')}
                                        </p>
                                    </div>
                                    <div className="text-center p-4 bg-green-50 rounded-2xl">
                                        <MapPinIcon className="h-6 w-6 text-green-500 mx-auto mb-2" />
                                        <p className="text-sm text-slate-600">Local</p>
                                        <p className="font-bold text-slate-900">
                                            {metadata.properties?.location?.venueName || 'Online'}
                                        </p>
                                    </div>
                                <div className="text-center p-4 bg-purple-50 rounded-2xl">
    <UserGroupIcon className="h-6 w-6 text-purple-500 mx-auto mb-2" />
    <p className="text-sm text-slate-600">Ingressos</p>
    <p className="font-bold text-slate-900">
        {totalTicketsSold} / {maxTotalSupply} vendidos
    </p>
</div>
                                    <div className="text-center p-4 bg-orange-50 rounded-2xl">
                                        <SparklesIcon className="h-6 w-6 text-orange-500 mx-auto mb-2" />
                                        <p className="text-sm text-slate-600">Categoria</p>
                                        <p className="font-bold text-slate-900">
                                            {metadata.category || 'Geral'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Conteúdo Baseado na Aba Selecionada */}
                            {activeTab === 'details' && (
                                <EventSections metadata={metadata} />
                            )}
                            
                          
                            
                            {activeTab === 'organizer' && metadata.organizer && (
                                <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-8">
                                    <h3 className="text-2xl font-bold text-slate-900 mb-6">Sobre o Organizador</h3>
                                    {/* Aqui viria o componente do organizador */}
                                    <div className="flex items-center gap-4">
                                        <div className="w-16 h-16 bg-gradient-to-br from-cyan-500 to-fuchsia-600 rounded-2xl flex items-center justify-center">
                                            <span className="text-white font-bold text-lg">
                                                {metadata.organizer.name?.charAt(0) || 'O'}
                                            </span>
                                        </div>
                                        <div>
                                            <h4 className="text-xl font-bold text-slate-900">{metadata.organizer.name}</h4>
                                            <p className="text-slate-600">Organizador do evento</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Eventos Relacionados */}
                            {relatedEvents.length > 0 && (
                                <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-8">
                                    <h3 className="text-2xl font-bold text-slate-900 mb-6">
                                        Eventos Relacionados
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {relatedEvents.map(event => (
                                            <EventCard key={event.publicKey} event={event} />
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Sidebar */}
                    <aside className="lg:col-span-1">
                        <div className="sticky top-24 space-y-8">
                            <PurchaseCard
                                metadata={metadata}
                                eventAccount={eventAccount} 
                                eventAddress={eventAddress} 
                                onPurchaseSuccess={refetchEventDataInBackground} 
                            />
                            <EventDetailsSidebar metadata={metadata} />
                        </div>
                    </aside>
                </div>
            </main>
        </div>
    );
}