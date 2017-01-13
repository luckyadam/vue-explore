import * as _ from '../util';

class Observer {

  static create (value) {
    if (value &&
      value.hasOwnProperty('$observer') && 
      value.$observer instanceof Observer) {
      return value.$observer;
    }
    if (typeof value === 'object') {
      return new Observer(value);
    }
  }

  constructor (value) {
    this.value = value;
    if (value) {
      _.define(value, '$observer', this);
      if (_.isArray(value)) {
        this.observeArray(value);
      } else if (_.isObject(value)) {
        this.observeObject(value);
      }
    }
  }

  observe (key, val) {
    Observer.create(val);
  }

  observeObject (value) {
    if (!value || typeof value !== 'object') {
      return;
    }
    Object.keys(value).forEach(key => {
      let val = value[key];
      this.observe(key, val);
      this.defineGetterAndSetter(key, val);
    });
  }

  observeArray (value) {
    _.augument(value, this.arrayAugument());
    this.link(value);
  }

  link (arr, index) {
    index = index || 0;
    for (let i = 0; i < arr.length; i++) {
      this.observe(i + index, arr[i]);
    }
  }

  defineGetterAndSetter (key, val) {
    const prefix = key.charAt(0);
    if (/\$|_/.test(prefix)) {
      return;
    }
    const ob = this;
    Object.defineProperty(this.value, val, {
      enumerable: true,
      configurable: true,
      get () {
        return val;
      },
      set (newVal) {
        if (val === newVal) {
          return;
        }
        this.observe(key, newVal);
        val = newVal;
      }
    });
  }

  objectAugument () {
    const objectAugmentations = Object.create(Object.prototype);
    _.define(objectAugmentations, '$add', function (key, val) {
      if (this.hasOwnProperty(key)) {
        return;
      }
      _.define(this, key, val, true);
      const ob = this.$observer;
      ob.observe(key, val);
      ob.defineGetterAndSetter(key, val);
    });

    _.define(objectAugmentations, '$delete', function (key) {
      if (!this.hasOwnProperty(key)) {
        return;
      }
      delete this[key];
    });
  }

  arrayAugument () {
    const arrayAugmentations = Object.create(Array.prototype);
    ['push', 'pop', 'shift', 'unshift', 'splice', 'sort', 'reverse'].forEach((method) => {
      const original = Array.prototype[method];
      _.define(arrayAugmentations, method, function () {
        const args = [].slice.call(arguments);
        const result = original.apply(this, args);
        const ob = this.$observer;
        let index;
        let inserted;
        switch (method) {
          case 'push':
            inserted = args;
            index = this.length - args.length;
            break;
          case 'unshift':
            inserted = args;
            index = 0;
            break;
          case 'pop':
            index = this.length;
            break;
          case 'shift':
            index = 0;
            break;
          case 'splice':
            inserted = args.slice(2);
            index = args[0];
            break;
        }
        // 再监视数组插入项
        if (inserted) {
          ob.link(inserted, index);
        }
      });
    });

    _.define(arrayAugmentations, '$set', function (index, val) {
      if (index >= this.length) {
        index = this.length;
      }
      return this.splice(index, 1, val)[0];
    });

    _.define(arrayAugmentations, '$remove', function (index, val) {
      if (typeof index !== 'number') {
        index = this.indexOf(index);
      }
      if (index > -1) {
        return this.splice(index, 1)[0];
      }
    });

    return arrayAugmentations;
  }
}