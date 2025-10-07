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

// 📝 Seção de Descrição Atualizada
const DescriptionSection = ({ description }) => (
    <Section title="Sobre o Evento" icon={InformationCircleIcon}>
        <div className="prose prose-lg max-w-none text-slate-700 leading-relaxed">
            <p className="whitespace-pre-wrap text-lg leading-8">{description}</p>
        </div>
    </Section>
);

// 👤 Seção do Organizador Melhorada
const OrganizerSection = ({ organizer }) => (
    <Section title="Organizado por" icon={UserCircleIcon}>
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                    
                    {/* ✅ LÓGICA CONDICIONAL PARA O LOGO/ÍCONE */}
                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg overflow-hidden flex-shrink-0 
                                     border border-slate-200"> {/* Alterado para fundo branco e borda */}
                        {organizer && organizer.organizerLogo ? (
                            // Caso 1: Se o logo do organizador existir, exibe a imagem
                            <img
                                src={organizer.organizerLogo}
                                alt={`Logo de ${organizer.name}`}
                                // ✅ Alterado para 'object-contain' para mostrar a imagem toda, sem cortes
                                // Adicionado 'p-1' para um pequeno padding e não colar nas bordas
                                className="w-full h-full object-contain p-1" 
                            />
                        ) : (
                            // Caso 2 (Fallback): Se não houver logo, exibe o ícone genérico, agora em azul para contraste
                            <UserCircleIcon className="h-8 w-8 text-blue-500" /> 
                        )}
                    </div>

                    <div>
                        <h3 className="text-xl font-bold text-slate-900">{organizer.name}</h3>
                        <p className="text-slate-600 mt-1">Organizador do Evento</p>
                    </div>
                </div>
                {organizer.website && (
                    <a 
                        href={organizer.website} 
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

// 🗺️ Seção de Localização Premium
// 🗺️ Seção de Localização Premium - MODIFICADA
const LocationSection = ({ location }) => {
    if (location?.type !== 'Physical' || !location?.address) {
        return location?.onlineUrl ? (
            <Section title="Localização" icon={MapPinIcon}>
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-8 text-center border border-green-100">
                    <VideoCameraIcon className="h-16 w-16 text-green-500 mx-auto mb-4" />
                    <h3 className="text-2xl font-bold text-slate-900 mb-2">Evento Online</h3>
                    <p className="text-slate-600 mb-6">Participe de qualquer lugar do mundo</p>
                    <a 
                        href={location.onlineUrl} 
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

    const { address, coordinates, venueName } = location;
    const hasCoordinates = coordinates && 
                          coordinates.latitude && 
                          coordinates.longitude &&
                          !isNaN(parseFloat(coordinates.latitude)) && 
                          !isNaN(parseFloat(coordinates.longitude));

    const addressLine1 = `${address.street}${address.number ? `, ${address.number}` : ''}`;
    const addressLine2 = `${address.neighborhood ? `${address.neighborhood}, ` : ''}${address.city} - ${address.state}`;
    const googleMapsUrl = hasCoordinates 
        ? `https://www.google.com/maps/dir/?api=1&destination=${coordinates.latitude},${coordinates.longitude}`
        : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addressLine1 + ' ' + addressLine2)}`;

    return (
        <Section title="Localização" icon={MapPinIcon}>
            <div className={hasCoordinates ? "grid grid-cols-1 xl:grid-cols-2 gap-8 items-start" : "space-y-6"}>
                {/* Informações do Local */}
                <div className="space-y-6">
                    <div>
                        <h3 className="text-2xl font-bold text-slate-900 mb-4">{venueName}</h3>
                        
                        <div className="space-y-4">
                            <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-2xl">
                                <MapIcon className="h-6 w-6 text-blue-500 mt-1 flex-shrink-0" />
                                <div>
                                    <p className="font-semibold text-slate-800">Endereço</p>
                                    <p className="text-slate-600">{addressLine1}</p>
                                    <p className="text-slate-600">{addressLine2}</p>
                                    {address.zipCode && (
                                        <p className="text-slate-500 text-sm mt-1">CEP: {address.zipCode}</p>
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

                {/* Mapa - APENAS SE HOUVER COORDENADAS */}
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
                                    <div className="font-semibold text-slate-900">{venueName}</div>
                                    <div className="text-slate-600">{addressLine1}</div>
                                    <div className="text-slate-600">{addressLine2}</div>
                                </Popup>
                            </Marker>
                        </MapContainer>
                    </div>
                )}
            </div>
        </Section>
    );
};

// 📋 Componente de Detalhes do Evento
const DetailItem = ({ icon: Icon, label, text, className = "" }) => (
    <div className={`flex items-start gap-4 p-4 bg-slate-50 rounded-2xl hover:bg-slate-100 transition-colors ${className}`}>
        <div className="p-3 bg-white rounded-xl shadow-sm border border-slate-200">
            <Icon className="h-6 w-6 text-blue-500" />
        </div>
        <div className="flex-1">
            <p className="text-sm font-semibold text-slate-500 uppercase tracking-wide">{label}</p>
            <p className="text-lg font-semibold text-slate-800 mt-1">{text}</p>
        </div>
    </div>
);


const DetailsSection = ({ metadata }) => {
    const { organizer, additionalInfo, properties } = metadata;
    if (!properties?.dateTime) return null;
    
    const startDate = new Date(properties.dateTime.start);
    const datePart = startDate.toLocaleDateString('pt-BR', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        timeZone: properties.dateTime.timezone 
    });
    const timePart = startDate.toLocaleTimeString('pt-BR', { 
        timeStyle: 'short', 
        timeZone: properties.dateTime.timezone 
    });

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
                    text={organizer.name} 
                />
                <DetailItem 
                    icon={SparklesIcon} 
                    label="Classificação Etária" 
                    text={additionalInfo.ageRestriction} 
                />
            </div>
        </div>
    );
};

export const EventSections = ({ metadata }) => {
    return (
        <div className="space-y-8">
            <DescriptionSection description={metadata.description} />
            <OrganizerSection organizer={metadata.organizer} />
            <LocationSection location={metadata.properties.location} />
        </div>
    )
}

export const EventDetailsSidebar = ({ metadata }) => {
    return <DetailsSection metadata={metadata} />;
}

