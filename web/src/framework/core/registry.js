// Registry: kho định nghĩa dữ liệu theo id (enemy, item, skill, level, vfx…).
// Data-driven: thêm nội dung mới = register định nghĩa, không sửa code hệ thống.
export class Registry {
  constructor({ name = 'registry', keyOf = (d) => d.id, validate = null } = {}) {
    this.name = name;
    this.keyOf = keyOf;
    this.validate = validate;
    this._map = new Map();
  }

  register(def) {
    const key = this.keyOf(def);
    if (key === undefined || key === null) throw new Error(`${this.name}: định nghĩa thiếu khóa (keyOf)`);
    if (this.validate && !this.validate(def)) throw new Error(`${this.name}: định nghĩa "${key}" không hợp lệ`);
    if (this._map.has(key)) throw new Error(`${this.name}: "${key}" đã tồn tại`);
    this._map.set(key, def);
    return def;
  }

  registerAll(defs) { for (const d of defs) this.register(d); return this; }

  has(id) { return this._map.has(id); }
  get(id) { return this._map.get(id) ?? null; }
  require(id) {
    const d = this._map.get(id);
    if (!d) throw new Error(`${this.name}: không có định nghĩa "${id}"`);
    return d;
  }
  all() { return [...this._map.values()]; }
  ids() { return [...this._map.keys()]; }
  get size() { return this._map.size; }

  clear() { this._map.clear(); }
}
