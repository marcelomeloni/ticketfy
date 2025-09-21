// src/components/modals/RegistrationModal.jsx
import { useState } from 'react';
import toast from 'react-hot-toast';
import { Modal } from '@/components/ui/Modal';
import { ActionButton } from '@/components/ui/ActionButton';

export const RegistrationModal = ({ isOpen, onClose, onSubmit, isLoading }) => {
    const [formData, setFormData] = useState({
        name: '', phone: '', email: '', company: '', sector: '', role: ''
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!formData.name || !formData.phone) {
            return toast.error("Nome e Celular são obrigatórios.");
        }
        onSubmit(formData);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Complete seu Cadastro">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label htmlFor="name" className="block text-sm font-medium text-slate-700">Nome Completo*</label>
                    <input type="text" name="name" id="name" required className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500" value={formData.name} onChange={handleChange} />
                </div>
                <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-slate-700">Celular (com DDD)*</label>
                    <input type="tel" name="phone" id="phone" required className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500" value={formData.phone} onChange={handleChange} />
                </div>
                <div>
                    <label htmlFor="email" className="block text-sm font-medium text-slate-700">Email (Opcional)</label>
                    <input type="email" name="email" id="email" className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500" value={formData.email} onChange={handleChange} />
                </div>
                <div>
                    <label htmlFor="company" className="block text-sm font-medium text-slate-700">Empresa</label>
                    <input type="text" name="company" id="company" className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500" value={formData.company} onChange={handleChange} />
                </div>
                <div>
                    <label htmlFor="sector" className="block text-sm font-medium text-slate-700">Setor Econômico</label>
                    <input type="text" name="sector" id="sector" className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500" value={formData.sector} onChange={handleChange} />
                </div>
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