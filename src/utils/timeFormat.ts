export interface TimeComponents {
  hours: string;
  minutes: string;
  seconds: string;
  milliseconds: string;
  totalMs: number;
}

export function formatTimeComponents(ms: number): TimeComponents {
  const safeMs = Math.max(0, Math.floor(ms));
  
  const totalSeconds = Math.floor(safeMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const hundredths = Math.floor((safeMs % 1000) / 10);

  return {
    hours: hours.toString().padStart(2, '0'),
    minutes: minutes.toString().padStart(2, '0'),
    seconds: seconds.toString().padStart(2, '0'),
    milliseconds: hundredths.toString().padStart(2, '0'),
    totalMs: safeMs,
  };
}

export function formatTimeString(ms: number, includeHours: boolean = false): string {
  const { hours, minutes, seconds, milliseconds } = formatTimeComponents(ms);
  if (includeHours || parseInt(hours, 10) > 0) {
    return `${hours}:${minutes}:${seconds}.${milliseconds}`;
  }
  return `${minutes}:${seconds}.${milliseconds}`;
}

export function formatTimeShort(ms: number): string {
  const { hours, minutes, seconds, milliseconds } = formatTimeComponents(ms);
  if (parseInt(hours, 10) > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  }
  return `${minutes}:${seconds}.${milliseconds}`;
}
