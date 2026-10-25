import { test } from 'node:test';
import assert from 'node:assert/strict';
import { clamp, lerp, damp, angleWrap, angleDamp, mulberry32, makeNoise2D, formatTime, esc, dist2D } from '../../web/src/framework/math.js';

test('clamp/lerp/damp', () => {
  assert.equal(clamp(5, 0, 3), 3);
  assert.equal(clamp(-1, 0, 3), 0);
  assert.equal(lerp(0, 10, 0.25), 2.5);
  const d = damp(0, 100, 5, 0.1);
  assert.ok(d > 0 && d < 100);
  assert.equal(damp(0, 100, 10000, 10), 100); // hội tụ
});

test('angleWrap/angleDamp quanh ±π', () => {
  assert.ok(Math.abs(angleWrap(Math.PI * 3)) <= Math.PI);
  assert.ok(Math.abs(angleWrap(-Math.PI * 5)) <= Math.PI);
  assert.ok(Math.abs(angleDamp(Math.PI * 0.9, -Math.PI * 0.9, 0, 0.1)) <= Math.PI); // đường ngắn
});

test('mulberry32: xác định theo seed, nằm trong [0,1)', () => {
  const a = mulberry32(42), b = mulberry32(42);
  for (let i = 0; i < 100; i++) {
    const v = a();
    assert.equal(v, b());
    assert.ok(v >= 0 && v < 1);
  }
});

test('makeNoise2D: fbm trong [-1,1], xác định', () => {
  const n = makeNoise2D(7);
  for (let i = 0; i < 200; i++) {
    const v = n.fbm(i * 0.13, i * 0.071, 4);
    assert.ok(v >= -1.001 && v <= 1.001, `fbm ngoài miền: ${v}`);
  }
  assert.equal(makeNoise2D(7).fbm(1.5, 2.5, 4), n.fbm(1.5, 2.5, 4));
});

test('formatTime/esc/dist2D', () => {
  assert.equal(formatTime(125), '2:05');
  assert.equal(esc('<b>&"'), '&lt;b&gt;&amp;&quot;');
  assert.equal(dist2D(0, 0, 3, 4), 5);
});
