import React from 'react';
import { Sparkles, PictureInPicture, Layers } from 'lucide-react';

interface FloatingActionButtonProps {
  onClickPill: () => void;
  onClickPiP?: () => void;
  supportsPiP?: boolean;
  isPiPActive?: boolean;
  pillCount: number;
  isRunning: boolean;
}

export const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({
  onClickPill,
  onClickPiP,
  supportsPiP,
  isPiPActive,
  pillCount,
  isRunning,
}) => {
  return (
    <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-3 pointer-events-auto">
      {/* System-wide Floating PiP over other apps button */}
      {supportsPiP && onClickPiP && (
        <button
          id="fab-system-pip-btn"
          type="button"
          onClick={onClickPiP}
          className={`group flex items-center justify-center gap-2 p-3 sm:px-4 sm:py-2.5 rounded-full shadow-lg border transition-all duration-200 cursor-pointer ${
            isPiPActive
              ? 'bg-emerald-600 border-emerald-400 text-white shadow-emerald-500/30'
              : 'bg-slate-900/95 hover:bg-slate-800 border-slate-700/80 text-indigo-300 hover:text-white shadow-slate-950/50'
          }`}
          title="Minimizar para pílula flutuante sobre outros apps (Picture-in-Picture)"
        >
          <PictureInPicture className="w-4 h-4" />
          <span className="text-xs font-semibold">
            {isPiPActive ? 'Pílula Ativa' : 'Flutuar em Outros Apps'}
          </span>
        </button>
      )}

      {/* Primary In-App Floating Action Button */}
      <button
        id="fab-create-pill-btn"
        type="button"
        onClick={onClickPill}
        className="group relative flex items-center justify-center gap-2 p-3.5 sm:px-4 sm:py-3.5 rounded-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white shadow-xl shadow-indigo-500/30 border border-indigo-400/40 hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer"
        title="Criar Pílula de Tempo na Tela (Atalho: F)"
        aria-label="Criar pílula com tempo cronometrado"
      >
        {/* Animated pulse ring if stopwatch is running */}
        {isRunning && (
          <span className="absolute -inset-1 rounded-full bg-indigo-500/30 animate-ping pointer-events-none" />
        )}

        <Sparkles className="w-5 h-5 group-hover:rotate-12 transition-transform" />
        <span className="hidden sm:inline font-semibold text-xs tracking-wide">
          Criar Pílula
        </span>

        {/* Counter Badge if pills exist */}
        {pillCount > 0 && (
          <span className="ml-1 px-1.5 py-0.2 rounded-full bg-white/20 text-white text-[11px] font-bold">
            {pillCount}
          </span>
        )}
      </button>
    </div>
  );
};
