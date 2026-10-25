import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Service, ServiceContainer } from '../../web/src/framework/core/container.js';

test('ServiceContainer: chạy theo order, init/update/dispose', () => {
  const log = [];
  class Svc extends Service {
    constructor(name, order) { super(); this.name = name; this.order = order; }
    init() { log.push(`init:${this.name}`); }
    update(dt) { log.push(`update:${this.name}:${dt}`); }
    dispose() { log.push(`dispose:${this.name}`); }
  }
  const c = new ServiceContainer('app');
  c.register('b', new Svc('b', 10), { order: 10 });
  c.register('a', new Svc('a', 0), { order: 0 });
  c.initAll();
  c.updateAll(0.16);
  c.disposeAll();
  assert.deepEqual(log, [
    'init:a', 'init:b',
    'update:a:0.16', 'update:b:0.16',
    'dispose:b', 'dispose:a', // dispose ngược thứ tự
  ]);
  assert.equal(c.get('a'), null); // đã disposeAll: registry dọn sạch
});

test('ServiceContainer: duplicate chặn, get/require/has', () => {
  const c = new ServiceContainer();
  c.register('x', { update() {} });
  assert.throws(() => c.register('x', {}), /đã được đăng ký/);
  assert.ok(c.has('x'));
  assert.equal(c.get('nope'), null);
  assert.throws(() => c.require('nope'), /Chưa đăng ký/);
  // chưa initAll thì updateAll không chạy
  let ran = 0;
  c.register('y', { update: () => ran++ });
  c.updateAll(0.1);
  assert.equal(ran, 0);
  c.initAll();
  c.updateAll(0.1);
  assert.equal(ran, 1);
});
