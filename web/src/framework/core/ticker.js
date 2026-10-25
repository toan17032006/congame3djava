// Ticker: vòng lặp game (rAF) tách khỏi renderer — dt clamp, timeScale, hitstop, FPS stats.
// Inject được schedule/now để test headless hoặc chạy server-side.
export class Ticker {
  constructor({ update, maxDt = 0.05, schedule = null, now = null } = {}) {
    if (typeof update !== 'function') throw new Error('Ticker: cần update(dt, rawDt)');
    this._update = update;
    this.maxDt = maxDt;
    this._schedule = schedule || ((cb) => {
      if (typeof requestAnimationFrame === 'function') requestAnimationFrame(cb);
      else setTimeout(() => cb(performance.now()), 16);
    });
    this._now = now || (() => performance.now());
    this.timeScale = 1;
    this._hitstop = 0;
    this._running = false;
    this._last = 0;
    this.stats = { fps: 0, frameMs: 0, _acc: 0, _frames: 0 };
    this._bound = () => this._tick();
  }

  hitstop(seconds) { this._hitstop = Math.max(this._hitstop, seconds); }

  start() {
    if (this._running) return;
    this._running = true;
    this._last = this._now();
    this._schedule(this._bound);
  }

  stop() { this._running = false; }

  _tick() {
    if (!this._running) return;
    this._schedule(this._bound);
    const now = this._now();
    const rawDt = Math.min((now - this._last) / 1000, this.maxDt);
    this._last = now;
    // hitstop: kéo timeScale về gần 0 trong N giây (efect chùm khi trúng đòn)
    if (this._hitstop > 0) { this._hitstop -= rawDt; this.timeScale = 0.06; }
    else this.timeScale = 1;
    const t0 = this._now();
    this._update(rawDt * this.timeScale, rawDt);
    const ms = this._now() - t0;
    this.stats.frameMs = this.stats.frameMs * 0.9 + ms * 0.1;
    this.stats._acc += rawDt; this.stats._frames++;
    if (this.stats._acc >= 0.5) {
      this.stats.fps = Math.round(this.stats._frames / this.stats._acc);
      this.stats._acc = 0; this.stats._frames = 0;
    }
  }
}
