import { useState, Fragment } from 'react'; // Adicionado Fragment
import toast from 'react-hot-toast';
import { Modal } from '@/components/ui/Modal';
import { ActionButton } from '@/components/ui/ActionButton';

// ✨ 1. Imports para o novo componente de dropdown
import { Combobox, Transition } from '@headlessui/react';
import { CheckIcon, ChevronUpDownIcon } from '@heroicons/react/20/solid';

// ✨ 2. Definimos as opções para o dropdown fora do componente
const economicSectors = [
    'Agricultura, Pecuária e Agroindústria',
    'Indústria',
    'Construção Civil e Engenharia',
    'Comércio',
    'Serviços',
    'Educação e Pesquisa',
    'Saúde e Bem-Estar',
    'Tecnologia da Informação e Comunicação (TIC)',
    'Energia e Sustentabilidade',
    'Transporte, Logística e Mobilidade',
    'Turismo, Cultura e Entretenimento',
    'Setor Público / Governo',
    'Terceiro Setor / Organizações Sociais',
    'Outro', // Simplificamos para 'Outro'
];

export const RegistrationModal = ({ isOpen, onClose, onSubmit, isLoading }) => {
    const [formData, setFormData] = useState({
        name: '', phone: '', email: '', company: '', sector: '', role: '', customSector: ''
    });
    
    // ✨ 3. Estado adicional para controlar a busca no Combobox
    const [query, setQuery] = useState('');

    // ✨ 4. Lógica para filtrar as opções enquanto o usuário digita
    const filteredSectors = query === ''
        ? economicSectors
        : economicSectors.filter((sector) =>
            sector.toLowerCase().includes(query.toLowerCase())
        );

    // O handleChange original ainda é útil para os outros inputs
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    // Função específica para o Combobox, para maior clareza
    const handleSectorChange = (value) => {
        setFormData(prev => ({ ...prev, sector: value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!formData.name || !formData.phone) {
            return toast.error("Nome e Celular são obrigatórios.");
        }
        // Prepara os dados para envio, tratando o caso "Outro"
        const submissionData = { ...formData };
        if (formData.sector === 'Outro') {
            submissionData.sector = formData.customSector;
        }
        delete submissionData.customSector; // Remove o campo auxiliar

        onSubmit(submissionData);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Complete seu Cadastro" persistent>
            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Inputs de Nome, Celular, Email e Empresa (sem alterações) */}
                <div>
                    <label htmlFor="name" className="block text-sm font-medium text-slate-700">Nome Completo*</label>
                    <input type="text" name="name" id="name" required className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500" value={formData.name} onChange={handleChange} />
                </div>
                <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-slate-700">Celular (com DDD)*</label>
                    <input type="tel" name="phone" id="phone" required className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500" value={formData.phone} onChange={handleChange} />
                </div>
                <div>
                    <label htmlFor="email" className="block text-sm font-medium text-slate-700">Email*</label>
                    <input type="email" name="email" id="email" required className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500" value={formData.email} onChange={handleChange} />
                </div>
                <div>
                    <label htmlFor="company" className="block text-sm font-medium text-slate-700">Empresa</label>
                    <input type="text" name="company" id="company" className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500" value={formData.company} onChange={handleChange} />
                </div>

                {/* ✨ 5. SUBSTITUIÇÃO DO INPUT DE SETOR PELO COMBOBOX ✨ */}
                <div>
                    <Combobox value={formData.sector} onChange={handleSectorChange}>
                        <Combobox.Label className="block text-sm font-medium text-slate-700">Setor Econômico</Combobox.Label>
                        <div className="relative mt-1">
                            <Combobox.Input
                                className="w-full rounded-md border border-slate-300 bg-white py-2 pl-3 pr-10 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:text-sm"
                                onChange={(event) => setQuery(event.target.value)}
                                displayValue={(sector) => sector}
                                placeholder="Selecione ou digite seu setor"
                            />
                            <Combobox.Button className="absolute inset-y-0 right-0 flex items-center rounded-r-md px-2 focus:outline-none">
                                <ChevronUpDownIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                            </Combobox.Button>

                            <Transition
                                as={Fragment}
                                leave="transition ease-in duration-100"
                                leaveFrom="opacity-100"
                                leaveTo="opacity-0"
                                afterLeave={() => setQuery('')}
                            >
                                <Combobox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                                    {filteredSectors.length === 0 && query !== '' ? (
                                        <div className="relative cursor-default select-none py-2 px-4 text-gray-700">
                                            Nenhum setor encontrado.
                                        </div>
                                    ) : (
                                        filteredSectors.map((sector) => (
                                            <Combobox.Option
                                                key={sector}
                                                className={({ active }) =>
                                                    `relative cursor-default select-none py-2 pl-10 pr-4 ${
                                                        active ? 'bg-indigo-600 text-white' : 'text-gray-900'
                                                    }`
                                                }
                                                value={sector}
                                            >
                                                {({ selected, active }) => (
                                                    <>
                                                        <span className={`block truncate ${selected ? 'font-medium' : 'font-normal'}`}>
                                                            {sector}
                                                        </span>
                                                        {selected ? (
                                                            <span className={`absolute inset-y-0 left-0 flex items-center pl-3 ${active ? 'text-white' : 'text-indigo-600'}`}>
                                                                <CheckIcon className="h-5 w-5" aria-hidden="true" />
                                                            </span>
                                                        ) : null}
                                                    </>
                                                )}
                                            </Combobox.Option>
                                        ))
                                    )}
                                </Combobox.Options>
                            </Transition>
                        </div>
                    </Combobox>
                </div>

                {/* ✨ 6. Campo condicional para especificar "Outro" setor */}
                {formData.sector === 'Outro' && (
                    <Transition
                        as="div"
                        enter="transition-opacity duration-300"
                        enterFrom="opacity-0"
                        enterTo="opacity-100"
                        leave="transition-opacity duration-150"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                    >
                        <label htmlFor="customSector" className="block text-sm font-medium text-slate-700">Qual?</label>
                        <input
                            type="text"
                            name="customSector"
                            id="customSector"
                            required
                            className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                            value={formData.customSector}
                            onChange={handleChange}
                            placeholder="Ex: Fintech, Varejo, etc."
                        />
                    </Transition>
                )}

                {/* Input de Cargo (sem alterações) */}
                <div>
                    <label htmlFor="role" className="block text-sm font-medium text-slate-700">Cargo</label>
                    <input type="text" name="role" id="role" className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500" value={formData.role} onChange={handleChange} />
                </div>

                <div className="pt-4">
                    <ActionButton type="submit" loading={isLoading} className="w-full">
                        Finalizar e Pegar Ingresso
                    </ActionButton>
                </div>
            </form>
        </Modal>
    );
};

