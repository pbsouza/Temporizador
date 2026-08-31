import { formatTimeString } from './timeFormat';

/**
 * High-reliability Background & Picture-in-Picture Service for Stopwatch
 * 
 * PiP Design:
 * - Ultra-sleek floating glass capsule (pill) matching the browser pill design
 * - Full interactive controls: Native OS PiP Play/Pause + Document PiP Buttons + MediaSession controls
 * - Transparent / backdrop glass aesthetic with glowing border, live pulse badge, and responsive time font
 * - Supports Document PiP (HTML/DOM floating window on Desktop Chrome 116+)
 * - Supports Video Canvas PiP (Universal floating window on Android Chrome / Desktop)
 */
class FloatingPiPService {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private video: HTMLVideoElement | null = null;
  private isPiPActive = false;
  private worker: Worker | null = null;
  private bgIntervalId: any = null;
  private isSyncingVideo = false;

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
        if (this.isPiPActive || this.getIsRunningFn()) {
          this.startBackgroundHeartbeat();
        }
      } else {
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
    // If PiP is active, force render frame
    if (this.isPiPActive) {
      this.renderCanvasFrame();
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

    // Update MediaSession notification metadata
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
    this.setupMediaSessionHandlers();
  }

  public getIsActive(): boolean {
    return this.isPiPActive;
  }

  /**
   * Request Picture-in-Picture mode with high-contrast floating pill design
   */
  public async enterPiP(): Promise<boolean> {
    try {
      // 1. Try Document Picture-in-Picture (Desktop Chrome 116+)
      if ('documentPictureInPicture' in window) {
        try {
          const pipWindow = await (window as any).documentPictureInPicture.requestWindow({
            width: 340,
            height: 90,
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
          background: rgba(8, 12, 22, 0.95);
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100vh;
          overflow: hidden;
          padding: 8px;
          user-select: none;
        }
        .pill-capsule {
          background: rgba(30, 27, 75, 0.85);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1.5px solid rgba(99, 102, 241, 0.6);
          border-radius: 9999px;
          padding: 6px 14px 6px 16px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          width: 100%;
          height: 100%;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 0 20px rgba(99, 102, 241, 0.25);
          cursor: pointer;
        }
        .pill-info {
          display: flex;
          flex-direction: column;
          gap: 1px;
        }
        .pill-header {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .badge-tag {
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          padding: 1px 6px;
          border-radius: 4px;
          background: rgba(99, 102, 241, 0.3);
          color: #c7d2fe;
        }
        .live-indicator {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.05em;
          color: #34d399;
          text-transform: uppercase;
        }
        .live-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #34d399;
          box-shadow: 0 0 8px #34d399;
          animation: pulse 1.5s infinite;
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.85); }
        }
        .time-display {
          font-family: "SF Mono", "Roboto Mono", Consolas, monospace;
          font-size: 20px;
          font-weight: 800;
          color: #ffffff;
          letter-spacing: -0.5px;
          text-shadow: 0 2px 4px rgba(0,0,0,0.5);
        }
        .btn-group {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .btn-ctrl {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
          border-radius: 9999px;
          padding: 6px 14px;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          border: 1px solid rgba(255, 255, 255, 0.15);
          transition: all 0.15s ease;
          outline: none;
        }
        .btn-ctrl:active {
          transform: scale(0.95);
        }
        .btn-play-pause {
          background: #4f46e5;
          color: #ffffff;
          border-color: #818cf8;
          box-shadow: 0 4px 12px rgba(79, 70, 229, 0.4);
        }
        .btn-play-pause.running {
          background: #d97706;
          border-color: #fbbf24;
          box-shadow: 0 4px 12px rgba(217, 119, 6, 0.4);
        }
        .btn-lap {
          background: rgba(30, 41, 59, 0.8);
          color: #cbd5e1;
          border-color: rgba(71, 85, 105, 0.8);
        }
        .btn-lap:hover {
          background: rgba(51, 65, 85, 0.9);
          color: #fff;
        }
      </style>
      <div class="pill-capsule" id="pip-capsule-container">
        <div class="pill-info">
          <div class="pill-header">
            <span class="badge-tag">CRONÔMETRO</span>
            <span class="live-indicator" id="pip-live-status">
              <span class="live-dot" id="pip-live-dot"></span>
              <span id="pip-live-txt">AO VIVO</span>
            </span>
          </div>
          <div class="time-display" id="pip-time-txt">00:00.00</div>
        </div>
        <div class="btn-group">
          <button id="pip-toggle-btn" class="btn-ctrl btn-play-pause">Pausar</button>
          <button id="pip-lap-btn" class="btn-ctrl btn-lap">Volta</button>
        </div>
      </div>
    `;

    const capsuleContainer = doc.getElementById('pip-capsule-container');
    const timeTxt = doc.getElementById('pip-time-txt');
    const toggleBtn = doc.getElementById('pip-toggle-btn');
    const lapBtn = doc.getElementById('pip-lap-btn');
    const statusTxt = doc.getElementById('pip-live-txt');
    const dot = doc.getElementById('pip-live-dot');

    toggleBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.onToggleFn();
    });

    lapBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.onLapFn();
    });

    // Clicking the capsule body also triggers toggle
    capsuleContainer?.addEventListener('click', (e) => {
      if ((e.target as HTMLElement)?.tagName !== 'BUTTON') {
        this.onToggleFn();
      }
    });

    const updateDocPiP = () => {
      if (!this.isPiPActive) return;
      const ms = this.getTimeFn();
      const running = this.getIsRunningFn();
      if (timeTxt) timeTxt.innerText = formatTimeString(ms, true);
      if (toggleBtn) {
        toggleBtn.innerText = running ? 'Pausar' : 'Iniciar';
        if (running) {
          toggleBtn.className = 'btn-ctrl btn-play-pause running';
        } else {
          toggleBtn.className = 'btn-ctrl btn-play-pause';
        }
      }
      if (statusTxt && dot) {
        statusTxt.innerText = running ? 'AO VIVO' : 'PAUSADO';
        statusTxt.style.color = running ? '#34d399' : '#f59e0b';
        dot.style.background = running ? '#34d399' : '#f59e0b';
        dot.style.boxShadow = running ? '0 0 8px #34d399' : 'none';
        dot.style.animation = running ? 'pulse 1.5s infinite' : 'none';
      }
    };

    const interval = pipWindow.setInterval(updateDocPiP, 33);

    pipWindow.addEventListener('pagehide', () => {
      pipWindow.clearInterval(interval);
      this.isPiPActive = false;
      this.stopBackgroundHeartbeat();
      this.onStateChangeCallback?.(false);
    });
  }

  private async setupVideoCanvasPiP(): Promise<boolean> {
    // 1. Create or get offscreen Canvas with high-DPI aspect ratio
    if (!this.canvas) {
      this.canvas = document.createElement('canvas');
      this.canvas.width = 480;
      this.canvas.height = 140;
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

      // Handle OS PiP Window Play / Pause native controls
      this.video.addEventListener('play', () => {
        if (this.isSyncingVideo) return;
        if (!this.getIsRunningFn()) {
          this.onToggleFn();
        }
      });

      this.video.addEventListener('pause', () => {
        if (this.isSyncingVideo) return;
        if (this.getIsRunningFn()) {
          this.onToggleFn();
        }
      });

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
    this.isSyncingVideo = true;
    try {
      await this.video.play();
    } finally {
      this.isSyncingVideo = false;
    }

    // Request Picture in Picture
    await this.video.requestPictureInPicture();
    this.isPiPActive = true;
    this.onStateChangeCallback?.(true);

    return true;
  }

  /**
   * Renders the floating pill canvas with modern glassmorphism aesthetic,
   * translucent pill capsule, crisp glowing border, tag badge and live status indicator.
   */
  private renderCanvasFrame() {
    if (!this.ctx || !this.canvas) return;
    const ctx = this.ctx;
    const width = this.canvas.width;
    const height = this.canvas.height;
    const ms = this.getTimeFn();
    const isRunning = this.getIsRunningFn();
    const timeFormatted = formatTimeString(ms, true);

    // 1. Dark Clean Canvas Background
    ctx.fillStyle = '#070b14';
    ctx.fillRect(0, 0, width, height);

    // 2. Floating Capsule Outer Geometry
    const margin = 10;
    const pillX = margin;
    const pillY = margin;
    const pillW = width - margin * 2;
    const pillH = height - margin * 2;
    const radius = pillH / 2; // Perfect full pill capsule

    // 3. Ambient Glow underneath pill
    ctx.save();
    ctx.shadowColor = isRunning ? 'rgba(99, 102, 241, 0.45)' : 'rgba(30, 41, 59, 0.3)';
    ctx.shadowBlur = 18;
    ctx.beginPath();
    ctx.roundRect(pillX, pillY, pillW, pillH, radius);
    ctx.fillStyle = isRunning ? '#181438' : '#0f172a';
    ctx.fill();
    ctx.restore();

    // 4. Glass Capsule Gradient & Fill
    ctx.save();
    const grad = ctx.createLinearGradient(pillX, pillY, pillX + pillW, pillY + pillH);
    if (isRunning) {
      grad.addColorStop(0, 'rgba(30, 27, 75, 0.95)');
      grad.addColorStop(1, 'rgba(49, 46, 129, 0.85)');
    } else {
      grad.addColorStop(0, 'rgba(15, 23, 42, 0.95)');
      grad.addColorStop(1, 'rgba(30, 41, 59, 0.85)');
    }
    ctx.beginPath();
    ctx.roundRect(pillX, pillY, pillW, pillH, radius);
    ctx.fillStyle = grad;
    ctx.fill();

    // Capsule Border with glowing highlight
    ctx.lineWidth = 3;
    ctx.strokeStyle = isRunning ? '#6366f1' : '#475569';
    ctx.stroke();
    ctx.restore();

    // 5. Left Section: Tag Badge & Live Pulse Dot
    const leftContentX = pillX + 28;

    // Tag badge background
    ctx.save();
    ctx.fillStyle = isRunning ? 'rgba(99, 102, 241, 0.35)' : 'rgba(71, 85, 105, 0.35)';
    ctx.beginPath();
    ctx.roundRect(leftContentX, pillY + 22, 92, 22, 6);
    ctx.fill();

    // Tag text
    ctx.font = 'bold 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = isRunning ? '#c7d2fe' : '#94a3b8';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('CRONÔMETRO', leftContentX + 46, pillY + 33);
    ctx.restore();

    // Live Pulse Dot & Text
    ctx.save();
    const dotX = leftContentX + 104;
    const dotY = pillY + 33;
    ctx.beginPath();
    ctx.arc(dotX, dotY, 4.5, 0, Math.PI * 2);
    ctx.fillStyle = isRunning ? '#34d399' : '#f59e0b';
    ctx.fill();

    if (isRunning) {
      ctx.shadowColor = '#34d399';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(dotX, dotY, 4.5, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.font = 'bold 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = isRunning ? '#34d399' : '#fbbf24';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(isRunning ? 'AO VIVO' : 'PAUSADO', dotX + 8, dotY);
    ctx.restore();

    // 6. Main Live Time Display (Large, clean monospace typography)
    ctx.save();
    ctx.font = 'bold 44px "SF Mono", "Roboto Mono", Menlo, Consolas, monospace';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
    ctx.shadowBlur = 6;
    ctx.fillText(timeFormatted, leftContentX, pillY + 76);
    ctx.restore();

    // 7. Right Section: Action Controls Badges (Visual indicator in canvas PiP)
    const rightX = pillX + pillW - 28;
    const btnH = 36;
    const btnW = 86;
    const btnY = pillY + (pillH - btnH) / 2;

    ctx.save();
    // Play/Pause Action Capsule
    ctx.beginPath();
    ctx.roundRect(rightX - btnW, btnY, btnW, btnH, 18);
    ctx.fillStyle = isRunning ? '#d97706' : '#4f46e5';
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = isRunning ? '#fbbf24' : '#818cf8';
    ctx.stroke();

    ctx.font = 'bold 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(isRunning ? '❚❚ Pausar' : '▶ Iniciar', rightX - btnW / 2, btnY + btnH / 2);
    ctx.restore();
  }

  private setupMediaSessionHandlers() {
    if ('mediaSession' in navigator) {
      try {
        navigator.mediaSession.setActionHandler('play', () => {
          if (!this.getIsRunningFn()) {
            this.onToggleFn();
          }
        });
        navigator.mediaSession.setActionHandler('pause', () => {
          if (this.getIsRunningFn()) {
            this.onToggleFn();
          }
        });
        navigator.mediaSession.setActionHandler('stop', () => {
          if (this.getIsRunningFn()) {
            this.onToggleFn();
          }
        });
        navigator.mediaSession.setActionHandler('nexttrack', () => {
          this.onLapFn();
        });
        navigator.mediaSession.setActionHandler('previoustrack', () => {
          this.onToggleFn();
        });
      } catch (e) {}
    }
  }

  private updateMediaSession() {
    if ('mediaSession' in navigator) {
      try {
        const ms = this.getTimeFn();
        const isRunning = this.getIsRunningFn();
        const timeFormatted = formatTimeString(ms, true);

        navigator.mediaSession.metadata = new MediaMetadata({
          title: `⏱️ ${timeFormatted}`,
          artist: isRunning ? 'Cronômetro Rodando' : 'Cronômetro Pausado',
          album: 'Cronômetro Pro PWA',
          artwork: [
            { src: './icon-192.png', sizes: '192x192', type: 'image/png' },
            { src: './icon-512.png', sizes: '512x512', type: 'image/png' }
          ]
        });

        navigator.mediaSession.playbackState = isRunning ? 'playing' : 'paused';
      } catch (e) {}
    }
  }

  public notifyTimerChange(isRunning: boolean) {
    if (isRunning) {
      this.startBackgroundHeartbeat();
    } else if (!this.isPiPActive) {
      this.stopBackgroundHeartbeat();
    }

    // Sync video element playback state with timer state
    if (this.video && this.isPiPActive) {
      this.isSyncingVideo = true;
      if (isRunning) {
        if (this.video.paused) {
          this.video.play().catch(() => {}).finally(() => {
            this.isSyncingVideo = false;
          });
        } else {
          this.isSyncingVideo = false;
        }
      } else {
        if (!this.video.paused) {
          this.video.pause();
        }
        this.isSyncingVideo = false;
      }
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
