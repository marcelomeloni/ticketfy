import React, { Fragment } from 'react';
import { CurrencyDollarIcon } from '@heroicons/react/24/solid';

// --- STUBS PARA COMPONENTES DE UI ---

// Stub para o componente Modal
// Em uma aplicação real, este componente gerencia o estado e o portal de exibição.
const Modal = ({ isOpen, onClose, title, children, persistent = false }) => {
    if (!isOpen) return null;

    // Simples fundo e contêiner centralizado
    return (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-900 bg-opacity-75 flex items-center justify-center p-4" aria-labelledby="modal-title" role="dialog" aria-modal="true">
            <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-sm mx-auto p-6 transform transition-all">
                <div className="flex justify-between items-center pb-3 border-b border-gray-100">
                    <h3 className="text-lg font-bold text-gray-900" id="modal-title">
                        {title}
                    </h3>
                    {!persistent && (
                        <button
                            type="button"
                            className="text-gray-400 hover:text-gray-500 transition"
                            onClick={onClose}
                            aria-label="Fechar"
                        >
                            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    )}
                </div>
                <div className="mt-4">
                    {children}
                </div>
            </div>
        </div>
    );
};

// Stub para o componente ActionButton
const ActionButton = ({ children, onClick, loading, type = 'button', className = '' }) => (
    <button
        type={type}
        onClick={onClick}
        disabled={loading}
        className={`flex w-full justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold leading-6 text-white shadow-md hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition duration-150 ${className}`}
    >
        {loading ? (
            <span className="flex items-center gap-2">
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                Processando...
            </span>
        ) : (
            children
        )}
    </button>
);

// --- COMPONENTE PRINCIPAL ---

/**
 * Modal de placeholder para a etapa de Pagamento.
 * @param {{
 * isOpen: boolean, 
 * onClose: () => void, 
 * onPaymentSubmit: () => Promise<void>, 
 * isLoading: boolean,
 * tierName: string,
 * tierPriceSol: string
 * }} props
 */
export const PaymentModal = ({ isOpen, onClose, onPaymentSubmit, isLoading, tierName, tierPriceSol }) => {
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Método de Pagamento" persistent>
            <div className="space-y-6 p-2">
                
                <div className="text-center p-6 bg-indigo-50 rounded-xl border border-indigo-200">
                    <CurrencyDollarIcon className="mx-auto h-8 w-8 text-indigo-600 mb-3"/>
                    <h3 className="text-xl font-bold text-indigo-800">Pagamento (Próxima Etapa)</h3>
                    <p className="text-lg text-indigo-700 font-semibold mt-2">
                        Ingresso: <span className="font-extrabold">{tierName}</span>
                    </p>
                    <p className="text-3xl font-extrabold text-indigo-900 mt-1">
                        {tierPriceSol} SOL
                    </p>
                    <p className="text-sm text-indigo-600 mt-3">
                        Neste momento, a integração do pagamento via Solana está desabilitada.
                    </p>
                </div>

                <div className="pt-4">
                    <ActionButton
                        onClick={onPaymentSubmit}
                        loading={isLoading}
                        className="w-full"
                    >
                        {/* Esta ação simula o clique em "Pagar" e prossegue para a transação Solana */}
                        Continuar para Aprovação da Transação
                    </ActionButton>
                </div>
            </div>
        </Modal>
    );
};
