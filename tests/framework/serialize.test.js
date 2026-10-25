import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSerializable } from '../../web/src/framework/patterns/serialize.js';

test('createSerializable: serialize/apply đúng whitelist, deep-copy object', () => {
  class Char {
    constructor() { this.hp = 100; this.mp = 30; this.pos = { x: 1, z: 2 }; this.secret = 'x'; }
  }
  const SChar = createSerializable(['hp', 'pos'])(Char);
  const c = new SChar();
  const data = c.serialize();
  assert.deepEqual(data, { hp: 100, pos: { x: 1, z: 2 } }); // mp/secret không lọt
  c.pos.x = 99;
  assert.notEqual(data.pos.x, 99); // serialize copy sâu

  c.apply({ hp: 55, pos: { x: 7, z: 8 }, unknown: 1 });
  assert.equal(c.hp, 55);
  assert.deepEqual(c.pos, { x: 7, z: 8 });
  assert.equal(c.unknown, undefined);
});

test('createSerializable: compose được với mixin khác', () => {
  const HasName = (C) => class extends C { hello() { return `tôi là ${this.name2}`; } };
  class Base { constructor() { this.name2 = 'a'; this.level = 1; } }
  const Combined = mixinStyle(Base);
  function mixinStyle(B) { return HasName(createSerializable(['level'])(B)); }
  const x = new Combined();
  assert.equal(x.hello(), 'tôi là a');
  x.apply({ level: 5 });
  assert.equal(x.level, 5);
  assert.deepEqual(x.serialize(), { level: 5 });
});
