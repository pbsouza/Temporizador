import React, { useState } from 'react';
import { Flag, TrendingUp, TrendingDown, Download, Copy, Check, Sparkles, Edit3 } from 'lucide-react';
import { Lap } from '../types';
import { formatTimeString, formatTimeComponents } from '../utils/timeFormat';

interface LapsTableProps {
  laps: Lap[];
  onAddPillFromLap: (lap: Lap) => void;
  onUpdateLapNote: (lapId: string, note: string) => void;
}

export const LapsTable: React.FC<LapsTableProps> = ({
  laps,
  onAddPillFromLap,
  onUpdateLapNote,
}) => {
  const [copied, setCopied] = useState(false);
  const [editingNoteLapId, setEditingNoteLapId] = useState<string | null>(null);
  const [noteInput, setNoteInput] = useState('');

  if (laps.length === 0) {
    return (
      <div className="w-full max-w-2xl mx-auto px-4 py-8 text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-slate-900/90 border border-slate-800 text-slate-500 mb-3">
          <Flag className="w-5 h-5" />
        </div>
        <h3 className="text-sm font-semibold text-slate-300">Nenhuma volta gravada</h3>
        <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
          Clique no botão <span className="text-slate-300 font-medium">Volta</span> (ou pressione <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px]">L</kbd>) para registrar tempos parciais.
        </p>
      </div>
    );
  }

  // Identify fastest and slowest laps if more than 1 lap
  let minLapTime = Infinity;
  let maxLapTime = -Infinity;
  let fastestLapId = '';
  let slowestLapId = '';

  if (laps.length > 1) {
    laps.forEach((lap) => {
      if (lap.lapTime < minLapTime) {
        minLapTime = lap.lapTime;
        fastestLapId = lap.id;
      }
      if (lap.lapTime > maxLapTime) {
        maxLapTime = lap.lapTime;
        slowestLapId = lap.id;
      }
    });
  }

  // Calculate statistics
  const totalTime = laps.reduce((acc, lap) => acc + lap.lapTime, 0);
  const avgLapTime = Math.round(totalTime / laps.length);

  // Copy lap summary
  const handleCopyLaps = () => {
    const header = "Volta\tTempo da Volta\tTempo Total\tNota\n";
    const rows = laps
      .map(
        (l) =>
          `Volta ${l.lapNumber}\t${formatTimeString(l.lapTime, true)}\t${formatTimeString(
            l.overallTime,
            true
          )}\t${l.note || ''}`
      )
      .join('\n');
    
    navigator.clipboard.writeText(header + rows);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Export as CSV
  const handleExportCSV = () => {
    const header = "Volta,Tempo_Volta,Tempo_Total,Nota\n";
    const rows = laps
      .map(
        (l) =>
          `${l.lapNumber},"${formatTimeString(l.lapTime, true)}","${formatTimeString(
            l.overallTime,
            true
          )}","${l.note || ''}"`
      )
      .join('\n');

    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `cronometro-voltas-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="w-full max-w-3xl mx-auto px-4 py-6">
      {/* Stats Header Bar */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        {/* Total Laps */}
        <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm">
          <span className="text-[11px] font-medium text-slate-400">Total de Voltas</span>
          <p className="text-base font-bold text-white mt-0.5">{laps.length}</p>
        </div>

        {/* Fastest Lap */}
        <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm">
          <span className="text-[11px] font-medium text-emerald-400 flex items-center gap-1">
            <TrendingUp className="w-3 h-3" /> Melhor Volta
          </span>
          <p className="text-base font-bold font-mono text-emerald-300 mt-0.5">
            {minLapTime !== Infinity ? formatTimeString(minLapTime) : '--'}
          </p>
        </div>

        {/* Average Lap */}
        <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm">
          <span className="text-[11px] font-medium text-indigo-400">Tempo Médio</span>
          <p className="text-base font-bold font-mono text-indigo-300 mt-0.5">
            {formatTimeString(avgLapTime)}
          </p>
        </div>
      </div>

      {/* Laps Table Container */}
      <div className="rounded-2xl bg-slate-900/70 border border-slate-800/80 shadow-xl overflow-hidden backdrop-blur-md">
        {/* Table Toolbar */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-950/40">
          <div className="flex items-center gap-2">
            <Flag className="w-4 h-4 text-indigo-400" />
            <h3 className="text-sm font-semibold text-white">Histórico de Voltas</h3>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              id="copy-laps-btn"
              type="button"
              onClick={handleCopyLaps}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
              title="Copiar lista de voltas"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copiado!' : 'Copiar'}</span>
            </button>
            <button
              id="export-csv-btn"
              type="button"
              onClick={handleExportCSV}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
              title="Exportar como arquivo CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span>CSV</span>
            </button>
          </div>
        </div>

        {/* Laps List */}
        <div className="divide-y divide-slate-800/60 max-h-80 overflow-y-auto">
          {/* Header Row */}
          <div className="grid grid-cols-12 px-4 py-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider bg-slate-950/20">
            <div className="col-span-2">Volta</div>
            <div className="col-span-4">Tempo da Volta</div>
            <div className="col-span-4">Tempo Total</div>
            <div className="col-span-2 text-right">Ação</div>
          </div>

          {/* Render reversed list so newest lap is on top */}
          {laps.slice().reverse().map((lap) => {
            const isFastest = lap.id === fastestLapId;
            const isSlowest = lap.id === slowestLapId;
            const isEditing = editingNoteLapId === lap.id;

            return (
              <div
                key={lap.id}
                id={`lap-row-${lap.id}`}
                className={`grid grid-cols-12 items-center px-4 py-2.5 text-xs transition-colors hover:bg-slate-800/40 ${
                  isFastest
                    ? 'bg-emerald-950/20'
                    : isSlowest
                    ? 'bg-rose-950/20'
                    : ''
                }`}
              >
                {/* Lap Number & Badges */}
                <div className="col-span-2 flex items-center gap-1.5">
                  <span className="font-bold text-white">#{lap.lapNumber}</span>
                  {isFastest && (
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      Rápida
                    </span>
                  )}
                  {isSlowest && (
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                      Lenta
                    </span>
                  )}
                </div>

                {/* Lap Split Time */}
                <div className="col-span-4 font-mono font-bold text-slate-200">
                  <span className={isFastest ? 'text-emerald-400' : isSlowest ? 'text-rose-400' : ''}>
                    {formatTimeString(lap.lapTime)}
                  </span>
                </div>

                {/* Overall Accumulated Time */}
                <div className="col-span-4 font-mono text-slate-400">
                  {formatTimeString(lap.overallTime, true)}
                </div>

                {/* Flutuar esta Volta como Pílula */}
                <div className="col-span-2 flex items-center justify-end gap-1">
                  <button
                    type="button"
                    onClick={() => onAddPillFromLap(lap)}
                    className="p-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/25 text-indigo-300 hover:text-indigo-200 transition-colors"
                    title={`Criar pílula flutuante da Volta #${lap.lapNumber}`}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
