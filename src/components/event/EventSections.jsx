import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import {
    CalendarDaysIcon, MapPinIcon, ClockIcon, UserCircleIcon,
    InformationCircleIcon, SparklesIcon
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


const LocationSection = ({ location }) => {
    if (!location?.coordinates) return null;
    const position = [parseFloat(location.coordinates.latitude), parseFloat(location.coordinates.longitude)];
    return (
        <Section title="Localização" icon={MapPinIcon}>
            {location.type === 'Physical' ? (
                <div>
                    <p className="font-semibold mb-2">{location.venueName}</p>
                    <p>{`${location.address.street}, ${location.address.number}`}</p>

                    <div className="relative z-0 mt-4 rounded-lg overflow-hidden border">
                        <MapContainer center={position} zoom={16} scrollWheelZoom={false} style={{ height: '400px', width: '100%' }}>
                            <TileLayer
                                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            />
                            <Marker position={position}>
                                <Popup>{location.venueName}</Popup>
                            </Marker>
                        </MapContainer>
                    </div>
                </div>
            ) : (
                <div className="bg-slate-100 p-4 rounded-lg">
                    <p className="font-semibold">Evento Online</p>
                    <a href={location.onlineUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-600 font-semibold text-sm hover:underline">Acessar →</a>
                </div>
            )}
        </Section>
    );
};

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
    const datePart = startDate.toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const timePart = startDate.toLocaleTimeString('pt-BR', { timeStyle: 'short' });
    return (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Detalhes</h3>
            <div className="space-y-4">
                <DetailItem icon={CalendarDaysIcon} label="Data" text={datePart} />
                <DetailItem icon={ClockIcon} label="Horário" text={timePart} />
                <DetailItem icon={UserCircleIcon} label="Organizador" text={organizer.name} />
                <DetailItem icon={SparklesIcon} label="Classificação" text={additionalInfo.ageRestriction} />
            </div>
        </div>
    );
};
export const EventSections = ({ metadata }) => {
    return (
        <>
            <div className="space-y-12">
                <DescriptionSection description={metadata.description} />
                <OrganizerSection organizer={metadata.organizer} />
                <LocationSection location={metadata.properties.location} />
            </div>
        </>
    )
}
export const EventDetailsSidebar = ({ metadata }) => {
    return <DetailsSection metadata={metadata} />;
}
