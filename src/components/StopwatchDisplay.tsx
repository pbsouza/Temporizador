import React from 'react';
import { formatTimeComponents } from '../utils/timeFormat';
import { AppTheme } from '../types';

interface StopwatchDisplayProps {
  elapsedTime: number;
  isRunning: boolean;
  theme: AppTheme;
  lastLapTime?: number;
  totalLaps: number;
}

export const StopwatchDisplay: React.FC<StopwatchDisplayProps> = ({
  elapsedTime,
  isRunning,
  theme,
  lastLapTime,
  totalLaps,
}) => {
  const { hours, minutes, seconds, milliseconds } = formatTimeComponents(elapsedTime);
  const hasHours = parseInt(hours, 10) > 0;

  // Calculate rotation angles for visual chronograph ring
  // A full 60 seconds rotation for seconds ring
  const secProgress = ((elapsedTime % 60000) / 60000) * 100;
  // A full 1 second rotation for millisecond dial
  const msProgress = ((elapsedTime % 1000) / 1000) * 100;

  // Theme-specific glow and accent colors
  const getThemeStyles = () => {
    switch (theme) {
      case 'oled':
        return {
          glow: isRunning ? 'shadow-[0_0_50px_rgba(168,85,247,0.15)]' : '',
          ringColor: isRunning ? '#a855f7' : '#581c87',
          accentText: 'text-purple-400',
          msText: 'text-purple-300',
        };
      case 'cyber':
        return {
          glow: isRunning ? 'shadow-[0_0_50px_rgba(6,182,212,0.2)]' : '',
          ringColor: isRunning ? '#06b6d4' : '#0e7490',
          accentText: 'text-cyan-400',
          msText: 'text-cyan-300',
        };
      default: // dark
        return {
          glow: isRunning ? 'shadow-[0_0_50px_rgba(99,102,241,0.2)]' : '',
          ringColor: isRunning ? '#6366f1' : '#3730a3',
          accentText: 'text-indigo-400',
          msText: 'text-indigo-300',
        };
    }
  };

  const currentTheme = getThemeStyles();
  const radius = 135;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (secProgress / 100) * circumference;

  return (
    <div className="relative flex flex-col items-center justify-center py-6 select-none">
      {/* Outer Glow & Dial Container */}
      <div
        className={`relative w-72 h-72 sm:w-80 sm:h-80 md:w-96 md:h-96 rounded-full flex items-center justify-center p-4 transition-all duration-500 bg-slate-900/60 backdrop-blur-md border border-slate-800/80 ${currentTheme.glow}`}
      >
        {/* SVG Chronograph Gauge Ring */}
        <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none" viewBox="0 0 320 320">
          {/* Background circle track */}
          <circle
            cx="160"
            cy="160"
            r={radius}
            fill="none"
            stroke="currentColor"
            className="text-slate-800/60"
            strokeWidth="5"
          />
          {/* Active progress ring */}
          <circle
            cx="160"
            cy="160"
            r={radius}
            fill="none"
            stroke={currentTheme.ringColor}
            strokeWidth="6"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-75"
          />
        </svg>

        {/* Inner Sub-dial & Digital readout */}
        <div className="flex flex-col items-center justify-center z-10 text-center px-4">
          {/* Status badge */}
          <div className="mb-2 flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wider uppercase transition-colors ${
                isRunning
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                  : elapsedTime > 0
                  ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                  : 'bg-slate-800 text-slate-400 border border-slate-700/50'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isRunning
                    ? 'bg-emerald-400 animate-ping'
                    : elapsedTime > 0
                    ? 'bg-amber-400'
                    : 'bg-slate-500'
                }`}
              />
              {isRunning ? 'Em Execução' : elapsedTime > 0 ? 'Pausado' : 'Pronto'}
            </span>

            {totalLaps > 0 && (
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700/60">
                Volta {totalLaps}
              </span>
            )}
          </div>

          {/* Main Digits */}
          <div
            id="stopwatch-display-time"
            className="font-mono tracking-tight text-white flex items-baseline justify-center font-bold"
          >
            {hasHours && (
              <>
                <span className="text-3xl sm:text-4xl md:text-5xl">{hours}</span>
                <span className="text-xl sm:text-2xl md:text-3xl text-slate-500 mx-0.5 sm:mx-1">:</span>
              </>
            )}
            <span className="text-4xl sm:text-5xl md:text-6xl">{minutes}</span>
            <span className="text-2xl sm:text-3xl md:text-4xl text-slate-500 mx-0.5 sm:mx-1">:</span>
            <span className="text-4xl sm:text-5xl md:text-6xl">{seconds}</span>
            <span className="text-2xl sm:text-3xl md:text-4xl text-slate-500 mx-0.5 sm:mx-1">.</span>
            <span className={`text-2xl sm:text-3xl md:text-4xl font-semibold ${currentTheme.msText}`}>
              {milliseconds}
            </span>
          </div>

          {/* Sub-label: Lap split delta if available */}
          {lastLapTime !== undefined && lastLapTime > 0 && (
            <div className="mt-2 text-xs font-mono text-slate-400 flex items-center gap-1">
              <span className="text-slate-500">Última volta:</span>
              <span className="font-semibold text-slate-300">
                {formatTimeComponents(lastLapTime).minutes}:{formatTimeComponents(lastLapTime).seconds}.{formatTimeComponents(lastLapTime).milliseconds}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
