import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Registry } from '../../web/src/framework/core/registry.js';

test('Registry: register/get/has/all/ids', () => {
  const r = new Registry({ name: 'enemies' });
  r.register({ id: 'grunt', hp: 10 });
  r.registerAll([{ id: 'archer', hp: 5 }, { id: 'brute', hp: 30 }]);
  assert.equal(r.size, 3);
  assert.equal(r.get('grunt').hp, 10);
  assert.equal(r.get('zzz'), null);
  assert.ok(r.has('archer'));
  assert.deepEqual(r.ids().sort(), ['archer', 'brute', 'grunt']);
  assert.equal(r.all().length, 3);
});

test('Registry: require ném lỗi khi thiếu, duplicate chặn, keyOf tùy biến', () => {
  const r = new Registry({ name: 'items' });
  r.register({ id: 'sword' });
  assert.throws(() => r.require('shoe'), /items/);
  assert.throws(() => r.register({ id: 'sword' }), /đã tồn tại/);

  const byKey = new Registry({ name: 'skills', keyOf: (d) => d.skill });
  byKey.register({ skill: 'iai', cd: 2 });
  assert.equal(byKey.get('iai').cd, 2);

  const strict = new Registry({ name: 'w', validate: (d) => typeof d.hp === 'number' });
  assert.throws(() => strict.register({ id: 'bad' }), /không hợp lệ/);
  assert.throws(() => new Registry().register({ noId: 1 }), /thiếu khóa/);
});
