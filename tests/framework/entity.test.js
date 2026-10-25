import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BaseEntity, BaseComponent } from '../../web/src/framework/core/entity.js';

test('Entity: id duy nhất, vec3 factory inject được', () => {
  const a = new BaseEntity(1, 2, 3);
  const b = new BaseEntity();
  assert.notEqual(a.id, b.id);
  assert.deepEqual(a.pos, { x: 1, y: 2, z: 3 });
  assert.deepEqual(a.vel, { x: 0, y: 0, z: 0 });

  class V3 { constructor(x, y, z) { this.x = x; this.y = y; this.z = z; this.isV3 = true; } }
  const c = new BaseEntity(0, 0, 0, { vec3: (x, y, z) => new V3(x, y, z) });
  assert.ok(c.pos.isV3);
});

test('Component: add/get/remove và update loop', () => {
  class Health extends BaseComponent {
    constructor(max) { super(); this.max = max; this.hp = max; this.updated = 0; }
    update(dt) { this.updated += dt; }
    onAdd(e) { e.hasHealth = true; }
    onRemove(e) { e.hasHealth = false; }
  }
  class Poison extends BaseComponent { update(dt, ctx) { this.last = ctx; } }

  const e = new BaseEntity();
  const h = e.addComponent(new Health(100));
  e.addComponent(new Poison());
  assert.equal(e.getComponent(Health), h);
  assert.ok(e.hasHealth);

  e.update(0.1, 'ctx');
  assert.equal(h.updated, 0.1);

  assert.equal(e.removeComponent(h), true);
  assert.equal(e.hasHealth, false);
  assert.equal(e.getComponent(Health), null);
});

test('Entity: dispose lifecycle — onDispose chạy 1 lần, component bị tháo', () => {
  let disposed = 0;
  class Tag extends BaseComponent {
    onRemove() { this.removed = true; }
  }
  const e = new BaseEntity();
  const t = e.addComponent(new Tag());
  e.onDispose = () => disposed++;
  e.dispose('ctx');
  e.dispose('ctx'); // lần 2 phải là no-op
  assert.equal(disposed, 1);
  assert.ok(t.removed);
  assert.equal(t.entity, null);
  assert.equal(e.disposed, true);
  assert.equal(e.alive, false);
});
