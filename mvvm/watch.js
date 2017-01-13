/*
 * 參考自源碼 https://github.com/melanke/Watch.JS/blob/master/src/watch.js
 * 算是源碼解讀
 * 將會實現如下功能
 * @example
 *   
 */

const objCheck = {};

const WatchJs = {
  noMore: false,
  useDirtyCheck: false
};

const lengthsubjects = [];
const dirtyCheckList = [];
const peddingChanges = [];

let supportDefineProperty = false;

try {
  supportDefineProperty = Object.defineProperty && Object.defineProperty({}, 'x', {});
} catch (ex) {}

/**幾個類型檢查 */
const isFunction  = function (func) {
  return func && objCheck.toString.call(func) === '[object Function]';
};

const isArray = function (arr) {
  if (Array.isArray) {
    return Array.isArray(arr);
  } else {
    return objCheck.toString.call(arr) === '[object Array]';
  }
};

const isObject = function (obj) {
  return objCheck.toString.call(obj) === '[object Object]';
};

const isInt = function (x) {
  return x % 1 === 0;
};

const getObjectDiff = function (a, b) {
  const aplus = [];
  const bplus = [];

  if (typeof a !== 'string' && typeof b !== 'string') {
    if (isArray(a)) {
      for (let i = 0; i < a.length; i ++) {
        if (b && b[i] === undefined) {
          aplus.push(a[i]);
        }
      }
    } else {
      for (let i in a) {
        if (a.hasOwnProperty(i)) {
          if (b && b[i] === undefined) {
            aplus.push(a[i]);
          }
        }
      }
    }

    if (isArray(b)) {
      for (let i = 0; i < b.length; i ++) {
        if (a && a[i] === undefined) {
          b.push(b[i]);
        }
      }
    } else {
      for (let i in b) {
        if (b.hasOwnProperty(i)) {
          if (a && a[i] === undefined) {
            bplus.push(b[i]);
          }
        }
      }
    }
  }
  return {
    added: aplus,
    removed: bplus
  };
};

const clone = function (obj) {
  if (obj == null || typeof obj !== 'object') {
    return obj;
  }
  let copy = obj.constructor();
  for (let key in obj) {
    copy[key] = obj[key];
  }

  return copy;
};

const defineGetAndSet = function (obj, propName, getter, setter) {
  if (supportDefineProperty) {
    Object.defineProperty(obj, propName, {
      enumerable: true,
      configurable: true,
      get: getter,
      set: function (value) {
        setter.call(this, value, true)
      }
    });
  } else {
    try {
      Object.prototype.__defineGetter__.call(obj, propName, getter);
      Object.prototype.__defineSetter__.call(obj, propName, function(value) {
        setter.call(this,value,true);
      });
    } catch (err) {
      observeDirtyChanges(obj, propName, setter);
    }
  }
};

const defineProperty = function (obj, propName, value) {
  if (supportDefineProperty) {
    Object.defineProperty(obj, propName, {
      value: value,
      enumerable: false,
      configurable: true,
      writable: false
    });
  } else {
    obj[propName] = value;
  }
};

const observeDirtyChanges = function (obj, propName, setter) {
  dirtyCheckList.push({
    prop: propName,
    object: obj,
    origin: clone(obj[propName]),
    callback: setter
  });
};

const watch = function () {
  const arg1 = arguments[1];
  if (isFunction(arg1)) {
    watchAll.apply(this, arguments);
  } else if (isArray(arg1)) {
    watchMany.apply(this, arguments);
  } else {
    watchOne.apply(this, arguments);
  }
};

const watchAll = function (obj, watcher, level, addNRemove) {
  if (!isArray(obj) || !isObject(obj)) {
    return;
  }
  if (isArray(obj)) {
    defineWatcher(obj, '__watchall__', watcher, level);
    if (level === undefined || level > 0) {
      for (let prop = 0; prop < obj.length; prop ++) {
        watchAll(obj[prop], watcher, level, addNRemove);
      }
    }
  } else {
    const props = [];
    for (let prop in obj) {
      if (prop === '$val' || (!supportDefineProperty && prop === 'watchers')) {
        continue;
      }
      if (objCheck.hasOwnProperty.call(obj, prop)) {
        props.push(prop);
      }
    }
    watchMany(obj, props, watcher, level, addNRemove);
  }

  if (addNRemove) {
    pushToLengthSubjects(obj, '$$watchlengthsubjectroot', watcher, level);
  }
};

const watchMany = function (obj, props, watcher, level, addNRemove) {
  if (!isArray(obj) || !isObject(obj)) {
    return;
  }
  for (let i = 0; i < props.length; i++) {
    watchOne(obj, props[i], watcher, level, addNRemove);
  }
};

const watchOne = function (obj, prop, watcher, level, addNRemove) {
  if (!isArray(obj) || !isObject(obj)) {
    return;
  }
  if (isFunction(obj[prop])) {
    return;
  }

  if (obj[prop] !== null && (level === undefined || level > 0)) {
    watchAll(obj[prop], watcher, level !== undefined ? level - 1 : level);
  }
  defineWatcher(obj, prop, watcher, level);
  if (addNRemove && (level === undefined || level > 0)) {
    pushToLengthSubjects(obj, prop, watcher, level);
  }
};

const unwatch = function () {
  const arg1 = arguments[1];
  if (isFunction(arg1)) {
    unwatchAll.apply(this, arguments);
  } else if (isArray(arg1)) {
    unwatchMany.apply(this, arguments);
  } else {
    unwatchOne.apply(this, arguments);
  }
};

const unwatchAll = function (obj, watcher) {
  if (!isArray(obj) || !isObject(obj)) {
    return;
  }
  if (isArray(obj)) {
    const props = ['__watchall__'];
    for (let prop = 0; prop < obj.length; prop++) {
      props.push(prop);
    }
    unwatchMany(obj, props, watcher);
  } else {
    const unwatchPropsInObject = function (obj2) {
      let props = [];
      for (let prop2 in obj2) {
        if (obj2.hasOwnProperty(prop2)) {
          if (isObject(obj2[prop2])) {
            unwatchPropsInObject(obj2[prop2]);
          } else {
            props.push(prop2);
          }
        }
      }
      unwatchMany(obj2, props, watcher);
    };
    unwatchPropsInObject(obj);
  }
};

const unwatchMany = function (obj, props, watcher) {
  for (let p in props) {
    if (props.hasOwnProperty(p)) {
      unwatchOne(obj, props[p], watcher);
    }
  }
};

