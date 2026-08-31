import React from 'react';
import { Play, Pause, RotateCcw, Flag, Sparkles, ExternalLink } from 'lucide-react';
import { AppTheme } from '../types';

interface StopwatchControlsProps {
  isRunning: boolean;
  elapsedTime: number;
  onStart: () => void;
  onPause: () => void;
  onReset: () => void;
  onLap: () => void;
  onCreatePill: () => void;
  theme: AppTheme;
  supportsPiP?: boolean;
  onTriggerPiP?: () => void;
}

export const StopwatchControls: React.FC<StopwatchControlsProps> = ({
  isRunning,
  elapsedTime,
  onStart,
  onPause,
  onReset,
  onLap,
  onCreatePill,
  theme,
  supportsPiP,
  onTriggerPiP,
}) => {
  const isStarted = elapsedTime > 0;

  const getPrimaryButtonTheme = () => {
    if (isRunning) {
      return 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/20';
    }
    switch (theme) {
      case 'oled':
        return 'bg-purple-600 hover:bg-purple-500 text-white shadow-purple-600/30';
      case 'cyber':
        return 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-cyan-500/30';
      default:
        return 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30';
    }
  };

  return (
    <div className="w-full max-w-lg mx-auto px-4 flex flex-col items-center gap-4">
      {/* Primary Action Buttons Bar */}
      <div className="w-full grid grid-cols-3 gap-3 sm:gap-4 items-center">
        {/* Reset / Clear Button */}
        <button
          id="reset-stopwatch-btn"
          type="button"
          onClick={onReset}
          disabled={!isStarted && !isRunning}
          className={`flex items-center justify-center gap-2 py-3 sm:py-3.5 px-4 rounded-2xl font-semibold text-sm transition-all border ${
            isStarted || isRunning
              ? 'bg-slate-900 hover:bg-slate-800 text-slate-200 border-slate-700/80 hover:border-slate-600 active:scale-95 shadow-sm'
              : 'bg-slate-950/40 text-slate-600 border-slate-800/40 cursor-not-allowed'
          }`}
          title="Zerar cronômetro (R)"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Zerar</span>
        </button>

        {/* Start / Pause Main CTA Button */}
        <button
          id="toggle-start-pause-btn"
          type="button"
          onClick={isRunning ? onPause : onStart}
          className={`flex items-center justify-center gap-2 py-3.5 sm:py-4 px-4 rounded-2xl font-bold text-base shadow-lg transition-all active:scale-95 ${getPrimaryButtonTheme()}`}
          title={isRunning ? 'Pausar (Espaço)' : 'Iniciar (Espaço)'}
        >
          {isRunning ? (
            <>
              <Pause className="w-5 h-5 fill-current" />
              <span>Pausar</span>
            </>
          ) : (
            <>
              <Play className="w-5 h-5 fill-current" />
              <span>{isStarted ? 'Continuar' : 'Iniciar'}</span>
            </>
          )}
        </button>

        {/* Lap / Split Button */}
        <button
          id="lap-stopwatch-btn"
          type="button"
          onClick={onLap}
          disabled={!isRunning}
          className={`flex items-center justify-center gap-2 py-3 sm:py-3.5 px-4 rounded-2xl font-semibold text-sm transition-all border ${
            isRunning
              ? 'bg-slate-900 hover:bg-slate-800 text-slate-200 border-slate-700/80 hover:border-slate-600 active:scale-95 shadow-sm'
              : 'bg-slate-950/40 text-slate-600 border-slate-800/40 cursor-not-allowed'
          }`}
          title="Registrar Volta (L)"
        >
          <Flag className="w-4 h-4" />
          <span>Volta</span>
        </button>
      </div>

      {/* Secondary Feature Controls: Flutuar / Criar Pílula */}
      <div className="w-full flex items-center justify-center gap-3 pt-2">
        {/* Floating Pill Generator Button */}
        <button
          id="create-floating-pill-btn"
          type="button"
          onClick={onCreatePill}
          className="flex-1 max-w-xs flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-500/20 via-purple-500/20 to-pink-500/20 hover:from-indigo-500/30 hover:via-purple-500/30 hover:to-pink-500/30 border border-indigo-500/40 text-indigo-200 text-xs sm:text-sm font-semibold shadow-md transition-all active:scale-95 group"
          title="Criar uma pílula flutuante com o tempo atual (Atalho: F)"
        >
          <Sparkles className="w-4 h-4 text-indigo-400 group-hover:rotate-12 transition-transform" />
          <span>Criar Pílula de Tempo</span>
        </button>

        {/* Picture-in-Picture Floating Mode (if browser supports) */}
        {supportsPiP && onTriggerPiP && (
          <button
            id="pip-mode-btn"
            type="button"
            onClick={onTriggerPiP}
            className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white text-xs font-medium transition-all"
            title="Abrir em Janela Flutuante do Sistema (Picture-in-Picture)"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Modo PiP</span>
          </button>
        )}
      </div>
    </div>
  );
};
