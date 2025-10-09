import {
    CalendarDaysIcon, 
    MapPinIcon, 
    ClockIcon, 
    UserCircleIcon,
    InformationCircleIcon, 
    SparklesIcon,
    BuildingOffice2Icon, 
    MapIcon, 
    EnvelopeIcon,
    GlobeAltIcon,
    VideoCameraIcon,
    PlayIcon,
    TicketIcon,
    XCircleIcon,
    ExclamationTriangleIcon,
    ArrowLeftIcon
} from '@heroicons/react/24/outline';

import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

import L from 'leaflet';
import markerIconPng from "leaflet/dist/images/marker-icon.png";
import markerShadowPng from "leaflet/dist/images/marker-shadow.png";
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'; 

delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({
    iconUrl: markerIconPng,
    shadowUrl: markerShadowPng,
    iconRetinaUrl: markerIcon2x, 
});

// ✅ COMPONENTE SECTION BASE
const Section = ({ title, icon: Icon, children, className = "" }) => (
    <section className={`bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden ${className}`}>
        <div className="bg-gradient-to-r from-slate-50 to-white p-8 border-b border-slate-100">
            <h2 className="text-3xl font-bold text-slate-900 flex items-center">
                <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl mr-4 shadow-lg">
                    <Icon className="h-7 w-7 text-white" />
                </div>
                {title}
            </h2>
        </div>
        <div className="p-8">
            {children}
        </div>
    </section>
);

// 📝 Seção de Descrição Atualizada COM VALIDAÇÃO
const DescriptionSection = ({ description }) => {
    console.log('[DescriptionSection] Props recebidas:', { description });
    
    if (!description) {
        console.warn('[DescriptionSection] Descrição não disponível');
        return (
            <Section title="Sobre o Evento" icon={InformationCircleIcon}>
                <div className="text-center text-slate-500 py-8">
                    <p>Descrição do evento não disponível.</p>
                </div>
            </Section>
        );
    }

    return (
        <Section title="Sobre o Evento" icon={InformationCircleIcon}>
            <div className="prose prose-lg max-w-none text-slate-700 leading-relaxed">
                <p className="whitespace-pre-wrap text-lg leading-8">{description}</p>
            </div>
        </Section>
    );
};

// 👤 Seção do Organizador CORRIGIDA COM VALIDAÇÃO ROBUSTA
const OrganizerSection = ({ organizer }) => {
    console.log('[OrganizerSection] Organizador recebido:', organizer);
    
    // ✅ VALIDAÇÃO COMPLETA DO ORGANIZADOR
    if (!organizer) {
        console.warn('[OrganizerSection] Organizador é undefined ou null');
        return null;
    }

    // ✅ EXTRAÇÃO SEGURA COM VALORES PADRÃO
    const {
        name = 'Organizador',
        website,
        organizerLogo,
        contactEmail
    } = organizer;

    console.log('[OrganizerSection] Dados extraídos:', { name, website, hasLogo: !!organizerLogo });

    return (
        <Section title="Organizado por" icon={UserCircleIcon}>
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                        {/* ✅ LÓGICA CONDICIONAL ROBUSTA */}
                        <div className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg overflow-hidden flex-shrink-0 border border-slate-200 bg-white">
                            {organizerLogo ? (
                                <img
                                    src={organizerLogo}
                                    alt={`Logo de ${name}`}
                                    className="w-full h-full object-contain p-1"
                                    onError={(e) => {
                                        console.warn('[OrganizerSection] Erro ao carregar logo do organizador');
                                        e.target.style.display = 'none';
                                    }}
                                />
                            ) : null}
                            {/* ✅ SEMPRE MOSTRA O ÍCONE COMO FALLBACK */}
                            <UserCircleIcon className={`h-8 w-8 text-blue-500 ${organizerLogo ? 'hidden' : 'block'}`} />
                        </div>

                        <div>
                            <h3 className="text-xl font-bold text-slate-900">{name}</h3>
                            <p className="text-slate-600 mt-1">Organizador do Evento</p>
                            {contactEmail && (
                                <p className="text-slate-500 text-sm mt-1 flex items-center gap-1">
                                    <EnvelopeIcon className="h-4 w-4" />
                                    {contactEmail}
                                </p>
                            )}
                        </div>
                    </div>
                    {website && (
                        <a 
                            href={website.startsWith('http') ? website : `https://${website}`}
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center justify-center w-full sm:w-auto gap-2 px-6 py-3 bg-white text-slate-800 rounded-xl font-semibold shadow-md hover:shadow-lg transition-all duration-300 hover:scale-105 border border-slate-200"
                        >
                            <GlobeAltIcon className="h-5 w-5" />
                            Visitar Website
                        </a>
                    )}
                </div>
            </div>
        </Section>
    );
};

// 🗺️ Seção de Localização Premium CORRIGIDA
const LocationSection = ({ location }) => {
    console.log('[LocationSection] Location recebida:', location);
    
    // ✅ VALIDAÇÃO ROBUSTA DA LOCALIZAÇÃO
    if (!location) {
        console.warn('[LocationSection] Location é undefined ou null');
        return null;
    }

    const { type, onlineUrl, address, coordinates, venueName } = location;

    // ✅ EVENTO ONLINE
    if (type !== 'Physical' || !address) {
        console.log('[LocationSection] Evento online ou sem endereço físico');
        return onlineUrl ? (
            <Section title="Localização" icon={MapPinIcon}>
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-8 text-center border border-green-100">
                    <VideoCameraIcon className="h-16 w-16 text-green-500 mx-auto mb-4" />
                    <h3 className="text-2xl font-bold text-slate-900 mb-2">Evento Online</h3>
                    <p className="text-slate-600 mb-6">Participe de qualquer lugar do mundo</p>
                    <a 
                        href={onlineUrl.startsWith('http') ? onlineUrl : `https://${onlineUrl}`}
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-bold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
                    >
                        <PlayIcon className="h-5 w-5" />
                        Acessar Evento Online
                    </a>
                </div>
            </Section>
        ) : null;
    }

    // ✅ EVENTO FÍSICO
    console.log('[LocationSection] Processando evento físico:', { venueName, address, coordinates });

    const hasCoordinates = coordinates && 
                          coordinates.latitude && 
                          coordinates.longitude &&
                          !isNaN(parseFloat(coordinates.latitude)) && 
                          !isNaN(parseFloat(coordinates.longitude));

    const addressLine1 = `${address.street || ''}${address.number ? `, ${address.number}` : ''}`.trim();
    const addressLine2 = `${address.neighborhood ? `${address.neighborhood}, ` : ''}${address.city || ''}${address.state ? ` - ${address.state}` : ''}`.trim();
    
    const googleMapsUrl = hasCoordinates 
        ? `https://www.google.com/maps/dir/?api=1&destination=${coordinates.latitude},${coordinates.longitude}`
        : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((venueName || '') + ' ' + addressLine1 + ' ' + addressLine2)}`;

    console.log('[LocationSection] URLs geradas:', { hasCoordinates, googleMapsUrl });

    return (
        <Section title="Localização" icon={MapPinIcon}>
            <div className={hasCoordinates ? "grid grid-cols-1 xl:grid-cols-2 gap-8 items-start" : "space-y-6"}>
                {/* Informações do Local */}
                <div className="space-y-6">
                    <div>
                        <h3 className="text-2xl font-bold text-slate-900 mb-4">{venueName || 'Local do Evento'}</h3>
                        
                        <div className="space-y-4">
                            <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-2xl">
                                <MapIcon className="h-6 w-6 text-blue-500 mt-1 flex-shrink-0" />
                                <div>
                                    <p className="font-semibold text-slate-800">Endereço</p>
                                    {addressLine1 && <p className="text-slate-600">{addressLine1}</p>}
                                    {addressLine2 && <p className="text-slate-600">{addressLine2}</p>}
                                    {address.zipCode && (
                                        <p className="text-slate-500 text-sm mt-1">CEP: {address.zipCode}</p>
                                    )}
                                    {address.country && address.country !== 'BR' && (
                                        <p className="text-slate-500 text-sm mt-1">País: {address.country}</p>
                                    )}
                                </div>
                            </div>
                            
                            {/* Aviso sobre falta de coordenadas */}
                            {!hasCoordinates && (
                                <div className="flex items-start gap-4 p-4 bg-amber-50 rounded-2xl border border-amber-200">
                                    <ExclamationTriangleIcon className="h-6 w-6 text-amber-500 mt-1 flex-shrink-0" />
                                    <div>
                                        <p className="font-semibold text-amber-800">Localização aproximada</p>
                                        <p className="text-amber-600 text-sm">
                                            O mapa não está disponível, mas você pode ver a localização no Google Maps.
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <a 
                        href={googleMapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center gap-3 w-full px-6 py-4 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-2xl font-bold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
                    >
                        <MapIcon className="h-5 w-5" />
                        {hasCoordinates ? 'Ver no Mapa e Traçar Rota' : 'Ver Localização no Google Maps'}
                    </a>
                </div>

                {/* Mapa - APENAS SE HOUVER COORDENADAS VÁLIDAS */}
                {hasCoordinates && (
                    <div className="relative leaflet-map-container h-96 rounded-2xl overflow-hidden shadow-lg border border-slate-200">
                        <MapContainer 
                            center={[parseFloat(coordinates.latitude), parseFloat(coordinates.longitude)]} 
                            zoom={16} 
                            scrollWheelZoom={false} 
                            style={{ height: '100%', width: '100%' }}
                            className="rounded-2xl"
                        >
                            <TileLayer
                                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            />
                            <Marker position={[parseFloat(coordinates.latitude), parseFloat(coordinates.longitude)]}>
                                <Popup className="custom-popup">
                                    <div className="font-semibold text-slate-900">{venueName || 'Local do Evento'}</div>
                                    {addressLine1 && <div className="text-slate-600">{addressLine1}</div>}
                                    {addressLine2 && <div className="text-slate-600">{addressLine2}</div>}
                                </Popup>
                            </Marker>
                        </MapContainer>
                    </div>
                )}
            </div>
        </Section>
    );
};

// 📋 Componente de Detalhes do Evento CORRIGIDO
const DetailItem = ({ icon: Icon, label, text, className = "" }) => (
    <div className={`flex items-start gap-4 p-4 bg-slate-50 rounded-2xl hover:bg-slate-100 transition-colors ${className}`}>
        <div className="p-3 bg-white rounded-xl shadow-sm border border-slate-200">
            <Icon className="h-6 w-6 text-blue-500" />
        </div>
        <div className="flex-1">
            <p className="text-sm font-semibold text-slate-500 uppercase tracking-wide">{label}</p>
            <p className="text-lg font-semibold text-slate-800 mt-1">{text || 'Não informado'}</p>
        </div>
    </div>
);

// 📋 Seção de Detalhes CORRIGIDA
const DetailsSection = ({ metadata }) => {
    console.log('[DetailsSection] Metadata recebida:', metadata);
    
    // ✅ VALIDAÇÃO COMPLETA DOS DADOS
    if (!metadata) {
        console.warn('[DetailsSection] Metadata é undefined ou null');
        return (
            <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-8">
                <h3 className="text-2xl font-bold text-slate-900 mb-6">Detalhes do Evento</h3>
                <p className="text-slate-500 text-center">Detalhes não disponíveis</p>
            </div>
        );
    }

    const { 
        organizer = {}, 
        additionalInfo = {}, 
        properties = {} 
    } = metadata;

    const { dateTime } = properties;
    
    // ✅ VALIDAÇÃO E FORMATAÇÃO SEGURA DA DATA
    let datePart = 'Data não definida';
    let timePart = 'Horário não definido';
    
    if (dateTime?.start) {
        try {
            const startDate = new Date(dateTime.start);
            if (!isNaN(startDate.getTime())) {
                datePart = startDate.toLocaleDateString('pt-BR', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric',
                    timeZone: dateTime.timezone || 'America/Sao_Paulo'
                });
                timePart = startDate.toLocaleTimeString('pt-BR', { 
                    timeStyle: 'short', 
                    timeZone: dateTime.timezone || 'America/Sao_Paulo'
                });
            }
        } catch (error) {
            console.error('[DetailsSection] Erro ao formatar data:', error);
        }
    } else {
        console.warn('[DetailsSection] Data de início não disponível');
    }

    console.log('[DetailsSection] Dados processados:', { datePart, timePart, organizer: organizer.name });

    return (
        <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-8">
            <h3 className="text-2xl font-bold text-slate-900 mb-6">Detalhes do Evento</h3>
            <div className="space-y-4">
                <DetailItem 
                    icon={CalendarDaysIcon} 
                    label="Data" 
                    text={datePart} 
                />
                <DetailItem 
                    icon={ClockIcon} 
                    label="Horário" 
                    text={`${timePart} (Horário de Brasília)`} 
                />
                <DetailItem 
                    icon={UserCircleIcon} 
                    label="Organizador" 
                    text={organizer.name || 'Não informado'} 
                />
                <DetailItem 
                    icon={SparklesIcon} 
                    label="Classificação Etária" 
                    text={additionalInfo.ageRestriction || 'Livre'} 
                />
            </div>
        </div>
    );
};

// ✅ COMPONENTE PRINCIPAL EVENT SECTIONS CORRIGIDO
export const EventSections = ({ metadata }) => {
    console.log('[EventSections] Metadata recebida:', metadata);
    
    // ✅ VALIDAÇÃO ROBUSTA DO METADATA
    if (!metadata) {
        console.warn('[EventSections] Metadata é undefined ou null');
        return (
            <div className="space-y-8">
                <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-8 text-center">
                    <p className="text-slate-600">Carregando informações do evento...</p>
                </div>
            </div>
        );
    }

    // ✅ EXTRAÇÃO SEGURA DOS DADOS
    const {
        description,
        organizer,
        properties = {}
    } = metadata;

    const location = properties?.location;

    console.log('[EventSections] Dados extraídos:', {
        hasDescription: !!description,
        hasOrganizer: !!organizer,
        hasLocation: !!location
    });

    return (
        <div className="space-y-8">
            {description && <DescriptionSection description={description} />}
            {organizer && <OrganizerSection organizer={organizer} />}
            {location && <LocationSection location={location} />}
        </div>
    );
};

// ✅ COMPONENTE EVENT DETAILS SIDEBAR CORRIGIDO
export const EventDetailsSidebar = ({ metadata }) => {
    console.log('[EventDetailsSidebar] Metadata recebida:', metadata);
    
    if (!metadata) {
        console.warn('[EventDetailsSidebar] Metadata é undefined ou null');
        return null;
    }
    
    return <DetailsSection metadata={metadata} />;
};