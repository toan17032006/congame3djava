// UI manager: screens (menu/loading/pause/death/level-complete/victory), toasts, hud & panels wiring.
import { HUD } from './hud.js';
import { Panels } from './panels.js';
import { esc, formatTime } from '../core/utils.js';
import { LEVEL_MAP } from '../data/levels.js';
import { ACTIONS } from '../data/keys.js';

function el(tag, cls, html) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html !== undefined) e.innerHTML = html;
  return e;
}

export class UIManager {
  constructor(game) {
    this.game = game;
    game.ui = this;
    this.root = document.getElementById('ui');
    this.hud = new HUD(game);
    this.panels = new Panels(game);
    this.screens = {};
    this.toasts = el('div', 'toasts');
    this.root.appendChild(this.toasts);
    this.buildScreens();
    this._fpsAcc = 0;
  }

  buildScreens() {
    const r = this.root;
    // main menu
    const menu = el('div', 'screen menu-screen');
    menu.innerHTML = `
      <div class="menu-inner">
        <div class="title-block">
          <div class="title-kanji">侍</div>
          <h1>ĐẠO CỦA KẺ VÔ DANH</h1>
          <p class="subtitle">Samurai 3D Action RPG · 15 chương · Three.js</p>
        </div>
        <div class="menu-buttons">
          <button data-act="continue">Tiếp Tục</button>
          <button data-act="new">Chơi Mới</button>
          <button data-act="help">Hướng Dẫn</button>
          <button data-act="settings">Cài Đặt</button>
        </div>
        <div class="save-slots" id="save-slots"></div>
        <div class="menu-footer" id="menu-footer"></div>
      </div>`;
    menu.querySelectorAll('.menu-buttons button').forEach((b) => {
      b.addEventListener('click', () => { this.game.audio.ensure(); this.menuAction(b.dataset.act); });
    });
    r.appendChild(menu);
    this.screens.menu = menu;

    // loading
    const loading = el('div', 'screen loading-screen');
    loading.innerHTML = `<div class="loading-inner"><div class="loading-kanji">道</div><h2 id="loading-title">Đang tải...</h2><div class="loading-bar"><div class="loading-fill" id="loading-fill"></div></div><p id="loading-step">Chuẩn bị</p></div>`;
    r.appendChild(loading);
    this.screens.loading = loading;

    // pause
    const pause = el('div', 'screen');
    pause.innerHTML = `
      <div class="modal">
        <h2>TẠM DỪNG</h2>
        <div class="menu-buttons">
          <button data-act="resume">Tiếp Tục</button>
          <button data-act="save">Lưu Game</button>
          <button data-act="psettings">Cài Đặt</button>
          <button data-act="phelp">Điều Khiển</button>
          <button data-act="tomenu">Về Menu Chính</button>
        </div>
        <div id="pause-sub"></div>
      </div>`;
    pause.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => {
      this.game.audio.sfx('ui');
      const a = b.dataset.act;
      if (a === 'resume') this.game.resume();
      if (a === 'save') this.game.saveSystem.save(this.game.currentSlot);
      if (a === 'psettings') this.showSettings('pause');
      if (a === 'phelp') this.showHelp('pause');
      if (a === 'tomenu') this.game.toMenu();
    }));
    r.appendChild(pause);
    this.screens.pause = pause;

    // death
    const death = el('div', 'screen death-screen');
    death.innerHTML = `
      <div class="modal">
        <div class="death-kanji">死</div>
        <h2>NGƯƠI ĐÃ NGÃ</h2>
        <p class="dim">"Cái chết không phải kết thúc - đó là một bài học."</p>
        <div class="menu-buttons">
          <button data-act="respawn">Hồi Sinh Tại Đài</button>
          <button data-act="retry">Chơi Lại Màn Này</button>
          <button data-act="tomenu">Về Menu Chính</button>
        </div>
      </div>`;
    death.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => {
      const a = b.dataset.act;
      if (a === 'respawn') this.game.respawnPlayer();
      if (a === 'retry') this.game.retryLevel();
      if (a === 'tomenu') this.game.toMenu();
    }));
    r.appendChild(death);
    this.screens.death = death;

    // level complete
    const lc = el('div', 'screen');
    lc.innerHTML = `<div class="modal" id="lc-modal"></div>`;
    r.appendChild(lc);
    this.screens.levelComplete = lc;

    // victory
    const vic = el('div', 'screen victory-screen');
    vic.innerHTML = `
      <div class="modal">
        <div class="title-kanji small">終</div>
        <h2>CÂU CHUYỆN KHÉP LẠI</h2>
        <p>Yamikage tan thành tro. Ánh sáng trở lại những vùng đất bóng tối.<br>
        Nhưng thanh kiếm của ngươi... vẫn còn đó những chuyện phải làm.</p>
        <div id="victory-stats" class="stat-list"></div>
        <div class="menu-buttons">
          <button data-act="tomenu">Về Menu Chính</button>
        </div>
      </div>`;
    vic.querySelector('[data-act="tomenu"]').addEventListener('click', () => this.game.toMenu());
    r.appendChild(vic);
    this.screens.victory = vic;
  }

  menuAction(a) {
    this.game.audio.sfx('ui');
    if (a === 'new') {
      this.game.newGame('slot1');
    } else if (a === 'continue') {
      this.refreshSaveSlots(true);
    } else if (a === 'help') {
      this.showHelp('menu');
    } else if (a === 'settings') {
      this.showSettings('menu');
    }
  }

  async refreshSaveSlots(expand = false) {
    const box = this.screens.menu.querySelector('#save-slots');
    if (!expand && box.style.display !== 'block') { box.style.display = 'block'; }
    const slots = await this.game.saveSystem.listSlots();
    box.innerHTML = slots.length
      ? slots.map((s) => {
        const meta = s.meta || {};
        const info = meta.slotName ? `${esc(meta.slotName)} · C.${meta.levelId || '?'} · ${formatTime(meta.playtime || 0)}` : `Lưu trên server · C.${meta.level ?? '?'}`;
        return `<div class="save-row" data-slot="${esc(s.slot)}">
          <span>${esc(s.slot)} — ${info} <i class="dim">(${s.source})</i></span>
          <span class="save-actions"><button data-play="${esc(s.slot)}">Chơi</button><button class="danger" data-del="${esc(s.slot)}">Xóa</button></span>
        </div>`;
      }).join('')
      : '<p class="dim">Chưa có save nào. Hãy chọn "Chơi Mới".</p>';
    box.style.display = 'block';
    box.querySelectorAll('[data-play]').forEach((b) => b.addEventListener('click', async () => {
      this.game.audio.sfx('ui');
      const ok = await this.game.continueGame(b.dataset.play);
      if (!ok) this.notify('bad', 'Không thể tải save');
    }));
    box.querySelectorAll('[data-del]').forEach((b) => b.addEventListener('click', async () => {
      this.game.audio.sfx('ui');
      await this.game.saveSystem.deleteSlot(b.dataset.del);
      this.refreshSaveSlots(true);
    }));
    fetch('/api/health').then((r) => r.json()).then((h) => {
      const f = this.screens.menu.querySelector('#menu-footer');
      if (f) f.innerHTML = `Backend: ${esc(h.status)} · DB: ${esc(h.database ? 'SQLite OK' : 'chưa tạo')} · v${esc(h.version)}`;
    }).catch(() => {
      const f = this.screens.menu.querySelector('#menu-footer');
      if (f) f.innerHTML = 'Backend offline — save chỉ lưu cục bộ.';
    });
  }

  showMenu() {
    this.hideAll();
    this.screens.menu.style.display = 'flex';
    this.refreshSaveSlots();
    this.panels.closeAll();
  }

  showLoading(levelId) {
    this.hideAll();
    const def = LEVEL_MAP[levelId];
    this.screens.loading.querySelector('#loading-title').textContent = def ? `Chương ${levelId.slice(1)} — ${def.name}` : 'Đang tải';
    this.screens.loading.querySelector('#loading-step').textContent = def ? def.desc : '';
    this.screens.loading.querySelector('#loading-fill').style.width = '8%';
    this.screens.loading.style.display = 'flex';
    setTimeout(() => { const f = this.screens.loading.querySelector('#loading-fill'); if (f) f.style.width = '100%'; }, 60);
  }

  showHud() {
    this.hideAll();
    this.hud.show();
    this.inputFocusHack();
  }

  inputFocusHack() { /* pointer lock requested by game.enterLevel */ }

  showPause() {
    this.screens.pause.style.display = 'flex';
    const sub = this.screens.pause.querySelector('#pause-sub');
    sub.innerHTML = '';
  }

  showDeath() { this.screens.death.style.display = 'flex'; }

  showLevelComplete(def, next, rewards) {
    this.hideAll();
    const m = this.screens.levelComplete.querySelector('#lc-modal');
    m.innerHTML = `
      <h2>HOÀN THÀNH: ${esc(def.name)}</h2>
      <p class="dim">${esc(def.desc)}</p>
      <div class="stat-list"><h3>Phần thưởng</h3>
        <ul>${rewards.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
      </div>
      <div class="menu-buttons">
        <button id="lc-next">Chương Tiếp Theo: ${esc(LEVEL_MAP[next]?.name || next)}</button>
        <button id="lc-stay">Ở Lại Khám Phá</button>
        <button id="lc-menu">Về Menu Chính</button>
      </div>`;
    m.querySelector('#lc-next').addEventListener('click', () => this.game.enterLevel(next));
    m.querySelector('#lc-stay').addEventListener('click', () => { this.game.state = 'playing'; this.showHud(); this.game.input.enabled = true; this.game.input.requestPointer(); });
    m.querySelector('#lc-menu').addEventListener('click', () => this.game.toMenu());
    this.screens.levelComplete.style.display = 'flex';
  }

  showVictory(def) {
    this.hideAll();
    const p = this.game.progression;
    this.screens.victory.querySelector('#victory-stats').innerHTML = `
      <ul>
        <li>Cấp độ cuối: <b>${p.level}</b></li>
        <li>Kẻ địch đã hạ: <b>${p.stats.kills}</b></li>
        <li>Số lần ngã: <b>${p.stats.deaths}</b></li>
        <li>Thời gian chơi: <b>${formatTime(p.stats.playtime)}</b></li>
      </ul>`;
    this.screens.victory.style.display = 'flex';
  }

  showSettings(parent) {
    const g = this.game;
    const s = g.settings;
    const host = parent === 'menu' ? this.screens.menu.querySelector('.menu-inner') : this.screens.pause.querySelector('#pause-sub');
    host.innerHTML = `
      <div class="settings-box">
        <h3>Cài đặt</h3>
        <label>Chất lượng đồ họa
          <select id="set-quality">
            <option value="low">Thấp</option><option value="medium">Trung bình</option><option value="high">Cao</option><option value="ultra">Cực cao (Ultra)</option>
          </select></label>
        <label>Độ nhạy chuột <input id="set-sens" type="range" min="0.4" max="2" step="0.1"></label>
        <label><input id="set-invert" type="checkbox"> Đảo trục Y</label>
        <label>Âm lượng tổng <input id="set-vm" type="range" min="0" max="1" step="0.05"></label>
        <label>Hiệu ứng <input id="set-vs" type="range" min="0" max="1" step="0.05"></label>
        <label>Nhạc <input id="set-vu" type="range" min="0" max="1" step="0.05"></label>
        <label>Môi trường <input id="set-va" type="range" min="0" max="1" step="0.05"></label>
        <div class="menu-buttons"><button id="set-back">Quay lại</button></div>
      </div>`;
    const q = host.querySelector('#set-quality');
    q.value = s.quality;
    host.querySelector('#set-sens').value = s.sensitivity;
    host.querySelector('#set-invert').checked = s.invertY;
    host.querySelector('#set-vm').value = s.volMaster;
    host.querySelector('#set-vs').value = s.volSfx;
    host.querySelector('#set-vu').value = s.volMusic;
    host.querySelector('#set-va').value = s.volAmbient;
    const apply = () => {
      s.quality = q.value; s.sensitivity = parseFloat(host.querySelector('#set-sens').value);
      s.invertY = host.querySelector('#set-invert').checked;
      s.volMaster = parseFloat(host.querySelector('#set-vm').value);
      s.volSfx = parseFloat(host.querySelector('#set-vs').value);
      s.volMusic = parseFloat(host.querySelector('#set-vu').value);
      s.volAmbient = parseFloat(host.querySelector('#set-va').value);
      g.applySettings();
    };
    host.querySelectorAll('input, select').forEach((i) => i.addEventListener('change', apply));
    host.querySelector('#set-back').addEventListener('click', () => {
      if (parent === 'menu') { host.querySelector('.settings-box').remove(); }
      else host.innerHTML = '';
    });
  }

  showHelp(parent) {
    const host = parent === 'menu' ? this.screens.menu.querySelector('.menu-inner') : this.screens.pause.querySelector('#pause-sub');
    const rows = Object.values(ACTIONS).map((a) => `<tr><td><b>${esc(a.default.replace('Key', '').replace('Left', 'L-Shift'))}</b></td><td>${esc(a.label)}</td></tr>`).join('');
    host.innerHTML = `
      <div class="settings-box">
        <h3>Điều khiển</h3>
        <table class="keys-table">${rows}</table>
        <p class="dim">Chuột: nhìn quanh (nhấp vào màn hình để khóa con trỏ) · Lăn chuột: zoom camera<br>
        Giữ L đúng thời điểm nhát đánh chạm người = <b>Parry</b> → kẻ địch mất thăng bằng.</p>
        <div class="menu-buttons"><button id="help-back">Quay lại</button></div>
      </div>`;
    host.querySelector('#help-back').addEventListener('click', () => { const b = host.querySelector('.settings-box'); if (b) b.remove(); });
  }

  hideAll() {
    for (const k in this.screens) this.screens[k].style.display = 'none';
    this.hud.hide();
  }

  notify(type, text) {
    const colors = { item: '#9ad0ff', gold: '#ffd257', xp: '#b0e0a0', level: '#ffb057', quest: '#c8a0ff',
      save: '#8ad0b0', info: '#c8d0d8', good: '#9ae08a', bad: '#ff8a7a', warn: '#ffb057', boss: '#ff6a5a' };
    const t = el('div', 'toast', `<span style="color:${colors[type] || '#fff'}">${esc(text)}</span>`);
    this.toasts.appendChild(t);
    requestAnimationFrame(() => t.classList.add('show'));
    setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 400); }, 3400);
    while (this.toasts.children.length > 6) this.toasts.firstChild.remove();
  }

  frame(dt) {
    this.hud.frame(dt);
  }
}
