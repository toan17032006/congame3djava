// WebAudio synthesized SFX + ambient + procedural koto-ish music. No audio files needed.
export class AudioMgr {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.sfxGain = null;
    this.ambGain = null;
    this.musicGain = null;
    this.noiseBuf = null;
    this.musicTimer = null;
    this.ambientSource = null;
    this.enabled = true;
    this.volumes = { master: 0.8, sfx: 0.9, ambient: 0.5, music: 0.5 };
  }

  ensure() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return true; }
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch { this.enabled = false; return false; }
    this.master = this.ctx.createGain();
    this.master.connect(this.ctx.destination);
    this.sfxGain = this.ctx.createGain();
    this.sfxGain.connect(this.master);
    this.ambGain = this.ctx.createGain();
    this.ambGain.connect(this.master);
    this.musicGain = this.ctx.createGain();
    this.musicGain.connect(this.master);
    this.applyVolumes();
    const len = this.ctx.sampleRate * 1.2;
    this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return true;
  }

  applyVolumes() {
    if (!this.ctx) return;
    this.master.gain.value = this.volumes.master;
    this.sfxGain.gain.value = this.volumes.sfx;
    this.ambGain.gain.value = this.volumes.ambient;
    this.musicGain.gain.value = this.volumes.music;
  }

  setVolume(key, v) { this.volumes[key] = v; this.applyVolumes(); }

  _noise(dur, { freq = 1200, q = 1, type = 'bandpass', vol = 0.5, sweepTo = null, when = 0 } = {}) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + when;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    src.loop = true;
    const f = this.ctx.createBiquadFilter();
    f.type = type; f.frequency.value = freq; f.Q.value = q;
    if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, t + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(f); f.connect(g); g.connect(this.sfxGain);
    src.start(t); src.stop(t + dur + 0.05);
  }

  _tone(f0, f1, dur, { type = 'sine', vol = 0.3, when = 0, dest = null } = {}) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + when;
    const o = this.ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    if (f1) o.frequency.exponentialRampToValueAtTime(Math.max(f1, 1), t + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(dest || this.sfxGain);
    o.start(t); o.stop(t + dur + 0.05);
  }

  sfx(name) {
    if (!this.enabled || !this.ctx) return;
    switch (name) {
      case 'swing': this._noise(0.18, { freq: 900, sweepTo: 3800, q: 2, vol: 0.25 }); break;
      case 'swingHeavy': this._noise(0.3, { freq: 500, sweepTo: 2400, q: 2.5, vol: 0.35 }); this._tone(160, 60, 0.25, { type: 'sine', vol: 0.12 }); break;
      case 'hit': this._noise(0.12, { freq: 2400, q: 1, vol: 0.4 }); this._tone(180, 50, 0.14, { type: 'square', vol: 0.2 }); break;
      case 'hitHeavy': this._noise(0.2, { freq: 1400, q: 1, vol: 0.5 }); this._tone(120, 35, 0.24, { type: 'square', vol: 0.3 }); break;
      case 'block': this._tone(2200, 1400, 0.1, { type: 'square', vol: 0.18 }); this._noise(0.08, { freq: 4000, q: 3, vol: 0.25 }); break;
      case 'parry': this._tone(2600, 3400, 0.22, { type: 'triangle', vol: 0.3 }); this._tone(3900, 2600, 0.3, { type: 'sine', vol: 0.16, when: 0.02 }); break;
      case 'clang': this._tone(1800, 900, 0.18, { type: 'square', vol: 0.22 }); this._noise(0.1, { freq: 3200, q: 4, vol: 0.2 }); break;
      case 'dodge': this._noise(0.22, { freq: 600, sweepTo: 2000, q: 1.5, vol: 0.2 }); break;
      case 'step': this._noise(0.06, { freq: 300, q: 1.2, vol: 0.1 }); break;
      case 'pickup': this._tone(660, 880, 0.1, { type: 'triangle', vol: 0.22 }); this._tone(990, 1320, 0.12, { type: 'triangle', vol: 0.16, when: 0.08 }); break;
      case 'coin': this._tone(1320, 1760, 0.08, { type: 'square', vol: 0.12 }); this._tone(1760, 2200, 0.1, { type: 'square', vol: 0.1, when: 0.06 }); break;
      case 'levelup': [523, 659, 784, 1047].forEach((f, i) => this._tone(f, f, 0.24, { type: 'triangle', vol: 0.22, when: i * 0.1 })); break;
      case 'quest': [659, 784, 988].forEach((f, i) => this._tone(f, f, 0.2, { type: 'sine', vol: 0.2, when: i * 0.09 })); break;
      case 'death': this._tone(220, 55, 0.9, { type: 'sawtooth', vol: 0.25 }); this._noise(0.7, { freq: 400, sweepTo: 90, q: 1, vol: 0.2 }); break;
      case 'roar': this._tone(90, 45, 1.1, { type: 'sawtooth', vol: 0.4 }); this._noise(1.0, { freq: 250, sweepTo: 70, q: 0.8, vol: 0.35 }); break;
      case 'arrow': this._noise(0.3, { freq: 2600, sweepTo: 500, q: 6, vol: 0.2 }); break;
      case 'fire': this._noise(0.5, { freq: 700, q: 0.7, vol: 0.3, sweepTo: 300 }); this._tone(140, 70, 0.4, { type: 'sawtooth', vol: 0.1 }); break;
      case 'thud': this._tone(90, 38, 0.26, { type: 'sine', vol: 0.42 }); this._noise(0.16, { freq: 500, q: 0.8, vol: 0.3 }); break;
      case 'heal': this._tone(520, 780, 0.25, { type: 'sine', vol: 0.2 }); this._tone(780, 1170, 0.3, { type: 'sine', vol: 0.14, when: 0.12 }); break;
      case 'gate': this._tone(196, 98, 0.7, { type: 'triangle', vol: 0.3 }); this._tone(392, 196, 0.7, { type: 'sine', vol: 0.2, when: 0.05 }); break;
      case 'ui': this._tone(880, 940, 0.05, { type: 'triangle', vol: 0.1 }); break;
      case 'craft': this._tone(440, 330, 0.12, { type: 'square', vol: 0.16 }); this._noise(0.14, { freq: 3000, q: 3, vol: 0.16, when: 0.04 }); this._tone(550, 660, 0.16, { type: 'triangle', vol: 0.16, when: 0.16 }); break;
      case 'unlock': this._tone(523, 523, 0.15, { type: 'triangle', vol: 0.2 }); this._tone(784, 784, 0.2, { type: 'triangle', vol: 0.2, when: 0.12 }); this._tone(1047, 1047, 0.3, { type: 'triangle', vol: 0.2, when: 0.24 }); break;
    }
  }

  startAmbient(type = 'wind') {
    if (!this.ctx || this.ambientSource) return;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    src.loop = true;
    const f = this.ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = type === 'rain' ? 1400 : 380;
    const g = this.ctx.createGain();
    g.gain.value = type === 'rain' ? 0.16 : 0.05;
    // slow LFO on gain for wind gusts
    const lfo = this.ctx.createOscillator();
    lfo.frequency.value = 0.13;
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = type === 'rain' ? 0.03 : 0.025;
    lfo.connect(lfoGain); lfoGain.connect(g.gain);
    src.connect(f); f.connect(g); g.connect(this.ambGain);
    src.start(); lfo.start();
    this.ambientSource = { src, lfo, g };
  }

  stopAmbient() {
    if (this.ambientSource) {
      try { this.ambientSource.src.stop(); this.ambientSource.lfo.stop(); } catch {}
      this.ambientSource = null;
    }
  }

  startMusic() {
    if (!this.ctx || this.musicTimer) return;
    const scale = [220, 247.5, 293.33, 329.63, 392, 440, 493.88]; // pentatonic-ish D
    let last = 3;
    const pluck = (freq, when, vol) => {
      const t = this.ctx.currentTime + when;
      const o = this.ctx.createOscillator();
      o.type = 'triangle';
      o.frequency.value = freq;
      const o2 = this.ctx.createOscillator();
      o2.type = 'sine'; o2.frequency.value = freq * 2.01;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + 0.015);
      g.gain.exponentialRampToValueAtTime(0.001, t + 1.6);
      const g2 = this.ctx.createGain(); g2.gain.value = 0.25;
      o.connect(g); o2.connect(g2); g2.connect(g);
      g.connect(this.musicGain);
      o.start(t); o.stop(t + 1.7); o2.start(t); o2.stop(t + 1.7);
    };
    const tick = () => {
      if (Math.random() < 0.75) {
        last = Math.max(0, Math.min(scale.length - 1, last + ((Math.random() * 3) | 0) - 1));
        pluck(scale[last], 0, 0.16);
        if (Math.random() < 0.3) pluck(scale[Math.max(0, last - 2)] / 2, 0.4, 0.12);
      }
    };
    tick();
    this.musicTimer = setInterval(tick, 1450);
  }

  stopMusic() {
    if (this.musicTimer) { clearInterval(this.musicTimer); this.musicTimer = null; }
  }
}
