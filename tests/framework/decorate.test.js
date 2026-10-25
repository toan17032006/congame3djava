import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mixin, abstractClass, implementsContract, before, after, around } from '../../web/src/framework/patterns/decorate.js';

test('mixin: chuỗi trait hàm (Class) => Class', () => {
  const CanFly = (C) => class extends C { fly() { return `${this.name} bay`; } };
  const CanSwim = (C) => class extends C { swim() { return `${this.name} lặn`; } };
  class Duck { constructor() { this.name = 'vit'; } }
  const SuperDuck = mixin(Duck, CanFly, CanSwim);
  const d = new SuperDuck();
  assert.equal(d.fly(), 'vit bay');
  assert.equal(d.swim(), 'vit lặn');
  assert.ok(d instanceof Duck);
});

test('abstractClass: chặn lớp con thiếu method, cho qua khi đã override', () => {
  const Shape = abstractClass('Shape', ['area', 'draw']);
  assert.throws(() => new Shape(), /Shape.*area, draw/);
  class Bad extends Shape { area() { return 1; } }
  assert.throws(() => new Bad(), /draw/);
  class Square extends Shape {
    area() { return 4; }
    draw() { return '■'; }
  }
  assert.equal(new Square().area(), 4);
});

test('implementsContract: bọc class kiểm tra runtime', () => {
  class Renderer { clear() {} }
  const Guarded = implementsContract(Renderer, ['clear', 'render']);
  assert.throws(() => new Guarded(), /thiếu render/);
  class Full extends Guarded { render() {} }
  assert.ok(new Full() instanceof Renderer);
});

test('before/after/around: decorator method trên object', () => {
  const svc = { log: [], shoot(dmg) { this.log.push(`shoot:${dmg}`); return dmg * 2; } };

  before(svc, 'shoot', function (dmg) { this.log.push(`before:${dmg}`); });
  assert.equal(svc.shoot(5), 10);
  assert.deepEqual(svc.log, ['before:5', 'shoot:5']);

  after(svc, 'shoot', function (result) { this.log.push(`after:${result}`); });
  svc.log = [];
  svc.shoot(3);
  assert.deepEqual(svc.log, ['before:3', 'shoot:3', 'after:6']);

  around(svc, 'shoot', function (orig, dmg) {
    this.log.push('wrap-in');
    const r = orig(dmg);
    this.log.push('wrap-out');
    return r;
  });
  svc.log = [];
  assert.equal(svc.shoot(2), 4);
  assert.deepEqual(svc.log, ['wrap-in', 'before:2', 'shoot:2', 'after:4', 'wrap-out']);
});
