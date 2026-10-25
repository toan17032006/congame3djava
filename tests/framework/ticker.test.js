import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Ticker } from '../../web/src/framework/core/ticker.js';

// đồng hồ giả: mỗi lần _tick được schedule thì đẩy thời gian tới trước
function fakeClock({ stepMs = 16 }) {
  let t = 0;
  const cbs = [];
  return {
    now: () => t,
    advance: (ms) => { t += ms; },
    schedule: (cb) => { cbs.push(cb); },
    get pending() { return cbs.length; },
    fire() { const cb = cbs.shift(); if (cb) cb(); },
    stepMs,
  };
}

test('Ticker: dt tính từ now, timeScale nhân vào update', () => {
  const clock = fakeClock({});
  let seen = [];
  const t = new Ticker({ update: (dt, rawDt) => seen.push([dt, rawDt]), schedule: clock.schedule, now: clock.now });
  t.start();
  clock.advance(16); clock.fire();            // frame 1: rawDt 16ms
  clock.advance(32); clock.fire();            // frame 2: rawDt 32ms
  assert.deepEqual(seen[0], [0.016, 0.016]);
  assert.deepEqual(seen[1], [0.032, 0.032]);
  assert.equal(t.timeScale, 1);
  t.stop();
  clock.advance(16); clock.fire();
  assert.equal(seen.length, 2); // đã stop
});

test('Ticker: clamp dt khi giật frame, hitstop giảm timeScale', () => {
  const clock = fakeClock({});
  let dt = 0;
  const t = new Ticker({ update: (d) => { dt = d; }, maxDt: 0.05, schedule: clock.schedule, now: clock.now });
  t.start();
  clock.advance(500); clock.fire(); // giật 0.5s → clamp 0.05
  assert.equal(dt, 0.05);
  t.hitstop(0.3);
  clock.advance(16); clock.fire();
  assert.ok(Math.abs(t.timeScale - 0.06) < 1e-9);
  // hitstop trừ theo rawDt từng tick: 0.3s / 16ms ≈ 19 tick nữa là hết
  for (let i = 0; i < 25; i++) { clock.advance(16); clock.fire(); }
  assert.equal(t.timeScale, 1);
});

test('Ticker: fps EMA cập nhật sau 0.5s tích lũy', () => {
  const clock = fakeClock({ stepMs: 16 });
  const t = new Ticker({ update: () => {}, schedule: clock.schedule, now: clock.now });
  t.start();
  for (let i = 0; i < 32; i++) { clock.advance(16); clock.fire(); }
  assert.equal(t.stats.fps, 62); // 32 frame × 16ms = 512ms ≥ 0.5s → 32/0.512 ≈ 62
});
