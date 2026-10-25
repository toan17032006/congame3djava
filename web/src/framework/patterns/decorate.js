// Decorator / Mixin / Interface / Abstract cho JavaScript thuần (không TS, không Babel).
export function mixin(Base, ...traits) {
  return traits.reduce((C, t) => t(C), Base);
}

// Lớp trừu tượng: constructor ném lỗi nếu lớp con chưa override method bắt buộc.
export function abstractClass(name, methods) {
  const Base = class {
    constructor() {
      const unimplemented = methods.filter((m) => typeof this[m] !== 'function' || this[m] === Base.prototype[m]);
      if (unimplemented.length) {
        throw new Error(`Lớp trừu tượng ${name}: lớp con phải triển khai ${unimplemented.join(', ')}`);
      }
    }
  };
  for (const m of methods) {
    Base.prototype[m] = function () { throw new Error(`${name}.${m} là phương thức trừu tượng`); };
  }
  Object.defineProperty(Base, 'name', { value: name });
  return Base;
}

// Interface (contract runtime): bọc class, kiểm tra instance có đủ method khi khởi tạo.
export function implementsContract(ClassDef, methods) {
  const Wrapped = class extends ClassDef {
    constructor(...args) {
      super(...args);
      const missing = methods.filter((m) => typeof this[m] !== 'function');
      if (missing.length) {
        throw new Error(`${ClassDef.name} không thỏa contract: thiếu ${missing.join(', ')}`);
      }
    }
  };
  Object.defineProperty(Wrapped, 'name', { value: ClassDef.name });
  return Wrapped;
}

// Method decorators trên object/prototype (dùng cho hook log/measure/guard):
function decorate(target, name, wrapper) {
  const orig = target[name];
  if (typeof orig !== 'function') throw new Error(`decorate: "${name}" không phải function`);
  target[name] = wrapper(orig);
  return target;
}

export function before(target, name, fn) {
  return decorate(target, name, (orig) => function (...args) { fn.apply(this, args); return orig.apply(this, args); });
}

export function after(target, name, fn) {
  return decorate(target, name, (orig) => function (...args) {
    const result = orig.apply(this, args);
    fn.call(this, result, ...args);
    return result;
  });
}

export function around(target, name, wrapper) {
  return decorate(target, name, (orig) => function (...args) {
    return wrapper.call(this, orig.bind(this), ...args);
  });
}
