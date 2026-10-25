import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SettingsStore, memoryStorage } from '../../web/src/framework/patterns/settings.js';

test('SettingsStore: mặc định + merge dữ liệu lưu sẵn + persist khi set', () => {
  const storage = memoryStorage('t1');
  storage.setItem('cfg_v1', JSON.stringify({ quality: 'ultra' }));
  let changed = 0;
  const s = new SettingsStore({
    defaults: { quality: 'high', volume: 0.8 },
    storageKey: 'cfg_v1',
    storage,
    onChanged: () => changed++,
  });
  assert.equal(s.get('quality'), 'ultra'); // dữ liệu cũ thắng mặc định
  assert.equal(s.get('volume'), 0.8);
  s.set({ volume: 0.5 });
  assert.equal(changed, 1);
  assert.deepEqual(JSON.parse(storage.getItem('cfg_v1')), { quality: 'ultra', volume: 0.5 });
  s.set({ volume: 1 }, { silent: true }); // silent: không persist, không callback
  assert.equal(changed, 1);
  assert.equal(s.get('volume'), 1);
});

test('SettingsStore: dữ liệu hỏng → dùng mặc định, reset về defaults', () => {
  const storage = memoryStorage('t2');
  storage.setItem('bad', '{corrupt');
  const s = new SettingsStore({ defaults: { a: 1 }, storageKey: 'bad', storage });
  assert.deepEqual(s.all, { a: 1 });
  s.set({ a: 9 });
  s.reset();
  assert.deepEqual(s.all, { a: 1 });
  assert.deepEqual(JSON.parse(storage.getItem('bad')), { a: 1 });
});

test('SettingsStore: custom merge giữ key lồng', () => {
  const storage = memoryStorage('t3');
  const s = new SettingsStore({
    defaults: { audio: { music: 0.3, sfx: 0.9 } },
    storageKey: 'cfg3',
    storage,
    merge: (base, patch) => {
      const out = { ...base };
      for (const k in patch) out[k] = typeof patch[k] === 'object' && patch[k] && !Array.isArray(patch[k])
        ? { ...base[k], ...patch[k] } : patch[k];
      return out;
    },
  });
  s.set({ audio: { music: 0.7 } });
  assert.deepEqual(s.get('audio'), { music: 0.7, sfx: 0.9 });
});
