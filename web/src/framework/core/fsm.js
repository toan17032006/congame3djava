// StateMachine: máy trạng thái có hook enter/exit/update + guard `can`.
// states: { tenTrangThai: { enter(ctx, from), update(ctx, dt, fsm), exit(ctx, to), can(ctx, from) } }
// ctx là "chủ thể" (entity/system) — truyền sẵn, callback nhận trực tiếp.
export class StateMachine {
  constructor({ states = {}, initial = null, ctx = null, onChange = null } = {}) {
    this.states = states;
    this.ctx = ctx;
    this.onChange = onChange;
    this.current = null;
    this.time = 0; // thời gian đã ở trạng thái hiện tại
    if (initial) if (!this.set(initial)) throw new Error(`StateMachine: trạng thái khởi tạo không tồn tại "${initial}"`);
  }

  get name() { return this.current || ''; }
  get state() { return this.states[this.current] || null; }

  // Chuyển trạng thái. false nếu: trùng tên (không force), thiếu state, hoặc guard `can` chặn.
  set(name, force = false) {
    if (name === this.current && !force) return false;
    const next = this.states[name];
    if (!next) return false;
    if (next.can && !next.can(this.ctx, this.current)) return false;
    const from = this.current;
    if (from && this.states[from].exit) this.states[from].exit(this.ctx, name);
    this.current = name;
    this.time = 0;
    if (next.enter) next.enter(this.ctx, from);
    if (this.onChange) this.onChange(name, from, this.ctx);
    return true;
  }

  update(dt, ctx = this.ctx) {
    if (!this.current) return;
    this.time += dt;
    const s = this.states[this.current];
    if (s && s.update) s.update(ctx, dt, this);
  }
}
