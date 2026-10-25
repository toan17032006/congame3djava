import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ResourceCache } from '../../web/src/framework/patterns/cache.js';

test('ResourceCache: factory chỉ chạy một lần per key', () => {
  let created = 0;
  const cache = new ResourceCache({ onDispose: () => disposed++ });
  let disposed = 0;
  const g1 = cache.get('box|0.5', () => ({ kind: 'box', n: ++created }));
  const g2 = cache.get('box|0.5', () => ({ kind: 'box', n: ++created }));
  assert.equal(g1, g2);
  assert.equal(created, 1);
  assert.equal(cache.size, 1);
  assert.ok(cache.has('box|0.5'));
  cache.delete('box|0.5');
  assert.equal(disposed, 1);
  assert.equal(cache.has('box|0.5'), false);
  cache.clear();
  assert.equal(cache.size, 0);
});

test('ResourceCache: chế độ keyFn tự sinh khóa từ args', () => {
  const cache = new ResourceCache({
    keyFn: (kind, ...args) => [kind, ...args].join(','),
    onDispose: (v) => v.dispose?.(),
  });
  let n = 0;
  const a = cache.get('cyl', 0.2, 0.3, 4, () => ({ n: ++n, dispose() { this.dead = true; } }));
  const b = cache.get('cyl', 0.2, 0.3, 4, () => ({ n: ++n }));
  assert.equal(a, b);
  assert.equal(n, 1);
  cache.delete('cyl-không-tồn-tại'); // xóa key khác — không ảnh hưởng
  assert.ok(cache.has('cyl,0.2,0.3,4'));
  cache.clear();
  assert.equal(a.dead, true);
});

test('ResourceCache: thiếu factory khi miss phải ném lỗi rõ ràng', () => {
  const cache = new ResourceCache();
  assert.throws(() => cache.get('unknown'), /chưa có/);
});
