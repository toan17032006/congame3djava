// ObjectPool: tái sử dụng đối tượng tần suất cao (particle, popup, arc, projectile…)
// để tránh GC spike. create() tạo mới khi hết; reset(obj, …args) tái khởi tạo khi tái sử dụng.
export class ObjectPool {
  constructor({ create, reset = null, max = Infinity, initial = 0 } = {}) {
    if (typeof create !== 'function') throw new Error('ObjectPool: cần create()');
    this._create = create;
    this._reset = reset;
    this.max = max;
    this._free = [];
    this._out = new Set();
    for (let i = 0; i < initial; i++) this._free.push(this._create());
  }

  acquire(...args) {
    const obj = this._free.pop() ?? this._create();
    this._out.add(obj);
    if (this._reset) this._reset(obj, ...args);
    return obj;
  }

  release(obj) {
    if (!this._out.delete(obj)) return false;
    if (this._free.length < this.max) this._free.push(obj);
    return true;
  }

  releaseAll() { for (const o of [...this._out]) this.release(o); }

  get size() { return this._out.size; }   // số đối tượng đang cho mượn
  get free() { return this._free.length; } // số đối tượng đang rảnh
}
