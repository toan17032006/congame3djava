import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EventBus } from '../../web/src/framework/core/events.js';

test('EventBus: on/emit nhận payload, trả số listener', () => {
  const bus = new EventBus();
  const seen = [];
  bus.on('hit', (p) => seen.push(p));
  const n = bus.emit('hit', { dmg: 10 });
  assert.equal(n, 1);
  assert.deepEqual(seen, [{ dmg: 10 }]);
});

test('EventBus: off + unsubscribe từ on()', () => {
  const bus = new EventBus();
  let n = 0;
  const off = bus.on('a', () => n++);
  bus.emit('a', null); bus.emit('a', null);
  off();
  bus.emit('a', null);
  assert.equal(n, 2);
  const fn = () => n++;
  bus.on('b', fn); bus.off('b', fn);
  assert.equal(bus.emit('b', null), 0);
});

test('EventBus: once chỉ chạy một lần', () => {
  const bus = new EventBus();
  let n = 0;
  bus.once('x', () => n++);
  bus.emit('x', null); bus.emit('x', null);
  assert.equal(n, 1);
  assert.equal(bus.listenerCount('x'), 0);
});

test('EventBus: listener off trong lúc emit không gây lỗi, sai tham số ném lỗi', () => {
  const bus = new EventBus();
  let n = 0;
  bus.on('s', () => n++);
  bus.on('s', function self() { bus.off('s', self); });
  assert.equal(bus.emit('s', null), 2);
  bus.emit('s', null); // listener tự gỡ rồi: chỉ còn 1
  assert.equal(n, 2);
  assert.throws(() => bus.on('x', 'not-a-fn'), /EventBus/);
});
