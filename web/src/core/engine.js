// Renderer + game loop + post-processing (bloom/SMAA) + quality tiers incl. ULTRA.
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { SMAAPass } from 'three/examples/jsm/postprocessing/SMAAPass.js';

export class Engine {
  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(66, window.innerWidth / window.innerHeight, 0.1, 900);
    this.clock = new THREE.Clock();
    this.timeScale = 1;          // hitstop drops this briefly
    this._hitstop = 0;
    this.stats = { fps: 0, frameMs: 0, _acc: 0, _frames: 0 };
    this.quality = 'high';
    this.onBeforeRender = null;
    this._running = false;
    this._update = null;

    // post-processing chain: render -> bloom -> SMAA -> output(tonemap+sRGB)
    this.composer = new EffectComposer(this.renderer);
    this.renderPass = new RenderPass(this.scene, this.camera);
    this.bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth / 2, window.innerHeight / 2), 0.38, 0.65, 0.82);
    this.smaaPass = new SMAAPass(window.innerWidth, window.innerHeight);
    this.outputPass = new OutputPass();
    this.composer.addPass(this.renderPass);
    this.composer.addPass(this.bloomPass);
    this.composer.addPass(this.smaaPass);
    this.composer.addPass(this.outputPass);
    this.composerEnabled = true;

    window.addEventListener('resize', () => this._resize());
    this._resize();
  }

  _resize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.composer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  setQuality(q) {
    this.quality = q;
    const pr = window.devicePixelRatio || 1;
    if (q === 'low') {
      this.renderer.setPixelRatio(Math.min(pr, 1) * 0.75);
      this.renderer.shadowMap.enabled = false;
      this.composerEnabled = false;
    } else if (q === 'medium') {
      this.renderer.setPixelRatio(Math.min(pr, 1));
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFShadowMap;
      this.composerEnabled = true;
      this.bloomPass.enabled = false;
      this.smaaPass.enabled = true;
    } else if (q === 'high') {
      this.renderer.setPixelRatio(Math.min(pr, 1.5));
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      this.composerEnabled = true;
      this.bloomPass.enabled = true;
      this.smaaPass.enabled = true;
    } else { // ultra
      this.renderer.setPixelRatio(Math.min(pr, 2));
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      this.composerEnabled = true;
      this.bloomPass.enabled = true;
      this.bloomPass.strength = 0.46;
      this.smaaPass.enabled = true;
    }
    const shadowRes = q === 'ultra' ? 2560 : q === 'high' ? 2048 : 1024;
    this.scene.traverse((o) => {
      if (o.isDirectionalLight && o.shadow) {
        o.shadow.mapSize.setScalar(shadowRes);
        if (o.shadow.map) { o.shadow.map.dispose(); o.shadow.map = null; }
      }
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
      if (this.composerEnabled) this.composer.render(dt);
      else this.renderer.render(this.scene, this.camera);
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
