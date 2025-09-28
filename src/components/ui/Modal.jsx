import { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';

// ✨ 1. Adicionamos a nova prop `persistent` com valor padrão `false`.
export const Modal = ({ isOpen, onClose, title, children, persistent = false }) => {

    // ✨ 2. Criamos uma função intermediária para lidar com o fechamento.
    // Esta função será chamada pelo Dialog (clique no fundo ou ESC).
    const handleDialogClose = () => {
        // Se o modal for persistente, nós simplesmente não fazemos nada.
        if (persistent) {
            return;
        }
        // Caso contrário, chamamos a função onClose original.
        onClose();
    };

    return (
        <Transition appear show={isOpen} as={Fragment}>
            {/* ✨ 3. Trocamos `onClose={onClose}` por `onClose={handleDialogClose}` */}
            <Dialog as="div" className="relative z-50" onClose={handleDialogClose}>
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-black bg-opacity-60" />
                </Transition.Child>

                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4 text-center">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 scale-95"
                            enterTo="opacity-100 scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 scale-100"
                            leaveTo="opacity-0 scale-95"
                        >
                            <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                                <Dialog.Title as="h3" className="text-lg font-bold leading-6 text-slate-900">
                                    {title}
                                </Dialog.Title>

                                {/* IMPORTANTE: Este botão de 'X' continua usando `onClose` diretamente. */}
                                {/* Isso garante que ele SEMPRE funcione, independentemente da prop `persistent`. */}
                                <button
                                    onClick={onClose}
                                    className="absolute top-3 right-3 text-slate-400 hover:text-slate-600 focus:outline-none"
                                    aria-label="Fechar"
                                >
                                    <XMarkIcon className="h-6 w-6"/>
                                </button>

                                <div className="mt-4">
                                    {children}
                                </div>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
};