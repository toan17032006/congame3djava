// Renderer + game loop + quality management.
import * as THREE from 'three';

export class Engine {
  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(66, window.innerWidth / window.innerHeight, 0.1, 600);
    this.clock = new THREE.Clock();
    this.timeScale = 1;          // hitstop drops this briefly
    this._hitstop = 0;
    this.stats = { fps: 0, frameMs: 0, _acc: 0, _frames: 0 };
    this.quality = 'high';
    this.onBeforeRender = null;
    this._running = false;
    this._update = null;
    window.addEventListener('resize', () => this._resize());
    this._resize();
  }

  _resize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  setQuality(q) {
    this.quality = q;
    const pr = window.devicePixelRatio || 1;
    if (q === 'low') {
      this.renderer.setPixelRatio(Math.min(pr, 1) * 0.75);
      this.renderer.shadowMap.enabled = false;
    } else if (q === 'medium') {
      this.renderer.setPixelRatio(Math.min(pr, 1));
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFShadowMap;
    } else {
      this.renderer.setPixelRatio(Math.min(pr, 1.75));
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    }
    this.scene.traverse((o) => {
      if (o.isDirectionalLight && o.shadow) o.shadow.mapSize.setScalar(q === 'high' ? 2048 : 1024);
    });
  }

  hitstop(seconds) {
    this._hitstop = Math.max(this._hitstop, seconds);
  }

  start(updateFn) {
    this._update = updateFn;
    this._running = true;
    this.clock.start();
    const loop = () => {
      if (!this._running) return;
      requestAnimationFrame(loop);
      const rawDt = Math.min(this.clock.getDelta(), 0.05); // clamp long frames
      if (this._hitstop > 0) { this._hitstop -= rawDt; this.timeScale = 0.06; }
      else this.timeScale = 1;
      const dt = rawDt * this.timeScale;
      const t0 = performance.now();
      if (this._update) this._update(dt, rawDt);
      if (this.onBeforeRender) this.onBeforeRender();
      this.renderer.render(this.scene, this.camera);
      const ms = performance.now() - t0;
      this.stats.frameMs = this.stats.frameMs * 0.9 + ms * 0.1;
      this.stats._acc += rawDt; this.stats._frames++;
      if (this.stats._acc >= 0.5) {
        this.stats.fps = Math.round(this.stats._frames / this.stats._acc);
        this.stats._acc = 0; this.stats._frames = 0;
      }
    };
    requestAnimationFrame(loop);
  }

  stop() { this._running = false; }
}
