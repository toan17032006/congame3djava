// createSerializable: sinh mixin serialize/apply theo whitelist khóa.
// Quy ước save/load thống nhất: serialize() trả object phẳng; apply(data) điền ngược.
// Object lồng được deep-copy để dữ liệu lưu không bị tham chiếu chéo.
export function createSerializable(keys, { deepCopy = true } = {}) {
  const copy = (v) => (deepCopy && v && typeof v === 'object' ? JSON.parse(JSON.stringify(v)) : v);
  return (Base) => class Serializable extends Base {
    serialize() {
      const out = {};
      for (const k of keys) {
        const v = this[k];
        if (v !== undefined) out[k] = copy(v);
      }
      return out;
    }
    apply(data = {}) {
      for (const k of keys) {
        if (data[k] === undefined) continue;
        const cur = this[k];
        if (cur && typeof cur === 'object' && !Array.isArray(cur) && typeof data[k] === 'object' && !Array.isArray(data[k])) {
          Object.assign(cur, copy(data[k]));
        } else {
          this[k] = copy(data[k]);
        }
      }
      return this;
    }
  };
}
