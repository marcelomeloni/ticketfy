import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import {
    CalendarDaysIcon, MapPinIcon, ClockIcon, UserCircleIcon,
    InformationCircleIcon, SparklesIcon,
    // ✨ NOVOS ÍCONES IMPORTADOS ✨
    BuildingOffice2Icon, MapIcon, EnvelopeIcon 
} from '@heroicons/react/24/outline';


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



const Section = ({ title, icon: Icon, children }) => (
    <section>
        <h2 className="text-2xl font-bold text-slate-900 flex items-center mb-4">
            <Icon className="h-6 w-6 text-indigo-500 mr-3" />
            {title}
        </h2>
        <div className="prose max-w-none text-slate-600">{children}</div>
    </section>
);
const DescriptionSection = ({ description }) => (
    <Section title="Sobre o Evento" icon={InformationCircleIcon}>
        <p className="whitespace-pre-wrap">{description}</p>
    </Section>
);
const OrganizerSection = ({ organizer }) => (
    <Section title="Organizado por" icon={UserCircleIcon}>
        <div className="bg-slate-100 p-4 rounded-lg flex items-center justify-between">
            <p className="font-semibold">{organizer.name}</p>
            {organizer.website && <a href={organizer.website} target="_blank" rel="noopener noreferrer" className="text-indigo-600 font-semibold text-sm hover:underline">Visitar Website →</a>}
        </div>
    </Section>
);


// ====================================================================
// ✨ COMPONENTE ATUALIZADO ✨
// ====================================================================
const LocationSection = ({ location }) => {
    // Se não for um evento físico ou não tiver endereço, não renderiza nada ou mostra a URL online.
    if (location?.type !== 'Physical' || !location?.address) {
        return location?.onlineUrl ? (
             <Section title="Localização" icon={MapPinIcon}>
                <div className="bg-slate-100 p-4 rounded-lg">
                    <p className="font-semibold">Evento Online</p>
                    <a href={location.onlineUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-600 font-semibold text-sm hover:underline">Acessar →</a>
                </div>
            </Section>
        ) : null;
    }

    const { address, coordinates, venueName } = location;
    const position = [parseFloat(coordinates.latitude), parseFloat(coordinates.longitude)];

    // Constrói as linhas do endereço, tratando campos que podem não existir
    const addressLine1 = `${address.street}${address.number ? `, ${address.number}` : ''}`;
    const addressLine2 = `${address.neighborhood ? `${address.neighborhood}, ` : ''}${address.city} - ${address.state}`;

    // Cria a URL para o Google Maps para traçar rotas
    const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${coordinates.latitude},${coordinates.longitude}`;

    return (
        <Section title="Localização" icon={MapPinIcon}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                {/* Coluna da Esquerda: Detalhes do Endereço */}
                <div className="space-y-4">
                    <h3 className="text-xl font-semibold text-slate-800">{venueName}</h3>
                    
                    {/* Detalhes do endereço bem formatados com ícones */}
                    <div className="space-y-3 text-slate-700">
                        <div className="flex items-start">
                            <MapIcon className="h-5 w-5 mt-0.5 text-slate-500 flex-shrink-0 mr-3" />
                            <span>{addressLine1}</span>
                        </div>
                        <div className="flex items-start">
                             <BuildingOffice2Icon className="h-5 w-5 mt-0.5 text-slate-500 flex-shrink-0 mr-3" />
                            <span>{addressLine2}</span>
                        </div>
                        {address.zipCode && (
                            <div className="flex items-start">
                                <EnvelopeIcon className="h-5 w-5 mt-0.5 text-slate-500 flex-shrink-0 mr-3" />
                                <span>CEP: {address.zipCode}</span>
                            </div>
                        )}
                    </div>

                    {/* Botão para traçar rota */}
                    <a 
                        href={googleMapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-4 inline-flex items-center justify-center gap-2 px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
                    >
                        Ver no mapa e traçar rota
                    </a>
                </div>

                {/* Coluna da Direita: Mapa Interativo */}
                <div className="relative z-0 h-80 rounded-lg overflow-hidden border">
                    <MapContainer center={position} zoom={16} scrollWheelZoom={false} style={{ height: '100%', width: '100%' }}>
                        <TileLayer
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />
                        <Marker position={position}>
                            <Popup>
                                <div className="font-semibold">{venueName}</div>
                                <div>{addressLine1}</div>
                                <div>{addressLine2}</div>
                            </Popup>
                        </Marker>
                    </MapContainer>
                </div>
            </div>
        </Section>
    );
};
// ====================================================================


const DetailItem = ({ icon: Icon, label, text }) => (
    <div className="flex items-start">
        <Icon className="h-5 w-5 text-slate-500 mt-0.5 flex-shrink-0" />
        <div className="ml-3">
            <p className="text-sm font-semibold text-slate-800">{label}</p>
            <p className="text-sm text-slate-600">{text}</p>
        </div>
    </div>
);
const DetailsSection = ({ metadata }) => {
    const { organizer, additionalInfo, properties } = metadata;
    if (!properties?.dateTime) return null;
    const startDate = new Date(properties.dateTime.start);
    
    // ATENÇÃO: A data do evento no JSON (outubro de 2025) está correta.
    // O dia da semana será "Terça-feira".
    const datePart = startDate.toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: properties.dateTime.timezone });
    const timePart = startDate.toLocaleTimeString('pt-BR', { timeStyle: 'short', timeZone: properties.dateTime.timezone });
    
    return (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Detalhes</h3>
            <div className="space-y-4">
                <DetailItem icon={CalendarDaysIcon} label="Data" text={datePart} />
                <DetailItem icon={ClockIcon} label="Horário" text={`${timePart} (horário de Brasília)`} />
                <DetailItem icon={UserCircleIcon} label="Organizador" text={organizer.name} />
                <DetailItem icon={SparklesIcon} label="Classificação" text={additionalInfo.ageRestriction} />
            </div>
        </div>
    );
};

export const EventSections = ({ metadata }) => {
    return (
        <div className="space-y-12">
            <DescriptionSection description={metadata.description} />
            <OrganizerSection organizer={metadata.organizer} />
            <LocationSection location={metadata.properties.location} />
        </div>
    )
}

export const EventDetailsSidebar = ({ metadata }) => {
    return <DetailsSection metadata={metadata} />;
}
