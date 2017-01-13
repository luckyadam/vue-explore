const checkFn = {}.toString;

export function isObject (obj) {
  return checkFn.call(obj) === '[object Object]';
}

export function isArray (arr) {
  if (Array.isArray) {
    return Array.isArray(arr);
  } else {
    return checkFn.call(arr) === '[object Array]';
  }
}

export function define (obj, key, val, enumerable) {
  Object.defineProperty(obj, key, {
    value: val,
    enumerable: !!enumerable,
    writable: true,
    configurable: true
  });
}

export function deepMixin (to, from) {
  Object.getOwnPropertyNames(from).forEach(key => {
    const descriptor = Object.getOwnPropertyDescriptor(from, key);
    Object.defineProperty(to, key, descriptor);
  });
}

export function augument (target, proto) {
  if ('__proto__' in {}) {
    target.__proto__ = proto;
  } else {
    deepMixin(target, proto);
  }
}