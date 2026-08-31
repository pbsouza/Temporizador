/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { StopwatchDisplay } from './components/StopwatchDisplay';
import { StopwatchControls } from './components/StopwatchControls';
import { FloatingPillsLayer } from './components/FloatingPillsLayer';
import { FloatingActionButton } from './components/FloatingActionButton';
import { LapsTable } from './components/LapsTable';
import { PwaInstallBanner } from './components/PwaInstallBanner';
import { ShortcutsModal } from './components/ShortcutsModal';
import { Lap, FloatingPill, AppTheme } from './types';
import { sound } from './utils/audio';

const PILL_COLORS: FloatingPill['color'][] = ['indigo', 'emerald', 'amber', 'rose', 'cyan', 'violet'];

export default function App() {
  // Stopwatch Core State
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [laps, setLaps] = useState<Lap[]>([]);

  // Animation / Time Reference
  const animFrameIdRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const accumulatedTimeRef = useRef<number>(0);
  const lastLapTimestampRef = useRef<number>(0);

  // Floating Pills State
  const [pills, setPills] = useState<FloatingPill[]>([]);
  const pillCounterRef = useRef<number>(0);

  // App Settings & Preferences
  const [theme, setTheme] = useState<AppTheme>('dark');
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [wakeLockActive, setWakeLockActive] = useState<boolean>(false);
  const wakeLockSentinelRef = useRef<any>(null);

  // Modals & PWA
  const [isInstallModalOpen, setIsInstallModalOpen] = useState<boolean>(false);
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState<boolean>(false);
  const [deferredInstallPrompt, setDeferredInstallPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState<boolean>(false);

  // Update audio muted status
  useEffect(() => {
    sound.setMuted(isMuted);
  }, [isMuted]);

  // PWA beforeinstallprompt Listener
  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredInstallPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleInstallApp = async () => {
    if (!deferredInstallPrompt) return;
    deferredInstallPrompt.prompt();
    const { outcome } = await deferredInstallPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstallable(false);
      setDeferredInstallPrompt(null);
      setIsInstallModalOpen(false);
    }
  };

  // Stopwatch Animation Loop with high precision
  const updateTimer = useCallback(() => {
    const now = performance.now();
    const currentElapsed = accumulatedTimeRef.current + (now - startTimeRef.current);
    setElapsedTime(currentElapsed);
    animFrameIdRef.current = requestAnimationFrame(updateTimer);
  }, []);

  // Start Stopwatch
  const handleStart = useCallback(() => {
    if (isRunning) return;
    startTimeRef.current = performance.now();
    setIsRunning(true);
    sound.playStart();
    animFrameIdRef.current = requestAnimationFrame(updateTimer);
  }, [isRunning, updateTimer]);

  // Pause Stopwatch
  const handlePause = useCallback(() => {
    if (!isRunning) return;
    if (animFrameIdRef.current) {
      cancelAnimationFrame(animFrameIdRef.current);
      animFrameIdRef.current = null;
    }
    const now = performance.now();
    accumulatedTimeRef.current += now - startTimeRef.current;
    setElapsedTime(accumulatedTimeRef.current);
    setIsRunning(false);
    sound.playPause();
  }, [isRunning]);

  // Reset Stopwatch
  const handleReset = useCallback(() => {
    if (animFrameIdRef.current) {
      cancelAnimationFrame(animFrameIdRef.current);
      animFrameIdRef.current = null;
    }
    accumulatedTimeRef.current = 0;
    startTimeRef.current = 0;
    lastLapTimestampRef.current = 0;
    setElapsedTime(0);
    setIsRunning(false);
    setLaps([]);
    sound.playReset();
  }, []);

  // Record Lap
  const handleLap = useCallback(() => {
    const current = accumulatedTimeRef.current + (isRunning ? performance.now() - startTimeRef.current : 0);
    const lapTime = current - lastLapTimestampRef.current;
    lastLapTimestampRef.current = current;

    const newLap: Lap = {
      id: `lap-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      lapNumber: laps.length + 1,
      lapTime: Math.max(0, lapTime),
      overallTime: current,
      timestamp: Date.now(),
    };

    setLaps((prev) => [...prev, newLap]);
    sound.playLap();
  }, [isRunning, laps.length]);

  // Create Floating Pill ("Botão de Flutuar que quando acionado cria uma pílula com o tempo cronometrado")
  const handleCreateFloatingPill = useCallback((timeToUse?: number, titleLabel?: string) => {
    const current = timeToUse !== undefined 
      ? timeToUse 
      : accumulatedTimeRef.current + (isRunning ? performance.now() - startTimeRef.current : 0);
    
    pillCounterRef.current += 1;
    const index = pillCounterRef.current;
    const colorIndex = (index - 1) % PILL_COLORS.length;

    // Calculate dynamic screen position with safe margin
    const screenW = typeof window !== 'undefined' ? window.innerWidth : 800;
    const screenH = typeof window !== 'undefined' ? window.innerHeight : 600;
    
    // Position offset
    const baseX = Math.min(screenW - 240, 20 + ((index - 1) * 25) % (screenW - 260));
    const baseY = Math.min(screenH - 120, 100 + ((index - 1) * 55) % (screenH - 220));

    const newPill: FloatingPill = {
      id: `pill-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title: titleLabel || `Marcação #${index}`,
      timeMs: current,
      isLive: false,
      createdAt: Date.now(),
      x: baseX,
      y: baseY,
      color: PILL_COLORS[colorIndex],
    };

    setPills((prev) => [...prev, newPill]);
    sound.playPillCreate();
  }, [isRunning]);

  // Add pill directly from a lap entry
  const handleAddPillFromLap = useCallback((lap: Lap) => {
    handleCreateFloatingPill(lap.lapTime, `Volta #${lap.lapNumber}`);
  }, [handleCreateFloatingPill]);

  // Remove pill
  const handleRemovePill = useCallback((id: string) => {
    setPills((prev) => prev.filter((p) => p.id !== id));
  }, []);

  // Clear all pills
  const handleClearAllPills = useCallback(() => {
    setPills([]);
  }, []);

  // Update pill properties
  const handleUpdatePill = useCallback((id: string, updates: Partial<FloatingPill>) => {
    setPills((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...updates } : p))
    );
  }, []);

  // Wake Lock handler
  const toggleWakeLock = async () => {
    if (wakeLockActive) {
      if (wakeLockSentinelRef.current) {
        await wakeLockSentinelRef.current.release();
        wakeLockSentinelRef.current = null;
      }
      setWakeLockActive(false);
    } else {
      if ('wakeLock' in navigator) {
        try {
          const sentinel = await (navigator as any).wakeLock.request('screen');
          wakeLockSentinelRef.current = sentinel;
          setWakeLockActive(true);
          sentinel.addEventListener('release', () => {
            setWakeLockActive(false);
            wakeLockSentinelRef.current = null;
          });
        } catch (err) {
          console.warn('Wake Lock request error:', err);
        }
      }
    }
  };

  // Keyboard Shortcuts Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in an input
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      switch (e.code) {
        case 'Space':
          e.preventDefault();
          if (isRunning) {
            handlePause();
          } else {
            handleStart();
          }
          break;
        case 'KeyL':
          e.preventDefault();
          if (isRunning) {
            handleLap();
          }
          break;
        case 'KeyR':
          e.preventDefault();
          handleReset();
          break;
        case 'KeyF':
          e.preventDefault();
          handleCreateFloatingPill();
          break;
        case 'KeyM':
          e.preventDefault();
          setIsMuted((prev) => !prev);
          break;
        case 'Escape':
          setIsInstallModalOpen(false);
          setIsShortcutsModalOpen(false);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isRunning, handleStart, handlePause, handleLap, handleReset, handleCreateFloatingPill]);

  // Clean up animation on unmount
  useEffect(() => {
    return () => {
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
      if (wakeLockSentinelRef.current) {
        wakeLockSentinelRef.current.release().catch(() => {});
      }
    };
  }, []);

  // Theme container classes
  const getThemeBg = () => {
    switch (theme) {
      case 'oled':
        return 'bg-black text-slate-100';
      case 'cyber':
        return 'bg-slate-950 text-cyan-50';
      default:
        return 'bg-slate-950 text-slate-100';
    }
  };

  return (
    <div className={`min-h-screen flex flex-col justify-between ${getThemeBg()} transition-colors duration-300 relative selection:bg-indigo-500 selection:text-white`}>
      {/* Floating Pills Interactive Layer */}
      <FloatingPillsLayer
        pills={pills}
        onRemovePill={handleRemovePill}
        onClearAllPills={handleClearAllPills}
        onUpdatePill={handleUpdatePill}
        liveTimeMs={elapsedTime}
        isStopwatchRunning={isRunning}
        onTogglePlayPause={isRunning ? handlePause : handleStart}
        onLap={handleLap}
      />

      {/* Persistent Floating Action Button */}
      <FloatingActionButton
        onClick={() => handleCreateFloatingPill()}
        pillCount={pills.length}
        isRunning={isRunning}
      />

      {/* Top Navigation */}
      <Navbar
        theme={theme}
        setTheme={setTheme}
        isMuted={isMuted}
        setIsMuted={setIsMuted}
        wakeLockActive={wakeLockActive}
        toggleWakeLock={toggleWakeLock}
        onOpenShortcuts={() => setIsShortcutsModalOpen(true)}
        onOpenInstallModal={() => setIsInstallModalOpen(true)}
        isInstallable={isInstallable}
        floatingPillCount={pills.length}
      />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col items-center justify-center max-w-5xl w-full mx-auto px-4 py-2">
        {/* Central Stopwatch Chronograph Display */}
        <StopwatchDisplay
          elapsedTime={elapsedTime}
          isRunning={isRunning}
          theme={theme}
          lastLapTime={laps.length > 0 ? laps[laps.length - 1].lapTime : undefined}
          totalLaps={laps.length}
        />

        {/* Stopwatch Action Controls & Flutuar Pill Button */}
        <div className="mt-2 mb-6 w-full">
          <StopwatchControls
            isRunning={isRunning}
            elapsedTime={elapsedTime}
            onStart={handleStart}
            onPause={handlePause}
            onReset={handleReset}
            onLap={handleLap}
            onCreatePill={() => handleCreateFloatingPill()}
            theme={theme}
          />
        </div>

        {/* Recorded Laps & History Table */}
        <LapsTable
          laps={laps}
          onAddPillFromLap={handleAddPillFromLap}
          onUpdateLapNote={(lapId, note) => {
            setLaps((prev) =>
              prev.map((l) => (l.id === lapId ? { ...l, note } : l))
            );
          }}
        />
      </main>

      {/* Footer */}
      <footer className="w-full max-w-5xl mx-auto px-4 py-4 text-center text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2 border-t border-slate-900">
        <div className="flex items-center gap-2">
          <span>Cronômetro Pro PWA</span>
          <span>•</span>
          <button
            type="button"
            onClick={() => setIsShortcutsModalOpen(true)}
            className="hover:text-slate-300 transition-colors underline"
          >
            Ver atalhos (Espaço / L / R / F)
          </button>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[11px] text-slate-600">Pressione <strong>F</strong> para flutuar o tempo</span>
        </div>
      </footer>

      {/* PWA Install & Shortcuts Modals */}
      <PwaInstallBanner
        isOpen={isInstallModalOpen}
        onClose={() => setIsInstallModalOpen(false)}
        onInstall={handleInstallApp}
        isInstallable={isInstallable}
      />

      <ShortcutsModal
        isOpen={isShortcutsModalOpen}
        onClose={() => setIsShortcutsModalOpen(false)}
      />
    </div>
  );
}
