// EventBus: pub/sub tối giản. Payload là MỘT đối số duy nhất (object payload).
// Trả về hàm unsubscribe từ on()/once() — tiện gắn trong constructor và gỡ trong dispose.
export class EventBus {
  constructor() { this._map = new Map(); }

  on(type, fn) {
    if (typeof type !== 'string' || typeof fn !== 'function') throw new Error('EventBus.on(type, fn): sai tham số');
    if (!this._map.has(type)) this._map.set(type, new Set());
    this._map.get(type).add(fn);
    return () => this.off(type, fn);
  }

  once(type, fn) {
    const off = this.on(type, (payload) => { off(); fn(payload); });
    return off;
  }

  off(type, fn) { this._map.get(type)?.delete(fn); }

  emit(type, payload) {
    const set = this._map.get(type);
    if (!set || !set.size) return 0;
    let n = 0;
    for (const fn of [...set]) { fn(payload); n++; } // copy: listener có thể off khi đang chạy
    return n;
  }

  listenerCount(type) { return this._map.get(type)?.size || 0; }
  clear(type) { type ? this._map.delete(type) : this._map.clear(); }
}
