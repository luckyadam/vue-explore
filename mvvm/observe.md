# 对象监听

### 双向绑定

目前前端世界丰富多彩，各种**MVVM**的框架层出不穷，而这类框架大多都是支持数据双向绑定的，双向绑定看起来非常神奇，而且不同框架几乎都有自己的实现方式，但归纳起来大致有一下几种机制

- 脏检测，Angular 1.x中的方案
- 观察机制，[``Object.observe()``](https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Global_Objects/Object/observe)，曾经非常惊艳的方法，可以预见将给前端框架带来巨大改变，可惜已被废弃
- 属性访问器，[``Object.defineProperty()``](https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Global_Objects/Object/defineProperty)，ES5中就提供的方法，这是目前主流框架如 `Vue` 所使用的数据双向绑定的核心方法

接下来就来了解一下 ``Object.defineProperty()`` 方法

### Object.defineProperty

首先看看 ``Object.defineProperty()`` 方法的官方定义，*The Object.defineProperty() method defines a new property directly on an object, or modifies an existing property on an object, and returns the object*。可见 ``Object.defineProperty()`` 方法就是用来新增或是修改对象属性的方法，但它的神奇之处在于可以自定义对象属性的 `get()` 和 `set()` 方法即存取器，因此可以实现对属性的监控，只要对 ``Object.defineProperty()`` 方法设置的属性做出任何修改，我们都能捕捉到它的信息。

``Object.defineProperty()`` 方法接受3个必传参数

**obj**，需要定义属性的对象

**prop**，需要定义或修改的属性名

**descriptor**，属性的描述

这里前两个参数都明白是什么意思，关键是第三个参数 **descriptor** ，这个参数是一个对象，它包含以下内容

**configurable**，属性是否可被配置，如果为`false`，则后面不能再配置改属性，再用``Object.defineProperty()`` 方法来修改属性将会报错，默认值为`false`

**enumerable**，属性是否可被枚举，即是否可被`for...in..` 和 `Object.keys()`遍历到，默认为`false`

**value**，属性的值，默认`undefined`

**writable**，属性是否可写，如果为false，则属性值将不可写，默认为`false`

**get**，属性访问器，默认`undefined`

**set**，属性设置器，默认`undefined`

需要注意的是**get/set**不能和**value**或**writable**同时使用，会报错

接下来看几个例子就会使用了

```javascript
const obj = {};
Object.defineProperty(obj, 'a', {
  value: 'static'
});
// 等价于
Object.defineProperty(obj, 'a', {
  configurable: false,
  enumerable: false,
  writable: false,
  value: 'static'
});
console.log(obj.a); // => static
obj.a = 'change';
console.log(obj.a); // => static
console.log(Object.keys(obj)); // => []
Object.defineProperty(obj, 'a', { // => Uncaught TypeError: Cannot redefine property: a
  value: 'change'
});
```

一个简单的**getter/setter**示例

```javascript
let value = 1;
const obj = {};
Object.defineProperty(obj, 'a', {
  configurable: true,
  enumerable: true,
  set (newVal) {
    console.log('设置了a的值');
    value = newVal
  },
  get () {
    console.log(`访问了a的值，它的值为${value}`);
    return value;
  }
});
```

在浏览器控制台中将获得如下效果

![observe](http://ww2.sinaimg.cn/large/49320207gw1fbfrsdnzjpg20zs0q8hdw.gif)

### 监听一个对象的变化

了解了 `Object.defineProperty()` 方法后，我们就可以来尝试使用封装 `Object.defineProperty()` 的方式来监听一个对象的变化了

```javascript

const _define = (obj, key, val, enumerable) => {
  Object.defineProperty(obj, key, {
    value: val,
    enumerable: !!enumerable,
    writable: true,
    configurable: true
  })
};

class Observer {
  constructor (value) {
    this.value = value;
    this.parents = null;
    if (value) {
      _define(value, '$observer', this);
      this.walk(value);
    }
  }

  // 使用递归的方式，监听对象的每一个属性
  walk (obj) {
    Object.keys(obj).forEach(key => {
      if (obj.hasOwnProperty(key)) {
        let val = obj[key];
        this.observe(key, val);
        this.convert(key, val);
      }
    });
  }

  observe (key, val) {
    Observer.create(val);
  }

  unobserve (val) {
    if (val && val.$observer) {
      val.$observer.findParent(this, true);
    }
  }

  convert (key, val) {
    const prefix = key.charAt(0);
    if (/\$|_/.test(prefix)) {
      return;
    }
    var ob = this;
    Object.defineProperty(this.value, key, {
      enumerable: true,
      configurable: true,
      get () {
        console.log(`你访问了${key}`);
        return val;
      },
      set (newVal) {
        console.log(`你设置了${key}，现在值为${newVal}`);
        if (newVal === val) {
          return;
        }
        val = newVal;
      }
    });
  }

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
}

// 测试用例
const data = {
  name: 'luckyadam',
  info: {
    age: 25,
    description: 'handsome'
  }
};
const observer = new Observer(data);
```