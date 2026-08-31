import { formatTimeString } from './timeFormat';

/**
 * High-reliability Background & Picture-in-Picture Service for Stopwatch
 * 
 * Key challenges solved:
 * 1. Android / Chrome throttling when app is in background:
 *    - `requestAnimationFrame` pauses when tab is backgrounded.
 *    - Web Workers with `setInterval` run continuously without being throttled by the display engine.
 *    - Continuous silent audio playback prevents OS audio/media session from going to deep sleep.
 * 2. Canvas Video Stream updates:
 *    - Calling `videoTrack.requestFrame()` forces the PiP video window to render the latest canvas frame
 *      even when the main document is hidden / in background.
 * 3. MediaSession API:
 *    - Registers native Android / OS media notification with live playback position and actions (play, pause, next/lap).
 */
class FloatingPiPService {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private video: HTMLVideoElement | null = null;
  private isPiPActive = false;
  private worker: Worker | null = null;
  private bgIntervalId: any = null;

  private getTimeFn: () => number = () => 0;
  private getIsRunningFn: () => boolean = () => false;
  private onToggleFn: () => void = () => {};
  private onLapFn: () => void = () => {};
  private onStateChangeCallback: ((active: boolean) => void) | null = null;

  // Silent audio generator to keep process alive in background on mobile
  private audioCtx: AudioContext | null = null;
  private silentGain: GainNode | null = null;

  constructor() {
    this.initWorker();
    this.initVisibilityListener();
  }

  private initWorker() {
    if (typeof window === 'undefined') return;
    try {
      const blob = new Blob(
        [
          `
          let timer = null;
          self.onmessage = function(e) {
            if (e.data === 'start') {
              if (timer) clearInterval(timer);
              // Tick every 33ms (approx 30fps) for PiP and background updates
              timer = setInterval(function() {
                self.postMessage('tick');
              }, 33);
            } else if (e.data === 'stop') {
              if (timer) {
                clearInterval(timer);
                timer = null;
              }
            }
          };
        `
        ],
        { type: 'application/javascript' }
      );
      this.worker = new Worker(URL.createObjectURL(blob));
      this.worker.onmessage = () => {
        this.onWorkerTick();
      };
    } catch (e) {
      console.warn('Web Worker initialization for PiP background loop failed, using interval fallback:', e);
    }
  }

  private initVisibilityListener() {
    if (typeof document === 'undefined') return;
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        // Tab minimized or switched app
        if (this.isPiPActive || this.getIsRunningFn()) {
          this.startBackgroundHeartbeat();
        }
      } else {
        // Tab restored
        if (!this.isPiPActive && !this.getIsRunningFn()) {
          this.stopBackgroundHeartbeat();
        }
      }
    });
  }

  private startBackgroundHeartbeat() {
    if (this.worker) {
      this.worker.postMessage('start');
    } else if (!this.bgIntervalId) {
      this.bgIntervalId = setInterval(() => {
        this.onWorkerTick();
      }, 33);
    }
    this.ensureKeepAliveAudio();
  }

  private stopBackgroundHeartbeat() {
    if (this.worker) {
      this.worker.postMessage('stop');
    }
    if (this.bgIntervalId) {
      clearInterval(this.bgIntervalId);
      this.bgIntervalId = null;
    }
    this.stopKeepAliveAudio();
  }

  private ensureKeepAliveAudio() {
    try {
      if (!this.audioCtx) {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          this.audioCtx = new AudioCtx();
        }
      }
      if (this.audioCtx) {
        if (this.audioCtx.state === 'suspended') {
          this.audioCtx.resume().catch(() => {});
        }
        if (!this.silentGain) {
          const osc = this.audioCtx.createOscillator();
          this.silentGain = this.audioCtx.createGain();
          this.silentGain.gain.value = 0.0001; // Inaudible
          osc.connect(this.silentGain);
          this.silentGain.connect(this.audioCtx.destination);
          osc.start();
        }
      }
    } catch (e) {
      // Audio keep-alive ignore
    }
  }

  private stopKeepAliveAudio() {
    try {
      if (this.audioCtx && this.audioCtx.state === 'running') {
        this.audioCtx.suspend().catch(() => {});
      }
    } catch (e) {}
  }

  private onWorkerTick() {
    // 1. If PiP is active, force render frame
    if (this.isPiPActive) {
      this.renderCanvasFrame();
      // On browsers supporting canvas stream tracks, notify track of update
      if (this.video && this.video.srcObject) {
        const stream = this.video.srcObject as MediaStream;
        const track = stream.getVideoTracks()[0] as any;
        if (track && typeof track.requestFrame === 'function') {
          try {
            track.requestFrame();
          } catch (e) {}
        }
      }
    }

    // 2. Update MediaSession notification metadata if available
    this.updateMediaSession();
  }

  public isSupported(): boolean {
    if (typeof document === 'undefined') return false;
    return (
      'documentPictureInPicture' in window ||
      'pictureInPictureEnabled' in document ||
      !!(HTMLVideoElement.prototype as any).requestPictureInPicture
    );
  }

  public setCallbacks(
    getTime: () => number,
    getIsRunning: () => boolean,
    onToggle: () => void,
    onLap: () => void,
    onStateChange?: (active: boolean) => void
  ) {
    this.getTimeFn = getTime;
    this.getIsRunningFn = getIsRunning;
    this.onToggleFn = onToggle;
    this.onLapFn = onLap;
    if (onStateChange) {
      this.onStateChangeCallback = onStateChange;
    }
  }

  public getIsActive(): boolean {
    return this.isPiPActive;
  }

  /**
   * Request Picture-in-Picture mode with high-contrast live floating pill canvas
   */
  public async enterPiP(): Promise<boolean> {
    try {
      // 1. Try Document Picture-in-Picture (Desktop Chrome 116+)
      if ('documentPictureInPicture' in window) {
        try {
          const pipWindow = await (window as any).documentPictureInPicture.requestWindow({
            width: 320,
            height: 120,
          });

          this.setupDocumentPiP(pipWindow);
          this.isPiPActive = true;
          this.startBackgroundHeartbeat();
          this.onStateChangeCallback?.(true);
          return true;
        } catch (docErr) {
          console.warn('Document PiP failed, falling back to Video Canvas PiP:', docErr);
        }
      }

      // 2. Video Element Canvas Stream PiP (Universal for Android Chrome & Desktop)
      const success = await this.setupVideoCanvasPiP();
      if (success) {
        this.startBackgroundHeartbeat();
      }
      return success;
    } catch (err) {
      console.error('Error entering PiP mode:', err);
      return false;
    }
  }

  private setupDocumentPiP(pipWindow: Window) {
    const doc = pipWindow.document;
    doc.body.innerHTML = `
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
        body {
          background: #090d16;
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100vh;
          overflow: hidden;
          padding: 12px;
          user-select: none;
        }
        .pill {
          background: #111827;
          border: 2px solid #6366f1;
          border-radius: 9999px;
          padding: 10px 18px;
          display: flex;
          align-items: center;
          gap: 14px;
          box-shadow: 0 10px 25px -5px rgba(99, 102, 241, 0.4);
          width: 100%;
          justify-content: space-between;
        }
        .time-box {
          display: flex;
          flex-direction: column;
        }
        .live-tag {
          font-size: 11px;
          font-weight: 700;
          color: #34d399;
          letter-spacing: 0.05em;
          text-transform: uppercase;
        }
        .time-display {
          font-family: monospace;
          font-size: 22px;
          font-weight: 800;
          color: #ffffff;
          letter-spacing: -0.5px;
        }
        .btn-group {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        button {
          background: #1e1b4b;
          border: 1px solid #4f46e5;
          color: #fff;
          border-radius: 9999px;
          padding: 6px 14px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s;
        }
        button:hover { background: #312e81; }
        button.primary { background: #6366f1; border-color: #818cf8; }
        button.primary:hover { background: #4f46e5; }
      </style>
      <div class="pill">
        <div class="time-box">
          <span class="live-tag" id="pip-live-status">● AO VIVO</span>
          <span class="time-display" id="pip-time-txt">00:00.00</span>
        </div>
        <div class="btn-group">
          <button id="pip-toggle-btn" class="primary">Pausar</button>
          <button id="pip-lap-btn">Volta</button>
        </div>
      </div>
    `;

    const timeTxt = doc.getElementById('pip-time-txt');
    const toggleBtn = doc.getElementById('pip-toggle-btn');
    const lapBtn = doc.getElementById('pip-lap-btn');
    const statusTxt = doc.getElementById('pip-live-status');

    toggleBtn?.addEventListener('click', () => {
      this.onToggleFn();
    });

    lapBtn?.addEventListener('click', () => {
      this.onLapFn();
    });

    const updateDocPiP = () => {
      if (!this.isPiPActive) return;
      const ms = this.getTimeFn();
      const running = this.getIsRunningFn();
      if (timeTxt) timeTxt.innerText = formatTimeString(ms, true);
      if (toggleBtn) toggleBtn.innerText = running ? 'Pausar' : 'Iniciar';
      if (statusTxt) {
        statusTxt.innerText = running ? '● AO VIVO' : '❚❚ PAUSADO';
        statusTxt.style.color = running ? '#34d399' : '#f59e0b';
      }
    };

    // Use interval in pipWindow to guarantee updates even if parent throttles
    const interval = pipWindow.setInterval(updateDocPiP, 33);

    pipWindow.addEventListener('pagehide', () => {
      pipWindow.clearInterval(interval);
      this.isPiPActive = false;
      this.stopBackgroundHeartbeat();
      this.onStateChangeCallback?.(false);
    });
  }

  private async setupVideoCanvasPiP(): Promise<boolean> {
    // 1. Create or get offscreen Canvas
    if (!this.canvas) {
      this.canvas = document.createElement('canvas');
      this.canvas.width = 480;
      this.canvas.height = 180;
      this.ctx = this.canvas.getContext('2d');
    }

    // 2. Create or get Video element
    if (!this.video) {
      this.video = document.createElement('video');
      this.video.muted = true;
      this.video.playsInline = true;
      this.video.autoplay = true;
      this.video.style.position = 'fixed';
      this.video.style.bottom = '-9999px';
      this.video.style.right = '-9999px';
      this.video.style.opacity = '0';
      this.video.style.pointerEvents = 'none';
      document.body.appendChild(this.video);

      this.video.addEventListener('leavepictureinpicture', () => {
        this.isPiPActive = false;
        this.stopBackgroundHeartbeat();
        this.onStateChangeCallback?.(false);
      });
    }

    // Draw initial frame
    this.renderCanvasFrame();

    // Capture Canvas stream to video (30 FPS)
    const stream = (this.canvas as any).captureStream ? (this.canvas as any).captureStream(30) : null;
    if (!stream) {
      throw new Error('captureStream not supported');
    }

    this.video.srcObject = stream;
    await this.video.play();

    // Request Picture in Picture
    await this.video.requestPictureInPicture();
    this.isPiPActive = true;
    this.onStateChangeCallback?.(true);

    return true;
  }

  private renderCanvasFrame() {
    if (!this.ctx || !this.canvas) return;
    const ctx = this.ctx;
    const width = this.canvas.width;
    const height = this.canvas.height;
    const ms = this.getTimeFn();
    const isRunning = this.getIsRunningFn();
    const timeFormatted = formatTimeString(ms, true);

    // Background Canvas
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, width, height);

    // Floating Pill Card
    const pillX = 16;
    const pillY = 16;
    const pillW = width - 32;
    const pillH = height - 32;
    const radius = 32;

    // Outer Pill Background & Border
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(pillX, pillY, pillW, pillH, radius);
    ctx.fillStyle = '#111827';
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = isRunning ? '#6366f1' : '#475569';
    ctx.stroke();
    ctx.restore();

    // Status Indicator Dot & Text
    ctx.save();
    const dotX = pillX + 32;
    const dotY = pillY + 32;
    ctx.beginPath();
    ctx.arc(dotX, dotY, 6, 0, Math.PI * 2);
    ctx.fillStyle = isRunning ? '#10b981' : '#f59e0b';
    ctx.fill();

    ctx.font = 'bold 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = isRunning ? '#34d399' : '#fbbf24';
    ctx.fillText(isRunning ? 'CRONÔMETRO ATIVO' : 'CRONÔMETRO PAUSADO', dotX + 14, dotY + 5);
    ctx.restore();

    // Big Stopwatch Time Display (Crisp and legible)
    ctx.save();
    ctx.font = 'bold 56px "SF Mono", Menlo, Consolas, monospace';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(timeFormatted, width / 2, pillY + pillH / 2 + 18);
    ctx.restore();
  }

  private updateMediaSession() {
    if ('mediaSession' in navigator) {
      try {
        const ms = this.getTimeFn();
        const isRunning = this.getIsRunningFn();
        const timeFormatted = formatTimeString(ms, true);

        navigator.mediaSession.metadata = new MediaMetadata({
          title: `⏱️ ${timeFormatted}`,
          artist: isRunning ? 'Cronômetro em Execução' : 'Cronômetro Pausado',
          album: 'Cronômetro Pro PWA',
          artwork: [
            { src: './icon-192.png', sizes: '192x192', type: 'image/png' },
            { src: './icon-512.png', sizes: '512x512', type: 'image/png' }
          ]
        });

        navigator.mediaSession.playbackState = isRunning ? 'playing' : 'paused';

        navigator.mediaSession.setActionHandler('play', () => {
          if (!this.getIsRunningFn()) this.onToggleFn();
        });
        navigator.mediaSession.setActionHandler('pause', () => {
          if (this.getIsRunningFn()) this.onToggleFn();
        });
        navigator.mediaSession.setActionHandler('nexttrack', () => {
          this.onLapFn();
        });
      } catch (e) {}
    }
  }

  public notifyTimerChange(isRunning: boolean) {
    if (isRunning) {
      this.startBackgroundHeartbeat();
    } else if (!this.isPiPActive) {
      this.stopBackgroundHeartbeat();
    }
    this.updateMediaSession();
  }

  public async exitPiP(): Promise<void> {
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      }
      this.isPiPActive = false;
      if (!this.getIsRunningFn()) {
        this.stopBackgroundHeartbeat();
      }
      this.onStateChangeCallback?.(false);
    } catch (err) {
      console.warn('Exit PiP warn:', err);
    }
  }
}

export const floatingPiP = new FloatingPiPService();
