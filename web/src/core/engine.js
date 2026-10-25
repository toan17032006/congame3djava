// Renderer + game loop + post-processing (GTAO/bloom/SMAA/grading) + quality tiers
// (low/medium/high/ultra/cinematic) + resolution scaling with adaptive hysteresis.
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { SMAAPass } from 'three/examples/jsm/postprocessing/SMAAPass.js';
import { GTAOPass } from 'three/examples/jsm/postprocessing/GTAOPass.js';
import { createGradingPass } from '../gfx/post.js';

const MIN_SCALE = 0.5, MAX_SCALE = 1.0;

export class Engine {
  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.info.autoReset = false; // composer passes reset per-render; we count per-frame
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(66, window.innerWidth / window.innerHeight, 0.1, 900);
    this.clock = new THREE.Clock();
    this.timeScale = 1;          // hitstop drops this briefly
    this._hitstop = 0;
    this.stats = { fps: 0, frameMs: 0, drawCalls: 0, renderScale: 1, _acc: 0, _frames: 0 };
    this.quality = 'high';
    this.onBeforeRender = null;
    this._running = false;
    this._update = null;

    // render-resolution abstraction: cssSize × devicePixelRatio × renderScale
    // renderScale < 1 renders internally smaller and the browser upscales to the canvas.
    this.dprCap = 1.5;
    this.renderScale = 1;
    this.options = { resolutionScale: 'auto', targetFps: 60, ao: true, grain: false };
    this._cool = 0; this._over = 0; this._under = 0; this._bootT = 0;

    // post-processing chain: render -> GTAO -> bloom -> SMAA -> grading -> output(tonemap+sRGB)
    this.composer = new EffectComposer(this.renderer);
    this.renderPass = new RenderPass(this.scene, this.camera);
    this.bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth / 2, window.innerHeight / 2), 0.38, 0.65, 0.82);
    this.smaaPass = new SMAAPass(window.innerWidth, window.innerHeight);
    this.gtaoPass = new GTAOPass(this.scene, this.camera, window.innerWidth, window.innerHeight);
    this.gtaoPass.output = GTAOPass.OUTPUT.Default;
    this.gtaoPass.blendIntensity = 0.9;
    this.gradingPass = createGradingPass();
    this.gradingPass.uniforms.uResolution.value = [window.innerWidth * (window.devicePixelRatio || 1), window.innerHeight * (window.devicePixelRatio || 1)];
    this.outputPass = new OutputPass();
    this.composer.addPass(this.renderPass);
    this.composer.addPass(this.gtaoPass);
    this.composer.addPass(this.bloomPass);
    this.composer.addPass(this.smaaPass);
    this.composer.addPass(this.gradingPass);
    this.composer.addPass(this.outputPass);
    this.composerEnabled = true;

    window.addEventListener('resize', () => this._resize());
    this._resize();
  }

  _resize() {
    const w = window.innerWidth, h = window.innerHeight;
    const dpr = window.devicePixelRatio || 1;
    this.gradingPass.uniforms.uResolution.value = [w * dpr, h * dpr];
    this.gtaoPass.setSize(w, h);
    this._applyResolution();
  }

  _applyResolution() {
    const w = window.innerWidth, h = window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, this.dprCap);
    const pr = Math.max(0.35, dpr * this.renderScale);
    this.renderer.setPixelRatio(pr);
    this.renderer.setSize(w, h, false); // CSS size unchanged: browser upscales the buffer
    this.composer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.stats.renderScale = this.renderScale;
  }

  setOptions(opts) {
    Object.assign(this.options, opts);
    const rs = this.options.resolutionScale;
    if (rs !== 'auto') this.renderScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, parseFloat(rs) || 1));
    this.gradingPass.uniforms.uGrain.value = this.options.grain ? 0.05 : 0;
    this._applyResolution();
  }

  setQuality(q) {
    this.quality = q;
    const pr = window.devicePixelRatio || 1;
    this.gtaoPass.enabled = this.options.ao;
    this.gradingPass.enabled = true;
    if (q === 'low') {
      this.dprCap = 1;
      this.renderer.shadowMap.enabled = false;
      this.composerEnabled = false;
      this.gradingPass.enabled = false; // direct render path: no grading
    } else if (q === 'medium') {
      this.dprCap = 1.25;
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFShadowMap;
      this.composerEnabled = true;
      this.bloomPass.enabled = false;
      this.smaaPass.enabled = true;
      this.gtaoPass.enabled = false;
    } else if (q === 'high') {
      this.dprCap = 1.5;
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      this.composerEnabled = true;
      this.bloomPass.enabled = true;
      this.smaaPass.enabled = true;
      this.gtaoPass.enabled = this.options.ao;
    } else if (q === 'ultra') {
      this.dprCap = 2;
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      this.composerEnabled = true;
      this.bloomPass.enabled = true;
      this.bloomPass.strength = 0.46;
      this.smaaPass.enabled = true;
      this.gtaoPass.enabled = this.options.ao;
    } else { // cinematic
      this.dprCap = Math.min(Math.max(pr, 2), 2.5); // allow native 4K UHD on HiDPI displays
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      this.composerEnabled = true;
      this.bloomPass.enabled = true;
      this.bloomPass.strength = 0.46;
      this.smaaPass.enabled = true;
      this.gtaoPass.enabled = this.options.ao;
    }
    const shadowRes = q === 'cinematic' ? 3072 : q === 'ultra' ? 2560 : q === 'high' ? 2048 : 1024;
    this.scene.traverse((o) => {
      if (o.isDirectionalLight && o.shadow) {
        o.shadow.mapSize.setScalar(shadowRes);
        if (o.shadow.map) { o.shadow.map.dispose(); o.shadow.map = null; }
      }
    });
    this._applyResolution();
  }

  // quality key for region builders (grass counts, terrain segments)
  get qualityKey() { return this.quality === 'cinematic' ? 'ultra' : this.quality; }

  hitstop(seconds) {
    this._hitstop = Math.max(this._hitstop, seconds);
  }

  _adaptive(rawDt) {
    this._bootT += rawDt;
    if (this._bootT < 1.5) return; // let the first frames settle
    const rs = this.options.resolutionScale;
    if (rs !== 'auto') return;
    const budget = 1000 / (this.options.targetFps || 60);
    const ms = this.stats.frameMs;
    this._cool -= rawDt;
    this._over = ms > budget * 1.15 ? this._over + rawDt : 0;
    this._under = ms < budget * 0.68 && this.renderScale < MAX_SCALE ? this._under + rawDt : 0;
    if (this._cool > 0) return;
    // hysteresis: sustained over-budget drops scale in steps, headroom raises it back
    if (this._over > 1.0 && this.renderScale > MIN_SCALE) {
      this.renderScale = Math.max(MIN_SCALE, this.renderScale * 0.9);
      this._applyResolution();
      this._cool = 1.5; this._over = 0; this._under = 0;
    } else if (this._under > 4) {
      this.renderScale = Math.min(MAX_SCALE, this.renderScale * 1.1);
      this._applyResolution();
      this._cool = 2.5; this._under = 0; this._over = 0;
    }
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
      this.renderer.info.reset();
      if (this._update) this._update(dt, rawDt);
      if (this.onBeforeRender) this.onBeforeRender();
      if (this.composerEnabled) this.composer.render(dt);
      else this.renderer.render(this.scene, this.camera);
      const ms = performance.now() - t0;
      this.stats.frameMs = this.stats.frameMs * 0.9 + ms * 0.1;
      this.stats.drawCalls = this.renderer.info.render.calls;
      this._adaptive(rawDt);
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
