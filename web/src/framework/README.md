# Framework — thư viện nền cho Samurai Game (và dự án web tiếp theo)

Tách từ game thành các mảnh tái sử dụng: **Object / Component / Function / Decorator /
Interface / Abstract / Class**. Tất cả module ở đây **không phụ thuộc three.js hay DOM**
(khác phần gfx/), nên dùng lại được cho bất kỳ dự án web nào và test được headless.

```js
// Lấy một lần, dùng mọi nơi:
import { EventBus, StateMachine, Registry, BaseEntity, BaseComponent, Service,
  ServiceContainer, ObjectPool, Ticker, mixin, abstractClass, implementsContract,
  before, after, around, ResourceCache, SettingsStore, createSerializable,
  clamp, damp, mulberry32, makeNoise2D } from './framework/index.js';
```

## Module

| Module | Vai trò | Dùng khi nào |
|---|---|---|
| `core/events.js` | `EventBus` — pub/sub, unsubscribe bằng hàm trả về | nối lỏng các hệ thống (quest ↔ combat ↔ UI) |
| `core/fsm.js` | `StateMachine` — máy trạng thái có enter/exit/update/guard | AI NPC, state nhân vật, flow màn |
| `core/entity.js` | `BaseEntity` + `BaseComponent` — entity có component runtime | mọi đối tượng trong world |
| `core/registry.js` | `Registry` — kho định nghĩa data theo id | enemy/item/skill/level/VFX mới |
| `core/container.js` | `Service` + `ServiceContainer` — vòng đời hệ thống | orchestrator (game.js) |
| `core/pool.js` | `ObjectPool` — tái sử dụng đối tượng, chống GC spike | particle/popup/projectile |
| `core/ticker.js` | `Ticker` — vòng lặp rAF: dt clamp, timeScale, hitstop, FPS | renderer, simulation |
| `patterns/decorate.js` | `mixin`, `abstractClass`, `implementsContract`, `before/after/around` | mở rộng class không sửa gốc |
| `patterns/cache.js` | `ResourceCache` — cache tài nguyên theo key, dispose dứt điểm | geometry/material/texture |
| `patterns/settings.js` | `SettingsStore` — cài đặt + persist + onChanged | panel cài đặt |
| `patterns/serialize.js` | `createSerializable(keys)` — mixin save/load whitelist | save system |
| `math.js` | clamp/lerp/damp/angle/noise/rng/esc… | mọi nơi |

## Công thức nhanh (import → điền thông số → hiệu chỉnh)

### 1. Entity mới có component
```js
import { BaseEntity, BaseComponent } from './framework/index.js';

class Floater extends BaseComponent {
  constructor(amp = 0.5) { super(); this.amp = amp; this.t = 0; }
  update(dt) { this.t += dt; this.entity.mesh.position.y = Math.sin(this.t * 2) * this.amp; }
}

class Orb extends BaseEntity {           // vec3 mặc định {x,y,z}; game truyền THREE.Vector3
  constructor(x, y, z) {
    super(x, y, z, { vec3: (a, b, c) => new THREE.Vector3(a, b, c) });
    this.addComponent(new Floater(1.2));  // điền thông số, xong
  }
  onUpdate(dt) { /* logic riêng của entity */ }
}
// vòng đời: orb.update(dt, game) → components → onUpdate; orb.dispose(game) dọn tất cả.
```

### 2. AI máy trạng thái
```js
import { StateMachine } from './framework/index.js';

this.fsm = new StateMachine({
  ctx: this,
  initial: 'patrol',
  states: {
    patrol: { update: (me, dt) => me.walkRoute(dt) },
    chase:  { enter: (me) => me.anim.play('run'), update: (me, dt) => me.seek(dt) },
    attack: { can: (me) => me.stamina > 10, update: (me, dt) => me.swing(dt) },
  },
});
// tick: this.fsm.update(dt); chuyển: this.fsm.set('chase');
```

### 3. Thêm nội dung data-driven
```js
import { Registry } from './framework/index.js';
export const vfx = new Registry({ name: 'vfx', validate: (d) => typeof d.build === 'function' });
vfx.register({ id: 'slash_blue', build: (scene) => makeArc(scene, 0x7ae0ff) });
const def = vfx.require('slash_blue');
```
Game mẫu: `data/enemies.js` (`enemies`), `data/items.js` (`items`), `data/skills.js` (`skills`),
`data/bosses.js` (`bosses`) đã dùng Registry — thêm định nghĩa mới chỉ cần thêm object có `id`.

### 4. Class trừu tượng / Interface / Decorator
```js
import { abstractClass, implementsContract, around } from './framework/index.js';

const Updatable = abstractClass('Updatable', ['update']);       // chặn thiếu method khi new
class System extends Updatable { update(dt) {} }               // ✔

const Safe = implementsContract(System, ['update', 'dispose']); // kiểm contract runtime

around(System.prototype, 'update', function (orig, dt) {        // decorator đo thời gian
  const t0 = performance.now(); orig(dt);
  this.lastMs = performance.now() - t0;
});
```

### 5. Mixin theo trait
```js
import { mixin } from './framework/index.js';
const HasHp = (C) => class extends C { hp = 100; damage(n) { this.hp -= n; } };
const HasName = (C) => class extends C { name = '???'; };
class Actor extends mixin(BaseEntity, HasHp, HasName) {}
```

### 6. Service trong orchestrator
```js
import { ServiceContainer, Service } from './framework/index.js';
class CombatService extends Service {
  update(dt) { /* tick mỗi frame */ }
}
this.services = new ServiceContainer(this);
this.services.register('combat', new CombatService(this), { order: 2 });
this.services.register('ui', new UiService(this), { order: 5 });
this.services.initAll();          // boot
this.services.updateAll(dt);      // mỗi frame, đúng thứ tự order
this.services.disposeAll();       // tắt game, dispose ngược thứ tự
```

### 7. Pool + Cache + Settings + Serialize
```js
import { ObjectPool, ResourceCache, SettingsStore, createSerializable } from './framework/index.js';

const pool = new ObjectPool({ create: () => new Spark(), reset: (s, pos) => s.reset(pos), max: 500 });
const spark = pool.acquire(pos); // … pool.release(spark);

const geoCache = new ResourceCache({ onDispose: (g) => g.dispose() });
const geo = geoCache.get('cone|0.2|1|8', () => new THREE.ConeGeometry(0.2, 1, 8));

const store = new SettingsStore({ defaults: { volume: 0.8 }, storageKey: 'app_v1',
  onChanged: (s) => apply(s) });      // store.set({volume: 0.5}) → persist + callback

const SPlayer = createSerializable(['hp', 'pos', 'inventory'])(Player);
const data = player.serialize(); player.apply(saved);
```

### 8. Ticker (vòng lặp riêng, test được)
```js
import { Ticker } from './framework/index.js';
const ticker = new Ticker({ update: (dt, rawDt) => simulate(dt), maxDt: 0.05 });
ticker.hitstop(0.12);      // slow-motion 0.12s
ticker.start(); ticker.stop();
// test headless: new Ticker({ update, schedule: fakeSchedule, now: fakeNow })
```

## Nguyên tắc bảo trì
1. Framework **không import three.js/DOM** — trừ khi tạo module mới trong `patterns/` có inject.
2. Mọi module mới phải có test trong `tests/framework/` → chạy `npm test` (node --test).
3. Game chỉ tiêu thụ qua import; không đảo ngược (framework không biết game tồn tại).
4. Sửa hành vi mặc định = điền tham số/override; sửa framework = phải có test kèm.
