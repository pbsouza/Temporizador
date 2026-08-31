import React from 'react';
import { Volume2, VolumeX, Moon, Sun, Monitor, HelpCircle, Download, ShieldCheck, Sparkles } from 'lucide-react';
import { AppTheme } from '../types';

interface NavbarProps {
  theme: AppTheme;
  setTheme: (theme: AppTheme) => void;
  isMuted: boolean;
  setIsMuted: (muted: boolean) => void;
  wakeLockActive: boolean;
  toggleWakeLock: () => void;
  onOpenShortcuts: () => void;
  onOpenInstallModal: () => void;
  isInstallable: boolean;
  floatingPillCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  theme,
  setTheme,
  isMuted,
  setIsMuted,
  wakeLockActive,
  toggleWakeLock,
  onOpenShortcuts,
  onOpenInstallModal,
  isInstallable,
  floatingPillCount,
}) => {
  return (
    <header className="w-full max-w-5xl mx-auto px-4 py-4 flex items-center justify-between z-30">
      {/* Brand & Real PNG Icon */}
      <div className="flex items-center gap-3">
        <div className="relative w-10 h-10 rounded-xl overflow-hidden shadow-lg border border-slate-700/60 flex-shrink-0 bg-slate-900">
          <img
            src="/icon.png"
            alt="Ícone do Cronômetro Pro"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 ring-1 ring-inset ring-white/10 rounded-xl pointer-events-none" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-1.5">
              Cronômetro <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">PRO</span>
            </h1>
            <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              PWA Pronto
            </span>
          </div>
          <p className="text-xs text-slate-400 hidden sm:block">
            Precisão de milissegundos & pílulas flutuantes
          </p>
        </div>
      </div>

      {/* Action Controls */}
      <div className="flex items-center gap-2">
        {/* Floating pill counter badge if active */}
        {floatingPillCount > 0 && (
          <div
            className="hidden md:flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg bg-indigo-950/80 border border-indigo-500/40 text-indigo-300"
            title={`${floatingPillCount} pílula(s) flutuante(s) ativa(s)`}
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>{floatingPillCount} pílula{floatingPillCount > 1 ? 's' : ''}</span>
          </div>
        )}

        {/* Wake Lock Screen On/Off Toggle */}
        <button
          id="wake-lock-toggle-btn"
          type="button"
          onClick={toggleWakeLock}
          className={`p-2 rounded-xl text-xs font-medium border transition-all flex items-center gap-1.5 ${
            wakeLockActive
              ? 'bg-amber-500/20 border-amber-500/40 text-amber-300 shadow-sm'
              : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
          title={wakeLockActive ? 'Manter tela sempre acesa (Ativo)' : 'Manter tela sempre acesa (Desativado)'}
        >
          <ShieldCheck className={`w-4 h-4 ${wakeLockActive ? 'text-amber-400' : 'text-slate-400'}`} />
          <span className="hidden md:inline text-[11px]">{wakeLockActive ? 'Tela Ativa' : 'Manter Tela'}</span>
        </button>

        {/* Sound FX Toggle */}
        <button
          id="sound-toggle-btn"
          type="button"
          onClick={() => setIsMuted(!isMuted)}
          className={`p-2 rounded-xl border transition-all ${
            !isMuted
              ? 'bg-slate-900/90 border-slate-700/60 text-indigo-400 hover:text-indigo-300'
              : 'bg-slate-900/60 border-slate-800 text-slate-500 hover:text-slate-300'
          }`}
          title={isMuted ? 'Ativar Efeitos Sonoros' : 'Desativar Efeitos Sonoros'}
          aria-label="Alternar som"
        >
          {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>

        {/* Theme Selector Button */}
        <button
          id="theme-selector-btn"
          type="button"
          onClick={() => {
            const themes: AppTheme[] = ['dark', 'oled', 'cyber'];
            const next = themes[(themes.indexOf(theme) + 1) % themes.length];
            setTheme(next);
          }}
          className="p-2 rounded-xl bg-slate-900/90 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
          title={`Tema atual: ${theme}. Clique para alternar`}
          aria-label="Alternar tema visual"
        >
          {theme === 'oled' ? (
            <Moon className="w-4 h-4 text-purple-400" />
          ) : theme === 'cyber' ? (
            <Sparkles className="w-4 h-4 text-cyan-400" />
          ) : (
            <Monitor className="w-4 h-4 text-indigo-400" />
          )}
        </button>

        {/* PWA Install Button */}
        {isInstallable && (
          <button
            id="pwa-install-header-btn"
            type="button"
            onClick={onOpenInstallModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 transition-all border border-indigo-400/30"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Instalar PWA</span>
          </button>
        )}

        {/* Keyboard Shortcuts Help */}
        <button
          id="keyboard-shortcuts-btn"
          type="button"
          onClick={onOpenShortcuts}
          className="p-2 rounded-xl bg-slate-900/90 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          title="Atalhos de teclado"
          aria-label="Atalhos do teclado"
        >
          <HelpCircle className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
