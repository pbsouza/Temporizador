import { formatTimeString } from './timeFormat';

/**
 * Service to render a canvas-based video stream of the live stopwatch and trigger
 * standard Picture-in-Picture (PiP) or Document PiP.
 * 
 * Works natively on Android Chrome (Canvas Video PiP) and Desktop Chrome (Document PiP or Video PiP).
 * This allows the stopwatch pill to float over other apps in real-time.
 */
class FloatingPiPService {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private video: HTMLVideoElement | null = null;
  private isPiPActive = false;
  private animId: number | null = null;
  private getTimeFn: () => number = () => 0;
  private getIsRunningFn: () => boolean = () => false;
  private onToggleFn: () => void = () => {};
  private onLapFn: () => void = () => {};
  private onStateChangeCallback: ((active: boolean) => void) | null = null;

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

          // Setup Document PiP Window
          this.setupDocumentPiP(pipWindow);
          this.isPiPActive = true;
          this.onStateChangeCallback?.(true);
          return true;
        } catch (docErr) {
          console.warn('Document PiP failed, falling back to Video Canvas PiP:', docErr);
        }
      }

      // 2. Video Element Canvas Stream PiP (Universal for Android Chrome & Desktop)
      return await this.setupVideoCanvasPiP();
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
          background: #1e1b4b;
          border: 2px solid #6366f1;
          border-radius: 9999px;
          padding: 8px 16px;
          display: flex;
          align-items: center;
          gap: 12px;
          box-shadow: 0 10px 25px -5px rgba(99, 102, 241, 0.4);
          width: 100%;
          justify-content: space-between;
        }
        .time-box {
          display: flex;
          flex-direction: column;
        }
        .live-tag {
          font-size: 10px;
          font-weight: 700;
          color: #34d399;
          letter-spacing: 0.05em;
          text-transform: uppercase;
        }
        .time-display {
          font-family: monospace;
          font-size: 20px;
          font-weight: 800;
          color: #ffffff;
          letter-spacing: -0.5px;
        }
        .btn-group {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        button {
          background: #312e81;
          border: 1px solid #4f46e5;
          color: #fff;
          border-radius: 9999px;
          padding: 6px 12px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s;
        }
        button:hover { background: #4338ca; }
        button.primary { background: #6366f1; }
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

    const updateLoop = () => {
      if (!this.isPiPActive) return;
      const ms = this.getTimeFn();
      const running = this.getIsRunningFn();
      if (timeTxt) timeTxt.innerText = formatTimeString(ms, true);
      if (toggleBtn) toggleBtn.innerText = running ? 'Pausar' : 'Iniciar';
      if (statusTxt) {
        statusTxt.innerText = running ? '● AO VIVO' : '❚❚ PAUSADO';
        statusTxt.style.color = running ? '#34d399' : '#f59e0b';
      }
      requestAnimationFrame(updateLoop);
    };

    pipWindow.addEventListener('pagehide', () => {
      this.isPiPActive = false;
      this.onStateChangeCallback?.(false);
    });

    requestAnimationFrame(updateLoop);
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
        if (this.animId) {
          cancelAnimationFrame(this.animId);
          this.animId = null;
        }
        this.onStateChangeCallback?.(false);
      });
    }

    // Draw initial frame
    this.renderCanvasFrame();

    // Capture Canvas stream to video
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

    // Start render loop
    this.startCanvasRenderLoop();
    return true;
  }

  private startCanvasRenderLoop() {
    const loop = () => {
      if (!this.isPiPActive) return;
      this.renderCanvasFrame();
      this.animId = requestAnimationFrame(loop);
    };
    this.animId = requestAnimationFrame(loop);
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
    const pillX = 20;
    const pillY = 20;
    const pillW = width - 40;
    const pillH = height - 40;
    const radius = 35;

    // Outer Glow / Border
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(pillX, pillY, pillW, pillH, radius);
    ctx.fillStyle = '#111827';
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = isRunning ? '#6366f1' : '#475569';
    ctx.stroke();
    ctx.restore();

    // Status Indicator
    ctx.save();
    const dotX = pillX + 35;
    const dotY = pillY + 35;
    ctx.beginPath();
    ctx.arc(dotX, dotY, 6, 0, Math.PI * 2);
    ctx.fillStyle = isRunning ? '#10b981' : '#f59e0b';
    ctx.fill();

    ctx.font = 'bold 16px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.fillStyle = isRunning ? '#34d399' : '#fbbf24';
    ctx.fillText(isRunning ? 'CRONÔMETRO ATIVO' : 'CRONÔMETRO PAUSADO', dotX + 16, dotY + 5);
    ctx.restore();

    // Big Stopwatch Time Display
    ctx.save();
    ctx.font = 'bold 56px "SF Mono", Menlo, Consolas, monospace';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(timeFormatted, width / 2, pillY + pillH / 2 + 18);
    ctx.restore();
  }

  public async exitPiP(): Promise<void> {
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      }
      this.isPiPActive = false;
      if (this.animId) {
        cancelAnimationFrame(this.animId);
        this.animId = null;
      }
      this.onStateChangeCallback?.(false);
    } catch (err) {
      console.warn('Exit PiP warn:', err);
    }
  }
}

export const floatingPiP = new FloatingPiPService();
