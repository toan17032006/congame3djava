// HUD: bars, objectives, boss bar, prompt, toasts feed, FPS.
import { esc, formatTime } from '../core/utils.js';
import { ALL_SKILLS } from '../data/skills.js';
import { CURRENCY } from '../data/items.js';

export class HUD {
  constructor(game) {
    this.game = game;
    this.root = document.createElement('div');
    this.root.className = 'hud';
    this.root.style.display = 'none';
    this.root.innerHTML = `
      <div class="hud-tl">
        <div class="level-chip" id="hud-level">Chương</div>
        <div class="objectives" id="hud-objectives"></div>
      </div>
      <div class="hud-tr">
        <div class="char-chip">
          <span id="hud-clevel">Cấp 1</span>
          <span id="hud-coins">${CURRENCY.icon} 0</span>
        </div>
        <div class="xpbar"><div class="xpfill" id="hud-xp"></div></div>
        <div class="buffs" id="hud-buffs"></div>
      </div>
      <div class="boss-bar" id="hud-boss" style="display:none">
        <div class="boss-name" id="hud-bossname"></div>
        <div class="boss-hp"><div class="boss-hpfill" id="hud-bosshp"></div></div>
        <div class="boss-pips" id="hud-bosspips"></div>
      </div>
      <div class="hud-bl">
        <div class="hp-wrap">
          <div class="level-badge" id="hud-levelbadge">1</div>
          <div class="bar hpbar"><div class="hpfill" id="hud-hp"></div><span class="bartext" id="hud-hptext"></span></div>
        </div>
        <div class="bar stabar"><div class="stafill" id="hud-sta"></div></div>
        <div class="skill-slot" id="hud-skill" title="Kỹ năng (U)">
          <span class="skill-key">U</span>
          <span class="skill-name" id="hud-skillname">—</span>
          <div class="skill-cd" id="hud-skillcd"></div>
        </div>
      </div>
      <div class="hud-bc"><div class="prompt" id="hud-prompt"></div></div>
      <div class="hud-br"><span id="hud-fps"></span></div>
      <div class="hp-vignette" id="hud-vignette"></div>
    `;
    document.getElementById('ui').appendChild(this.root);
    this.dirty = true;
    this.boss = null;
    this._prompt = '';
    this._fpsT = 0;
  }

  show() { this.root.style.display = 'block'; this.dirty = true; }
  hide() { this.root.style.display = 'none'; }

  setLevel(def, waveTotal) {
    this.root.querySelector('#hud-level').textContent = `Chương ${def.id.slice(1)} · ${def.name}${waveTotal ? ` · ${waveTotal} đợt` : ''}`;
  }

  setObjectives(list) {
    this.root.querySelector('#hud-objectives').innerHTML = list.map((o) =>
      `<div class="obj ${o.done ? 'done' : ''}">${o.done ? '☑' : '☐'} ${esc(o.text.replace(/\(0\/\d+\)/, ''))} ${o.count > 1 ? `<b>${o.cur}/${o.count}</b>` : ''}</div>`).join('');
  }

  setBoss(boss) {
    this.boss = boss;
    const bar = this.root.querySelector('#hud-boss');
    if (!boss) { bar.style.display = 'none'; return; }
    bar.style.display = 'block';
    this.root.querySelector('#hud-bossname').textContent = boss.name;
    const phases = (boss.bossDef && boss.bossDef.phases) || [];
    const pips = this.root.querySelector('#hud-bosspips');
    pips.innerHTML = phases.slice(1).map((_, i) => `<span class="pip${i + 1 <= (boss.phaseIdx || 0) ? ' lit' : ''}"></span>`).join('');
    pips.style.display = phases.length > 1 ? 'flex' : 'none';
  }

  setPrompt(text) {
    if (text !== this._prompt) {
      this._prompt = text;
      const p = this.root.querySelector('#hud-prompt');
      p.textContent = text;
      p.style.display = text ? 'block' : 'none';
    }
  }

  flashHp() {
    const v = this.root.querySelector('#hud-vignette');
    v.classList.remove('flash');
    void v.offsetWidth;
    v.classList.add('flash');
  }

  frame(dt) {
    if (this.root.style.display === 'none') return;
    const g = this.game;
    const p = g.player;
    if (!p) return;
    const hpPct = Math.max(0, p.hp / p.maxHp);
    this.root.querySelector('#hud-hp').style.width = `${hpPct * 100}%`;
    this.root.querySelector('#hud-hptext').textContent = `${Math.max(0, Math.ceil(p.hp))} / ${p.maxHp}`;
    this.root.querySelector('#hud-sta').style.width = `${Math.max(0, p.stamina / p.maxStamina) * 100}%`;
    const xp = g.progression.xpProgress();
    this.root.querySelector('#hud-xp').style.width = `${Math.min(100, (xp.cur / xp.need) * 100)}%`;
    const active = g.progression.activeSkill();
    const nameEl = this.root.querySelector('#hud-skillname');
    const nm = active ? active.name : 'Chưa học (T)';
    if (nameEl.textContent !== nm) nameEl.textContent = nm;
    const cdEl = this.root.querySelector('#hud-skillcd');
    const cd = active ? (g.player.skillCd[active.skill] || 0) : 0;
    const cdMax = active ? active.cooldown : 1;
    cdEl.style.height = `${Math.min(100, (cd / cdMax) * 100)}%`;
    // chips
    const coins = `${CURRENCY.icon} ${g.inventory.coins}`;
    const cEl = this.root.querySelector('#hud-coins');
    if (cEl.textContent !== coins) cEl.textContent = coins;
    const lv = `Cấp ${g.progression.level}`;
    const lEl = this.root.querySelector('#hud-clevel');
    if (lEl.textContent !== lv) lEl.textContent = lv;
    const badge = this.root.querySelector('#hud-levelbadge');
    const bn = String(g.progression.level);
    if (badge.textContent !== bn) badge.textContent = bn;
    // buffs
    const buffs = p.buffs.filter((b) => b.stat !== 'nextHitPct' || b.until > g.time).map((b) => {
      const names = { attackPct: 'Công+', defensePct: 'Thủ+', noStagger: 'Bất hoại', lowHpAttack: 'Trống chiến' };
      const s = Math.ceil(b.until - g.time);
      return `<span class="buff">${names[b.stat] || b.stat} ${s}s</span>`;
    }).join('');
    const bEl = this.root.querySelector('#hud-buffs');
    if (bEl.innerHTML !== buffs) bEl.innerHTML = buffs;
    // boss bar
    if (this.boss) {
      if (this.boss.combat.dead || this.boss.disposed) this.setBoss(null);
      else {
        this.root.querySelector('#hud-bosshp').style.width = `${Math.max(0, (this.boss.hp / this.boss.maxHp)) * 100}%`;
        const pips = this.root.querySelector('#hud-bosspips');
        if (pips.style.display !== 'none' && pips.children.length) {
          const lit = this.boss.phaseIdx || 0;
          [...pips.children].forEach((el, i) => el.classList.toggle('lit', i + 1 <= lit));
        }
      }
    }
    // fps
    this._fpsT += dt;
    if (this._fpsT > 0.5) {
      this._fpsT = 0;
      const qNames = { cinematic: '4K', ultra: 'Ultra', high: 'Cao', medium: 'TB', low: 'Thấp' };
      const st = g.engine.stats;
      const rs = g.engine.options.resolutionScale === 'auto' ? `auto ${Math.round(st.renderScale * 100)}%` : `${Math.round(st.renderScale * 100)}%`;
      this.root.querySelector('#hud-fps').textContent = `${st.fps} FPS · ${st.frameMs.toFixed(1)}ms · ${qNames[g.engine.quality] || ''} · ${rs} · ${st.drawCalls} DC`;
    }
  }
}
