import { useMemo } from 'react';
import { InputField } from '@/components/ui/InputField';
import { ActionButton } from '@/components/ui/ActionButton';
import { Step } from './common/Step';
import { DatePickerField } from './common/DatePickerField';

export function Step1_MetadataForm({ isActive, data, setData, onNextStep }) {
    if (!isActive) {
        return <Step title="Passo 1: Informações do Evento" isComplete={true} />;
    }

    const handleChange = (path, value) => {
        setData(prev => {
            const keys = path.split('.');
            const newData = JSON.parse(JSON.stringify(prev)); // Deep copy
            let current = newData;
            for (let i = 0; i < keys.length - 1; i++) {
                current = current[keys[i]];
            }
            current[keys[keys.length - 1]] = value;
            return newData;
        });
    };

    // Gera dinamicamente o link do Google Maps para facilitar a busca de coordenadas
    const googleMapsLink = useMemo(() => {
        const { street, number, neighborhood, city, state } = data.properties.location.address;
        const addressString = [street, number, neighborhood, city, state].filter(Boolean).join(', ');
        if (!addressString) return "https://www.google.com/maps";
        return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addressString)}`;
    }, [data.properties.location.address]);


    return (
        <Step title="Passo 1: Informações do Evento (para os Metadados)" isActive={true}>
            <p className="text-sm text-slate-500 mb-6">Estes dados serão públicos e usados para exibir os detalhes do seu evento. Eles serão salvos em um arquivo JSON.</p>
            
            <div className="space-y-6">
                {/* --- SEÇÃO: INFORMAÇÕES BÁSICAS --- */}
                <Section title="Informações Básicas">
                    <InputField label="Nome do Evento" value={data.name} onChange={e => handleChange('name', e.target.value)} required />
                    <InputField as="textarea" label="Descrição" value={data.description} onChange={e => handleChange('description', e.target.value)} required />
                    <InputField label="URL da Imagem Principal" placeholder="https://..." value={data.image} onChange={e => handleChange('image', e.target.value)} required 
                        helperText="Faça o upload da imagem em um serviço como Pinata e cole o link aqui." />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <InputField label="Categoria" value={data.category} onChange={e => handleChange('category', e.target.value)} />
                        <InputField label="Tags (separadas por vírgula)" placeholder="rock, indie, festival" onChange={e => handleChange('tags', e.target.value.split(',').map(t => t.trim()))} />
                    </div>
                </Section>
                
                {/* --- SEÇÃO: LOCALIZAÇÃO --- */}
                <Section title="Localização">
                    {/* TIPO DE EVENTO */}
                    <div className="flex items-center space-x-4 mb-4">
                        <label className="text-sm font-medium text-slate-700">Tipo de Evento:</label>
                        <RadioOption name="locationType" value="Physical" checked={data.properties.location.type === 'Physical'} onChange={e => handleChange('properties.location.type', e.target.value)} label="Presencial" />
                        <RadioOption name="locationType" value="Online" checked={data.properties.location.type === 'Online'} onChange={e => handleChange('properties.location.type', e.target.value)} label="Online" />
                    </div>

                    {/* ENDEREÇO FÍSICO (CONDICIONAL) */}
                    {data.properties.location.type === 'Physical' && (
                        <div className="space-y-4 p-4 border rounded-md bg-slate-50">
                            <InputField label="Nome do Local (Ex: Estádio Beira-Rio)" value={data.properties.location.venueName} onChange={e => handleChange('properties.location.venueName', e.target.value)} />
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <InputField label="Rua / Avenida" value={data.properties.location.address.street} onChange={e => handleChange('properties.location.address.street', e.target.value)} />
                                <InputField label="Número" value={data.properties.location.address.number} onChange={e => handleChange('properties.location.address.number', e.target.value)} />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <InputField label="Bairro" value={data.properties.location.address.neighborhood} onChange={e => handleChange('properties.location.address.neighborhood', e.target.value)} />
                                <InputField label="CEP" value={data.properties.location.address.zipCode} onChange={e => handleChange('properties.location.address.zipCode', e.target.value)} />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <InputField label="Cidade" value={data.properties.location.address.city} onChange={e => handleChange('properties.location.address.city', e.target.value)} />
                                <InputField label="Estado (UF)" value={data.properties.location.address.state} onChange={e => handleChange('properties.location.address.state', e.target.value)} />
                            </div>

                            {/* COORDENADAS */}
                            <div className="pt-2">
                                <h5 className="text-sm font-semibold text-slate-600 mb-2">Coordenadas (para o mapa)</h5>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <InputField type="number" label="Latitude" placeholder="-23.55052" value={data.properties.location.coordinates.latitude} onChange={e => handleChange('properties.location.coordinates.latitude', e.target.value)} />
                                    <InputField type="number" label="Longitude" placeholder="-46.633308" value={data.properties.location.coordinates.longitude} onChange={e => handleChange('properties.location.coordinates.longitude', e.target.value)} />
                                </div>
                                <a href={googleMapsLink} target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-600 hover:underline mt-1 block">
                                    Não sabe as coordenadas? Busque o endereço no Google Maps →
                                </a>
                            </div>
                        </div>
                    )}
                    
                    {/* URL ONLINE (CONDICIONAL) */}
                    {data.properties.location.type === 'Online' && (
                         <InputField label="URL do Evento Online" placeholder="https://zoom.us/j/..." value={data.properties.location.onlineUrl} onChange={e => handleChange('properties.location.onlineUrl', e.target.value)} />
                    )}
                </Section>
                
                {/* --- SEÇÃO: DATAS --- */}
                <Section title="Data do Evento">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <DatePickerField label="Início do Evento" selected={data.properties.dateTime.start} onChange={date => handleChange('properties.dateTime.start', date)} />
                        <DatePickerField label="Fim do Evento" selected={data.properties.dateTime.end} onChange={date => handleChange('properties.dateTime.end', date)} />
                    </div>
                </Section>

                {/* --- SEÇÃO: ORGANIZADOR --- */}
                <Section title="Organizador">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <InputField label="Nome do Organizador" value={data.organizer.name} onChange={e => handleChange('organizer.name', e.target.value)} />
                        <InputField label="Website do Organizador" placeholder="https://..." value={data.organizer.website} onChange={e => handleChange('organizer.website', e.target.value)} />
                    </div>
                    <InputField 
                        label="URL do Logo do Organizador" 
                        placeholder="https://.../logo.png" 
                        value={data.organizer.organizerLogo} 
                        onChange={e => handleChange('organizer.organizerLogo', e.target.value)} 
                        helperText="Faça o upload do logo e cole o link aqui. Será exibido na página do evento."
                    />
                    <InputField type="email" label="E-mail de Contato" placeholder="contato@empresa.com" value={data.organizer.contactEmail} onChange={e => handleChange('organizer.contactEmail', e.target.value)} />
                </Section>

                {/* --- SEÇÃO: INFORMAÇÕES ADICIONAIS --- */}
                <Section title="Informações Adicionais">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <InputField label="Restrição de Idade" placeholder="Livre, 16+, 18+" value={data.additionalInfo.ageRestriction} onChange={e => handleChange('additionalInfo.ageRestriction', e.target.value)} />
                        {/* ✅ 4. ADICIONADO CAMPO PARA HORAS COMPLEMENTARES */}
                        <InputField 
                            label="Horas Complementares" 
                            type="number" 
                            min="0"
                            placeholder="Ex: 10" 
                            value={data.additionalInfo.complementaryHours} 
                            onChange={e => handleChange('additionalInfo.complementaryHours', parseInt(e.target.value, 10) || 0)} 
                            helperText="Número de horas para certificados acadêmicos."
                        />
                    </div>
                    <InputField as="textarea" label="Informações de Acessibilidade" placeholder="Ex: Local com rampas de acesso, banheiros adaptados, etc." value={data.additionalInfo.accessibility} onChange={e => handleChange('additionalInfo.accessibility', e.target.value)} />
                </Section>
            </div>
            <ActionButton type="button" onClick={onNextStep} className="mt-8 w-full">Próximo Passo: Configurações On-Chain</ActionButton>
        </Step>
    );
}

// Componentes auxiliares para clareza
const Section = ({ title, children }) => (
    <div>
        <h4 className="font-semibold text-lg text-slate-800 pb-2 mb-4 border-b border-slate-200">{title}</h4>
        <div className="space-y-4">{children}</div>
    </div>
);

const RadioOption = ({ name, value, checked, onChange, label }) => (
    <label className="flex items-center space-x-2 cursor-pointer">
        <input type="radio" name={name} value={value} checked={checked} onChange={onChange} className="h-4 w-4 text-indigo-600 border-gray-300 focus:ring-indigo-500" />
        <span className="text-sm text-slate-700">{label}</span>
    </label>
);