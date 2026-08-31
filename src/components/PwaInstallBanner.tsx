import React from 'react';
import { Download, Smartphone, CheckCircle, WifiOff, X, ExternalLink } from 'lucide-react';

interface PwaInstallBannerProps {
  isOpen: boolean;
  onClose: () => void;
  onInstall: () => void;
  isInstallable: boolean;
}

export const PwaInstallBanner: React.FC<PwaInstallBannerProps> = ({
  isOpen,
  onClose,
  onInstall,
  isInstallable,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-700/80 rounded-3xl p-6 shadow-2xl text-slate-200">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Icon & Title */}
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 rounded-2xl overflow-hidden shadow-lg border border-slate-700 bg-slate-950 flex-shrink-0">
            <img
              src="/icon.png"
              alt="Cronômetro Pro Ícone"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Cronômetro Pro PWA</h3>
            <p className="text-xs text-emerald-400 font-medium flex items-center gap-1 mt-0.5">
              <CheckCircle className="w-3.5 h-3.5" />
              100% Pronto para Instalação & Offline
            </p>
          </div>
        </div>

        {/* Features Checklist */}
        <div className="space-y-2.5 my-4 text-xs text-slate-300 bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
          <div className="flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-0.5" />
            <span><strong>Acesso Rápido:</strong> Abre instantaneamente direto da sua tela inicial ou barra de tarefas.</span>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-0.5" />
            <span><strong>Suporte Offline:</strong> Funciona perfeitamente mesmo sem conexão com a internet.</span>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-0.5" />
            <span><strong>Pílulas Flutuantes:</strong> Mantenha tempos destacados e flutuando na tela enquanto trabalha.</span>
          </div>
        </div>

        {/* Install Instructions Guide */}
        <div className="mt-4 pt-2">
          {isInstallable ? (
            <button
              id="pwa-confirm-install-btn"
              type="button"
              onClick={onInstall}
              className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all"
            >
              <Download className="w-4 h-4" />
              Instalar Aplicativo Agora
            </button>
          ) : (
            <div className="text-xs text-slate-400 space-y-2">
              <p className="font-semibold text-slate-300">Como instalar no seu dispositivo:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>No iOS (iPhone/iPad):</strong> Toque no botão Compartilhar no Safari e selecione <em>"Adicionar à Tela de Início"</em>.</li>
                <li><strong>No Android / Chrome / Edge:</strong> Toque no menu de 3 pontos e escolha <em>"Instalar aplicativo"</em> ou <em>"Adicionar à tela inicial"</em>.</li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
