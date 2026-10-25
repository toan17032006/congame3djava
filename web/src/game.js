// Game orchestrator: wires systems, states, the main loop, global keys, settings.
import { Engine } from './core/engine.js';
import { Input } from './core/input.js';
import { CameraRig } from './core/cameraRig.js';
import { World } from './systems/world.js';
import { CombatSystem } from './systems/combat.js';
import { Progression } from './systems/progression.js';
import { Inventory } from './systems/inventory.js';
import { Crafting } from './systems/crafting.js';
import { QuestSystem } from './systems/quests.js';
import { SaveSystem } from './systems/saveSystem.js';
import { LevelManager } from './systems/levelManager.js';
import { Sky } from './gfx/sky.js';
import { ParticleSystem } from './gfx/particles.js';
import { Vfx } from './gfx/vfx.js';
import { AudioMgr } from './gfx/audio.js';
import { Player } from './entities/player.js';
import { Npc } from './entities/npc.js';
import { LEVEL_MAP, LEVELS } from './data/levels.js';

const SETTINGS_KEY = 'samurai_settings_v1';

export class Game {
  constructor(canvas) {
    this.engine = new Engine(canvas);
    this.input = new Input(canvas);
    this.cameraRig = new CameraRig(this.engine.camera, this.input);
    this.world = new World(this);
    this.combat = new CombatSystem(this);
    this.progression = new Progression(this);
    this.inventory = new Inventory(this);
    this.crafting = new Crafting(this);
    this.quests = new QuestSystem(this);
    this.saveSystem = new SaveSystem(this);
    this.levelManager = new LevelManager(this);
    this.sky = new Sky(this.engine);
    this.particles = new ParticleSystem(this.engine.scene);
    this.vfx = new Vfx(this.engine.scene);
    this.audio = new AudioMgr();

    this.player = null;
    this.npcs = [];
    this.currentBoss = null;
    this.weather = null;
    this.time = 0;
    this.state = 'boot'; // boot|menu|loading|playing|paused|dead|levelComplete|victory
    this.currentSlot = 'slot1';
    this.loadingStep = null;

    this.settings = { quality: 'high', resolutionScale: 'auto', targetFps: 60, ao: true, grain: false,
      sensitivity: 1.0, invertY: false, volMaster: 0.8, volSfx: 0.9, volMusic: 0.45, volAmbient: 0.5 };
    this.loadSettings();
    this.applySettings();

    this.input.onEscape = () => this.handleEscape();
    // any key/click skips a running cinematic (boss intro)
    const skipCin = () => { if (this.cameraRig.skipCinematic()) this.ui.setLetterbox(false); };
    window.addEventListener('keydown', skipCin);
    window.addEventListener('mousedown', skipCin);
    this.cameraRig.onCinematicEnd = () => this.ui.setLetterbox(false);
    window.addEventListener('keydown', (e) => this.handlePanelKeys(e));
  }

  // ---- lifecycle ----------------------------------------------------------
  async start() {
    this.engine.setQuality(this.settings.quality);
    this.spawnPlayer();
    this.ui.showMenu();
    this.engine.start((dt, rawDt) => this.tick(dt, rawDt));
  }

  spawnPlayer() {
    this.player = new Player(this, { x: 0, y: 0, z: 60, name: 'Samurai vô danh', faction: 'player',
      stats: { maxHp: 100, attack: 14, defense: 3, speed: 5, poise: 40 },
      colors: { cloth: 0x2a3444, skin: 0xd8b090, hair: 0x14100c, accent: 0x8a2a2a },
    });
    this.inventory.applyToRig();
    this.progression.applyToPlayer();
    this.player.hp = this.player.maxHp;
    this.player.stamina = this.player.maxStamina;
  }

  newGame(slot) {
    this.currentSlot = slot || 'slot1';
    this.progression = new Progression(this);
    this.inventory = new Inventory(this);
    this.quests = new QuestSystem(this);
    this.levelManager = new LevelManager(this);
    this.levelManager.unlockInitial();
    for (const n of [...this.npcs]) this.removeNpc(n, true);
    this.player.combat.dead = false;
    this.progression.applyToPlayer();
    this.player.hp = this.player.maxHp;
    this.inventory.addItem('bandage', 2);
    this.audio.ensure();
    this.enterLevel('L01');
  }

  async continueGame(slot) {
    const data = await this.saveSystem.load(slot);
    if (!data) { this.ui.notify('bad', 'Không đọc được dữ liệu lưu'); return false; }
    this.currentSlot = slot;
    this.progression.apply(data.player);
    this.inventory.apply(data.player.inventory);
    this.quests.apply(data.progress?.quests);
    this.levelManager.apply(data.progress?.levels);
    this.player.combat.dead = false;
    this.progression.applyToPlayer();
    this.player.hp = Math.max(1, data.player.hp || this.player.maxHp);
    this.inventory.applyToRig();
    this.audio.ensure();
    let levelId = data.meta?.levelId && LEVEL_MAP[data.meta.levelId] ? data.meta.levelId : 'L01';
    // if the saved level is already completed, resume at the next unlocked one
    if (this.levelManager.isCompleted(levelId)) {
      const nextUnlocked = LEVELS.find((l) => this.levelManager.isUnlocked(l.id) && !this.levelManager.isCompleted(l.id));
      if (nextUnlocked) levelId = nextUnlocked.id;
    }
    this.enterLevel(levelId);
    return true;
  }

  async enterLevel(levelId) {
    this.state = 'loading';
    this.input.enabled = false;
    this.ui.showLoading(levelId);
    // yield a frame so the loading screen paints before the heavy build
    await new Promise((r) => setTimeout(r, 50));
    try {
      await this.levelManager.startLevel(levelId);
      this.state = 'playing';
      this.input.enabled = true;
      this.ui.showHud();
      this.input.requestPointer();
    } catch (err) {
      console.error('[level] failed to load', err);
      this.ui.notify('bad', 'Lỗi tải khu vực: ' + err.message);
      this.state = 'menu';
      this.ui.showMenu();
    }
  }

  removeNpc(n, immediate = false) {
    const i = this.npcs.indexOf(n);
    if (i >= 0) this.npcs.splice(i, 1);
    if (this.currentBoss === n) this.currentBoss = null;
    n.dispose(this);
  }

  spawnNpc(opts) { const n = new Npc(this, opts); this.npcs.push(n); return n; }
  spawnProjectile(opts) { this.combat.spawnProjectile(opts); }

  // ---- states -------------------------------------------------------------
  pause() {
    if (this.state !== 'playing') return;
    this.state = 'paused';
    this.input.enabled = false;
    this.input.releasePointer();
    this.ui.showPause();
    this.saveSystem.save(this.currentSlot, { silent: true });
  }

  resume() {
    if (this.state !== 'paused') return;
    this.state = 'playing';
    this.input.enabled = true;
    this.ui.showHud();
    this.input.requestPointer();
  }

  handleEscape() {
    if (this.ui.panels.isOpen()) { this.ui.panels.closeAll(); if (this.state === 'playing') this.input.requestPointer(); return; }
    if (this.state === 'playing') this.pause();
    else if (this.state === 'paused') this.resume();
  }

  handlePanelKeys(e) {
    const bindToAction = Object.entries(this.input.binds).find(([a, code]) => code === e.code);
    if (!bindToAction) return;
    const action = bindToAction[0];
    const panelActions = { inventory: 'inventory', skillTree: 'skills', questLog: 'quests', map: 'map' };
    if (!panelActions[action]) return;
    if (this.state === 'playing') {
      this.ui.panels.toggle(panelActions[action]);
    } else if (this.ui.panels.isOpen()) {
      this.ui.panels.toggle(panelActions[action]);
    }
  }

  onPlayerDeath() {
    if (this.state !== 'playing') return;
    this.state = 'dead';
    this.progression.stats.deaths++;
    // death penalty: lose 15% carried coins
    const lost = Math.floor(this.inventory.coins * 0.15);
    if (lost > 0) {
      this.inventory.addCoins(-lost);
      this.ui.notify('bad', `Mất ${lost} vàng vì tử trận`);
    }
    this.input.enabled = false;
    this.input.releasePointer();
    this.ui.showDeath();
  }

  async respawnPlayer() {
    const rp = this.progression.respawnPoint;
    this.player.respawn(rp ? [rp.x, rp.z] : this.world.spawnPoint);
    // calm nearby enemies
    for (const n of this.npcs) { n.aggro = false; n.target = null; n.state = 'patrol'; }
    this.state = 'playing';
    this.input.enabled = true;
    this.ui.showHud();
    this.input.requestPointer();
  }

  retryLevel() {
    this.enterLevel(this.levelManager.currentId);
  }

  onLevelComplete(def, next, rewards) {
    if (!next) {
      this.state = 'victory';
      this.input.enabled = false;
      this.input.releasePointer();
      this.ui.showVictory(def);
      return;
    }
    this.state = 'levelComplete';
    this.input.enabled = false;
    this.input.releasePointer();
    this.ui.showLevelComplete(def, next, rewards);
  }

  toMenu() {
    this.state = 'menu';
    this.input.enabled = false;
    this.input.releasePointer();
    this.saveSystem.save(this.currentSlot, { silent: true });
    this.ui.showMenu();
  }

  // ---- settings -----------------------------------------------------------
  loadSettings() {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (raw) this.settings = { ...this.settings, ...JSON.parse(raw) };
    } catch { /* corrupt settings: keep defaults */ }
  }

  saveSettings() {
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(this.settings)); } catch {}
  }

  applySettings() {
    const s = this.settings;
    this.engine.setQuality(s.quality);
    this.engine.setOptions({ resolutionScale: s.resolutionScale, targetFps: s.targetFps, ao: s.ao, grain: s.grain });
    this.cameraRig.sensitivity = 0.0022 * s.sensitivity;
    this.cameraRig.invertY = s.invertY;
    this.audio.volumes = { master: s.volMaster, sfx: s.volSfx, music: s.volMusic, ambient: s.volAmbient };
    this.audio.applyVolumes();
    this.saveSettings();
  }

  // ---- main loop ----------------------------------------------------------
  tick(dt, rawDt) {
    if (this.state === 'playing' && !this.ui.panels.isOpen()) {
      this.time += dt;
      this.progression.stats.playtime += rawDt;
      this.player.update(dt, this);
      for (const n of [...this.npcs]) n.update(dt, this);
      this.combat.updateProjectiles(dt);
      this.world.update(dt);
      this.levelManager.update(dt);
      if (this.weather) this.weather.update(dt, this.player.pos);
      this.cameraRig.update(dt, this.player.pos, this.world, this.player.moveMode === 'sprint');
      // hide the body in first person so the head mesh doesn't block the view
      const firstPerson = this.cameraRig.mode === 'first';
      if (this.player.rig.group.visible === firstPerson) this.player.rig.setVisible(!firstPerson);
      this.updateInteractPrompt();
    } else {
      // menus: keep world visuals alive subtly
      this.cameraRig.update(rawDt, this.player ? this.player.pos : { x: 0, y: 0, z: 0 }, this.world, false);
    }
    this.particles.update(dt || rawDt);
    this.vfx.update(dt || rawDt);
    this.sky.update(this.player ? this.player.pos : { x: 0, y: 0, z: 0 });
    this.ui.frame(rawDt);
    this.input.endFrame();
  }

  updateInteractPrompt() {
    const t = this.world.nearestInteractable(this.player.pos, 2.6);
    this.ui.hud.setPrompt(t ? t.prompt() : '');
  }
}
