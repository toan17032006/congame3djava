// BaseEntity + BaseComponent: hệ Entity–Component tối giản, KHÔNG phụ thuộc three.js.
// - Vec3 factory inject được: game truyền THREE.Vector3, test/node dùng object {x,y,z}.
// - Component: gắn/tháo runtime, update tự chạy trước entity.onUpdate.
let NEXT_ID = 1;

export class BaseEntity {
  constructor(x = 0, y = 0, z = 0, { vec3 = null, id = null } = {}) {
    const V = vec3 || ((vx, vy, vz) => ({ x: vx, y: vy, z: vz }));
    this.id = id ?? NEXT_ID++;
    this.pos = V(x, y, z);
    this.vel = V(0, 0, 0);
    this.yaw = 0;
    this.alive = true;
    this.disposed = false;
    this._components = [];
  }

  // ---- component system ----
  addComponent(component) {
    if (!component || typeof component !== 'object') throw new Error('addComponent: cần một component');
    component.entity = this;
    this._components.push(component);
    if (component.onAdd) component.onAdd(this);
    return component;
  }

  getComponent(Type) {
    return this._components.find((c) => c instanceof Type) || null;
  }

  getComponents(Type) { return this._components.filter((c) => c instanceof Type); }

  removeComponent(component) {
    const i = this._components.indexOf(component);
    if (i < 0) return false;
    this._components.splice(i, 1);
    if (component.onRemove) component.onRemove(this);
    component.entity = null;
    return true;
  }

  // ---- lifecycle ----
  // ctx = ngữ cảnh game (app/world). Ghi đè onUpdate/onDispose ở lớp con.
  update(dt, ctx = null) {
    if (this.disposed) return;
    for (const c of [...this._components]) if (c.enabled) c.update(dt, ctx);
    this.onUpdate(dt, ctx);
  }

  onUpdate(dt, ctx) {}

  dispose(ctx = null) {
    if (this.disposed) return;
    this.disposed = true;
    this.alive = false;
    for (const c of [...this._components]) {
      if (c.onRemove) c.onRemove(this);
      c.entity = null;
    }
    this._components.length = 0;
    this.onDispose(ctx);
  }

  onDispose(ctx) {}
}

export class BaseComponent {
  constructor(..._args) {
    this.entity = null;
    this.enabled = true;
  }
  onAdd(_entity) {}
  onRemove(_entity) {}
  update(_dt, _ctx) {}
}
