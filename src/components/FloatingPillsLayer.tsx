import React, { useState, useRef, useEffect } from 'react';
import { X, Copy, Check, Pin, GripVertical, Play, Pause, Flag, Sparkles, Edit2 } from 'lucide-react';
import { FloatingPill } from '../types';
import { formatTimeString } from '../utils/timeFormat';

interface FloatingPillsLayerProps {
  pills: FloatingPill[];
  onRemovePill: (id: string) => void;
  onClearAllPills: () => void;
  onUpdatePill: (id: string, updates: Partial<FloatingPill>) => void;
  liveTimeMs: number;
  isStopwatchRunning: boolean;
  onTogglePlayPause: () => void;
  onLap: () => void;
}

const colorMap = {
  indigo: {
    bg: 'bg-indigo-950/90 hover:bg-indigo-900/90',
    border: 'border-indigo-500/50',
    text: 'text-indigo-200',
    time: 'text-white',
    badge: 'bg-indigo-500/20 text-indigo-300',
    glow: 'shadow-indigo-500/20',
  },
  emerald: {
    bg: 'bg-emerald-950/90 hover:bg-emerald-900/90',
    border: 'border-emerald-500/50',
    text: 'text-emerald-200',
    time: 'text-white',
    badge: 'bg-emerald-500/20 text-emerald-300',
    glow: 'shadow-emerald-500/20',
  },
  amber: {
    bg: 'bg-amber-950/90 hover:bg-amber-900/90',
    border: 'border-amber-500/50',
    text: 'text-amber-200',
    time: 'text-white',
    badge: 'bg-amber-500/20 text-amber-300',
    glow: 'shadow-amber-500/20',
  },
  rose: {
    bg: 'bg-rose-950/90 hover:bg-rose-900/90',
    border: 'border-rose-500/50',
    text: 'text-rose-200',
    time: 'text-white',
    badge: 'bg-rose-500/20 text-rose-300',
    glow: 'shadow-rose-500/20',
  },
  cyan: {
    bg: 'bg-cyan-950/90 hover:bg-cyan-900/90',
    border: 'border-cyan-500/50',
    text: 'text-cyan-200',
    time: 'text-white',
    badge: 'bg-cyan-500/20 text-cyan-300',
    glow: 'shadow-cyan-500/20',
  },
  violet: {
    bg: 'bg-purple-950/90 hover:bg-purple-900/90',
    border: 'border-purple-500/50',
    text: 'text-purple-200',
    time: 'text-white',
    badge: 'bg-purple-500/20 text-purple-300',
    glow: 'shadow-purple-500/20',
  },
};

export const FloatingPillsLayer: React.FC<FloatingPillsLayerProps> = ({
  pills,
  onRemovePill,
  onClearAllPills,
  onUpdatePill,
  liveTimeMs,
  isStopwatchRunning,
  onTogglePlayPause,
  onLap,
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitleText, setEditTitleText] = useState('');

  // Dragging state
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const dragOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const handleCopy = (id: string, timeString: string) => {
    navigator.clipboard.writeText(timeString);
    setCopiedId(id);
    setTimeout(() => {
      setCopiedId(null);
    }, 1800);
  };

  const handleStartDrag = (id: string, clientX: number, clientY: number, currentX: number, currentY: number) => {
    setDraggingId(id);
    dragOffsetRef.current = {
      x: clientX - currentX,
      y: clientY - currentY,
    };
  };

  useEffect(() => {
    if (!draggingId) return;

    const handleMouseMove = (e: MouseEvent) => {
      const newX = Math.max(10, Math.min(window.innerWidth - 220, e.clientX - dragOffsetRef.current.x));
      const newY = Math.max(70, Math.min(window.innerHeight - 80, e.clientY - dragOffsetRef.current.y));
      onUpdatePill(draggingId, { x: newX, y: newY });
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        const touch = e.touches[0];
        const newX = Math.max(10, Math.min(window.innerWidth - 220, touch.clientX - dragOffsetRef.current.x));
        const newY = Math.max(70, Math.min(window.innerHeight - 80, touch.clientY - dragOffsetRef.current.y));
        onUpdatePill(draggingId, { x: newX, y: newY });
      }
    };

    const handleEndDrag = () => {
      setDraggingId(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleEndDrag);
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchend', handleEndDrag);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleEndDrag);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleEndDrag);
    };
  }, [draggingId, onUpdatePill]);

  if (pills.length === 0) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {/* Pills Container Header / Quick Clear Bar */}
      {pills.length > 1 && (
        <div className="fixed top-20 right-4 pointer-events-auto flex items-center gap-2 bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-800 shadow-lg">
          <span className="text-xs text-slate-400 font-medium">
            {pills.length} pílulas
          </span>
          <button
            id="clear-all-pills-btn"
            type="button"
            onClick={onClearAllPills}
            className="text-[11px] text-rose-400 hover:text-rose-300 font-medium hover:underline ml-1"
          >
            Limpar todas
          </button>
        </div>
      )}

      {/* Render each floating pill */}
      {pills.map((pill) => {
        const style = colorMap[pill.color] || colorMap.indigo;
        const displayTimeMs = pill.isLive ? liveTimeMs : pill.timeMs;
        const timeString = formatTimeString(displayTimeMs, true);
        const isEditing = editingId === pill.id;

        return (
          <div
            key={pill.id}
            id={`floating-pill-${pill.id}`}
            style={{
              transform: `translate3d(${pill.x}px, ${pill.y}px, 0)`,
              touchAction: 'none',
            }}
            className={`absolute top-0 left-0 pointer-events-auto backdrop-blur-md rounded-2xl border shadow-xl transition-shadow ${style.bg} ${style.border} ${style.glow} select-none flex items-center p-1.5 sm:p-2 gap-2 text-xs font-sans animate-in fade-in zoom-in-95 duration-200`}
          >
            {/* Drag Handle */}
            <div
              onMouseDown={(e) => {
                e.preventDefault();
                handleStartDrag(pill.id, e.clientX, e.clientY, pill.x, pill.y);
              }}
              onTouchStart={(e) => {
                if (e.touches.length > 0) {
                  handleStartDrag(pill.id, e.touches[0].clientX, e.touches[0].clientY, pill.x, pill.y);
                }
              }}
              className="cursor-grab active:cursor-grabbing p-1 text-slate-400 hover:text-slate-200 transition-colors flex items-center justify-center"
              title="Arraste para reposicionar a pílula"
            >
              <GripVertical className="w-3.5 h-3.5" />
            </div>

            {/* Pill Information */}
            <div className="flex flex-col pr-1">
              {/* Title / Tag */}
              <div className="flex items-center gap-1.5">
                {isEditing ? (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      onUpdatePill(pill.id, { title: editTitleText || pill.title });
                      setEditingId(null);
                    }}
                    className="flex items-center gap-1"
                  >
                    <input
                      type="text"
                      value={editTitleText}
                      onChange={(e) => setEditTitleText(e.target.value)}
                      onBlur={() => {
                        onUpdatePill(pill.id, { title: editTitleText || pill.title });
                        setEditingId(null);
                      }}
                      autoFocus
                      className="text-[11px] font-semibold bg-slate-900 text-white px-1.5 py-0.5 rounded border border-indigo-400 w-24 outline-none"
                    />
                  </form>
                ) : (
                  <div
                    onClick={() => {
                      setEditTitleText(pill.title);
                      setEditingId(pill.id);
                    }}
                    className="flex items-center gap-1 cursor-pointer group"
                    title="Clique para renomear"
                  >
                    <span className={`text-[11px] font-semibold tracking-wide uppercase px-1.5 py-0.2 rounded-md ${style.badge}`}>
                      {pill.title}
                    </span>
                    <Edit2 className="w-2.5 h-2.5 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                )}

                {pill.isLive && (
                  <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                    LIVE
                  </span>
                )}
              </div>

              {/* Time display */}
              <div className="font-mono text-sm sm:text-base font-bold text-white tracking-tight flex items-baseline gap-1 mt-0.5">
                <span>{timeString}</span>
              </div>
            </div>

            {/* Live Controls if this pill is Live */}
            {pill.isLive && (
              <div className="flex items-center gap-1 border-l border-slate-700/60 pl-1.5">
                <button
                  type="button"
                  onClick={onTogglePlayPause}
                  className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-200 transition-colors"
                  title={isStopwatchRunning ? 'Pausar' : 'Iniciar'}
                >
                  {isStopwatchRunning ? (
                    <Pause className="w-3.5 h-3.5 fill-current" />
                  ) : (
                    <Play className="w-3.5 h-3.5 fill-current" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={onLap}
                  disabled={!isStopwatchRunning}
                  className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-200 disabled:opacity-40 transition-colors"
                  title="Volta"
                >
                  <Flag className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Actions: Copy & Close */}
            <div className="flex items-center gap-1 border-l border-slate-700/50 pl-1.5">
              <button
                type="button"
                onClick={() => handleCopy(pill.id, timeString)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800/60 transition-colors"
                title="Copiar tempo para a área de transferência"
              >
                {copiedId === pill.id ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>

              <button
                type="button"
                onClick={() => onRemovePill(pill.id)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-300 hover:bg-rose-500/20 transition-colors"
                title="Fechar pílula"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};
