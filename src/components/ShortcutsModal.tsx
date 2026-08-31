import React from 'react';
import { X, Command, Sparkles } from 'lucide-react';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const shortcuts = [
    { key: 'Espaço', desc: 'Iniciar ou pausar o cronômetro' },
    { key: 'L', desc: 'Registrar volta / tempo parcial' },
    { key: 'R', desc: 'Zerar o cronômetro' },
    { key: 'F', desc: 'Flutuar / Criar Pílula com o tempo atual' },
    { key: 'M', desc: 'Ativar / Desativar efeitos sonoros' },
    { key: 'Esc', desc: 'Fechar modais e pílulas ativas' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-700/80 rounded-3xl p-6 shadow-2xl text-slate-200">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2 mb-4">
          <Command className="w-5 h-5 text-indigo-400" />
          <h3 className="text-base font-bold text-white">Atalhos de Teclado</h3>
        </div>

        <div className="divide-y divide-slate-800">
          {shortcuts.map((s, idx) => (
            <div key={idx} className="py-2.5 flex items-center justify-between text-xs">
              <span className="text-slate-300">{s.desc}</span>
              <kbd className="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 font-mono font-semibold text-indigo-300 shadow-sm">
                {s.key}
              </kbd>
            </div>
          ))}
        </div>

        <div className="mt-5 p-3 rounded-xl bg-indigo-950/40 border border-indigo-500/30 flex items-center gap-2 text-xs text-indigo-300">
          <Sparkles className="w-4 h-4 text-indigo-400 flex-shrink-0" />
          <span>Dica: Use o botão flutuante ou pressione <strong>F</strong> a qualquer momento para criar pílulas de tempo!</span>
        </div>
      </div>
    </div>
  );
};
