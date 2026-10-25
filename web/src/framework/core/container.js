// Service + ServiceContainer: quản lý vòng đời hệ thống (init → update → dispose)
// theo thứ tự khai báo `order`. Game orchestrator đăng ký service thay vì tự gọi rời rạc.
export class Service {
  constructor(app = null) {
    this.app = app;
    this._ready = false;
  }
  init(_ctx) {}
  update(_dt, _ctx) {}
  dispose(_ctx) {}
}

export class ServiceContainer {
  constructor(ctx = null) {
    this.ctx = ctx;
    this._services = [];   // { name, service, order }
    this._byName = new Map();
  }

  register(name, service, { order = 0 } = {}) {
    if (this._byName.has(name)) throw new Error(`Service "${name}" đã được đăng ký`);
    if (!service || typeof service !== 'object') throw new Error(`Service "${name}": cần một object`);
    this._byName.set(name, service);
    this._services.push({ name, service, order });
    this._services.sort((a, b) => a.order - b.order);
    return service;
  }

  get(name) { return this._byName.get(name) ?? null; }
  require(name) {
    const s = this._byName.get(name);
    if (!s) throw new Error(`Chưa đăng ký service "${name}"`);
    return s;
  }
  has(name) { return this._byName.has(name); }

  initAll(ctx = this.ctx) {
    for (const s of this._services) { if (s.service.init) s.service.init(ctx); s.service._ready = true; }
  }

  updateAll(dt, ctx = this.ctx) {
    for (const s of this._services) if (s.service._ready && s.service.update) s.service.update(dt, ctx);
  }

  disposeAll(ctx = this.ctx) {
    for (const s of [...this._services].reverse()) {
      if (s.service.dispose) s.service.dispose(ctx);
      s.service._ready = false;
    }
    this._services = [];
    this._byName.clear();
  }
}
