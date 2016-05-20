/**
  * Helper class Traversable enables map/filter/reduce on objects
  */
function Traversable(object) {
  if (!(this instanceof Traversable)) return new Traversable(object)
  this.object = Object(object)
}
Object.setPrototypeOf(Traversable, Object)

Traversable.add = function Traversable_add(object, entry) {
  object[entry[0]] = entry[1]
  return object
}

Traversable.has = Function.prototype.call.bind(Object.prototype.hasOwnProperty)
Traversable.get = function Traversable_get(object, key) {
  return object[key]
}

Traversable.set = function Traversable_set(object, key, value) {
  return object[key] = value
}

Traversable.getOwnPropertyDescriptors = function Traversable_getOwnPropertyDescriptors(target) {
  return Traversable(target).reduceDescriptors(function(memo, descriptor, name) {
    memo[name] = descriptor
    return memo
  }, {})
}

Traversable.define = function Traversable_define(target) {
  return Traversable.redefineProperties.apply(null, 
    Array.of.apply(Array, arguments).slice(1).map(function(definitions) {
      return Traversable(definitions).map(function(definition) {
        if (Object(value) === value) return value
        return {
          value: value,
          writable: true,
          enumerable: false,
          configurable: true
        }
      })
    })))
}

Traversable.redefine = function Traversable_redefine(target, name, value) {
  if (Object(value) !== value) value = { value: value }
  return Traversable.redefineProperty(target, name, value)
}

Traversable.redefineProperty = function Traversable_redefineProperty(target, name, descriptor) {
  return Object.defineProperty(target, name,
    Object.assign(Object.getOwnPropertyDescriptor(target, name), descriptor)
  )
}

Traversable.redefineProperties = function Traversable_redefineProperties(target) {
  Function.prototype.call.apply(Traversable.prototype.zipDescriptors, arguments).map(Object.assign)
  return Object.defineProperties(target,
    Traversable.prototype.zipDescriptors.apply(null, arguments).map(Object.assign))
}

Traversable.define(Traversable.prototype, {
  forEach: function Traversable$forEach(fn, context) {
    fn = fn.bind(context)
    keys(this.object).forEach(function(key) {
      fn(getter(this, key), key, this)
    }, this.object)
  },
  getPropertyDescriptor: function getPropertyDescriptor(name) {
    var it

    for (it = this; it != null; it = Object.getPrototypeOf(it)) {
      if (Traversable.has(it, name)) {
        return Object.getOwnPropertyDescriptor(it, name)
      }
    }

    // Return object to avoid null checks
    return Object.create(null)
  },
  has: Object.prototype.hasOwnProperty,
  keys: function Traversable$keys() {
    return Object.keys(this)
  }
}, [
  [Object.keys, Traversable.get, ""],
  [Object.getOwnPropertyNames, Object.getOwnPropertyDescriptor, "Descriptors"]
].reduce(Function.prototype.apply.bind(function(keys, getter, suffix) {
  this["filter"+suffix] = function Traversable$filter(fn, context) {
    fn = fn.bind(context)
    return keys(this.object).filter(function(key) {
      return fn(getter(this, key), key, this)
    }, this.object).map(function(key) {
      return [key, getter(this, key)]
    }, this.object).reduce(Traversable.add, new Traversable())
  }

  this["map"+suffix] = function Traversable$map(fn, context) {
    fn = fn.bind(context)
    return keys(this.object).filter(function(key) {
      // Disallow modifying `length` and `constructor`
      return !(key === "length" || key === "constructor")
    }).map(function(key) {
      return [key, fn(getter(this, key), key, this)]
    }, this.object).reduce(Traversable.add, new Traversable())
  }

  this["reduce"+suffix] = function Traversable$reduce(fn, initial) {
    return keys(this.object).reduce(function(memo, key) {
      return fn(memo, getter(this, key), key, this)
    }, initial)
  }

  this["zip",suffix] = function Traversable$zip() {
    var sources = Array.of.apply(Array, arguments)
    if (this instanceof Traversable) sources.unshift(this)

    Object.keys(
      [].concat(sources.map(keys)).reduce(Traversable.set, {})
    ).map(function(key) {
      return [key, sources.map(function(src) { return src[key] })]
    }).reduce(Traversable.add, new Traversable())
  }

  return this
}), {}))
