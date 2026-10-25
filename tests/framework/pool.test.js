import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ObjectPool } from '../../web/src/framework/core/pool.js';

test('ObjectPool: tái sử dụng đối tượng qua reset', () => {
  let created = 0;
  const pool = new ObjectPool({
    create: () => { created++; return { x: 0, live: true }; },
    reset: (o, x) => { o.x = x; o.live = true; },
  });
  const a = pool.acquire(1);
  const b = pool.acquire(2);
  assert.equal(created, 2);
  assert.equal(a.x, 1); assert.equal(b.x, 2);
  pool.release(a);
  assert.equal(pool.free, 1);
  const c = pool.acquire(3);
  assert.equal(created, 2); // không tạo mới
  assert.equal(c, a);
  assert.equal(c.x, 3);
  assert.equal(pool.size, 2);
});

test('ObjectPool: max chặn kho rảnh, releaseAll, release lạ trả false', () => {
  const pool = new ObjectPool({ create: () => ({}), max: 1 });
  const a = pool.acquire();
  const b = pool.acquire();
  pool.release(a); pool.release(b);
  assert.equal(pool.free, 1); // max 1
  assert.equal(pool.release(b), false); // b đã out khỏi _out? release b lần 2
  const lone = {};
  assert.equal(pool.release(lone), false);
  const pool2 = new ObjectPool({ create: () => ({ i: Math.random() }) });
  const x = pool2.acquire(); const y = pool2.acquire();
  pool2.releaseAll();
  assert.equal(pool2.size, 0);
  assert.equal(pool2.free, 2);
  assert.ok(x !== y);
});
