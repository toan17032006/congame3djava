// ResourceCache: cache tài nguyên/giá trị đắt (geometry, material, texture, canvas…)
// theo khóa. Dùng chung một cache cho mọi loại tài nguyên, dispose dứt điểm khi clear.
export class ResourceCache {
  constructor({ keyFn = null, onDispose = null } = {}) {
    // keyFn(...args) tùy chọn khi muốn tạo khóa phức tạp; mặc định get(key, factory)
    this.keyFn = keyFn;
    this.onDispose = onDispose;
    this._map = new Map();
  }

  get(keyOrA, maybeFactoryOrB, maybeC) {
    if (this.keyFn) {
      // dùng chế độ keyFn: get(...args, factory)
      const args = [...arguments];
      const factory = args.pop();
      const key = this.keyFn(...args);
      return this._get(key, factory);
    }
    return this._get(keyOrA, maybeFactoryOrB);
  }

  _get(key, factory) {
    if (!this._map.has(key)) {
      if (typeof factory !== 'function') throw new Error(`ResourceCache: chưa có "${key}" và không có factory`);
      this._map.set(key, factory());
    }
    return this._map.get(key);
  }

  has(key) { return this._map.has(key); }
  delete(key) {
    const v = this._map.get(key);
    if (v === undefined) return false;
    this._map.delete(key);
    if (this.onDispose) this.onDispose(v);
    return true;
  }
  clear() {
    if (this.onDispose) for (const v of this._map.values()) this.onDispose(v);
    this._map.clear();
  }
  get size() { return this._map.size; }
}
