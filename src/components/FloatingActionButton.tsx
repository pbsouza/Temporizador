import React from 'react';
import { Sparkles, Layers, Plus } from 'lucide-react';

interface FloatingActionButtonProps {
  onClick: () => void;
  pillCount: number;
  isRunning: boolean;
}

export const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({
  onClick,
  pillCount,
  isRunning,
}) => {
  return (
    <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-2 pointer-events-auto">
      {/* Floating Action Button */}
      <button
        id="fab-create-pill-btn"
        type="button"
        onClick={onClick}
        className="group relative flex items-center justify-center gap-2 p-3.5 sm:px-4 sm:py-3.5 rounded-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white shadow-xl shadow-indigo-500/30 border border-indigo-400/40 hover:scale-105 active:scale-95 transition-all duration-200"
        title="Botão de Flutuar: Criar Pílula de Tempo (F)"
        aria-label="Criar pílula com tempo cronometrado"
      >
        {/* Animated pulse ring if stopwatch is running */}
        {isRunning && (
          <span className="absolute -inset-1 rounded-full bg-indigo-500/30 animate-ping pointer-events-none" />
        )}

        <Sparkles className="w-5 h-5 group-hover:rotate-12 transition-transform" />
        <span className="hidden sm:inline font-semibold text-xs tracking-wide">
          Flutuar Tempo
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
