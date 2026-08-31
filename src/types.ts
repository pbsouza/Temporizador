export interface Lap {
  id: string;
  lapNumber: number;
  lapTime: number; // Duration of this specific lap in ms
  overallTime: number; // Total stopwatch time when lap was recorded
  timestamp: number;
  note?: string;
}

export interface FloatingPill {
  id: string;
  title: string;
  timeMs: number;
  isLive: boolean; // If true, reflects the running stopwatch
  lapIndex?: number;
  createdAt: number;
  x: number;
  y: number;
  color: 'indigo' | 'emerald' | 'amber' | 'rose' | 'cyan' | 'violet';
  isPinned?: boolean;
}

export type AppTheme = 'dark' | 'oled' | 'light' | 'cyber';

export interface StopwatchState {
  isRunning: boolean;
  elapsedTime: number;
  laps: Lap[];
}
