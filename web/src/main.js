// Entry point.
import './ui/styles.css';
import { Game } from './game.js';
import { UIManager } from './ui/ui.js';

const canvas = document.getElementById('game-canvas');
const game = new Game(canvas);
window.game = game; // exposed for debugging/e2e tests
game.ui = new UIManager(game);
game.ui.game = game;
game.start().catch((err) => {
  console.error(err);
  const ui = document.getElementById('ui');
  if (ui) ui.innerHTML = `<div class="screen" style="display:flex"><div class="modal"><h2>Lỗi khởi động</h2><p>${String(err && err.message || err)}</p></div></div>`;
});

window.addEventListener('error', (e) => {
  if (game && game.ui && game.state === 'playing') game.ui.notify('bad', 'Lỗi runtime: ' + e.message);
});
