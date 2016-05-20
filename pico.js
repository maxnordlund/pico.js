(function pico() {
  var call = Function.prototype.call,
      has = call.bind(Object.prototype.hasOwnProperty)
      toString = call.bind(Object.prototype.toString)

  /**
   * Creates a new Pico array from the provided input. Use of `new` is optional.
   *
   * @constructor
   * @this {Element} context to query elements from, when `input` is a string,
   *                 defualts to the `document` host object.
   * @param {string|Element|ArrayLike} input to coerce into a Pico array.
   * @return {Pico}
   */
  function Pico(input) {
    var context = (this instanceof Element) ? this : document

    switch (toString(input).slice(8, -1)) {
      case "Null":
      case "Undefined": return Pico.from([])
      case "Array":     return Pico.from(input)
      case "String":    return Pico.from(context.querySelectorAll(input))
      default:          return Pico.from(new Array(input))
    }
  }

  window.$ = window.Pico = Pico

  /**
   * Casts the provided array like object into a Pico array.
   *
   * @param {ArrayLike} list to coerce into a Pico array.
   * @return {Pico}
   */
  Pico.from = function Pico_from(list) {
    var result = Array.from(list)

    // Change the prototype of input to allow various extensions without
    // actually touching Array.prototype
    Object.setPrototypeOf(result, Pico.prototype)
    return result
  }

  Object.setPrototypeOf(Pico, Array)
  Pico.prototype = Object.create(Array.prototype, Object.assign(
    decorateArrayMethods(), decorateElementMethods(), toDescriptors({
      constructor: Pico,
      on: function Pico$on(type, listner, useCapture) {
        return this.addEventListener.apply(this, arguments)
      },
      off: function Pico$off(type, listner, useCapture) {
        return this.removeEventListener.apply(this, arguments)
      },
      once: function Pico$once(type, listner, useCapture) {
        var self = this
        return this.addEventListener(type, function once() {
          self.removeEventListener(type, once, useCapture)
          return listner.apply(this, arguments)
        }, useCapture)
      }
    }, {
      constructors: { get: defineFunction("Pico$constructors", 0,
        ElementDescriptor.finderFor("constructor", function constructorFilter(descriptor) {
          return descriptor.get || "value" in descriptor
        }, function constructorGetter() {
          return this.constructor
        }))
      },
      lengths: { get: defineFunction("Pico$lengths", 0,
        ElementDescriptor.finderFor("length", function lengthFilter(descriptor) {
          return descriptor.get || "value" in descriptor
        }, function lengthGetter() {
          return this.length
        }))
      }
    })
  ))

  function decorateArrayMethods() {
    return descriptorMap(Array.prototype, function(name, descriptor) {
      var original = descriptor.value
      if (typeof original !== "function") return

      descriptor.value = defineFunction(name, method.length, function() {
        var result = original.apply(this, arguments)
        if (Array.isArray(result)) Object.setPrototypeOf(result, Pico.prototype)
        return result
      })
    })
  }

  function decorateElementMethods() {
    return objectMap(Object.getOwnPropertyNames(window).filter(function(name) {
      return /^(HTML|SVG).*Element$/.test(name) && window[name] &&
        Element.prototype.isPrototypeOf(Object.getPrototypeOf(window[name]))
    }).concat(
      "Element", "EventTarget", "Node" // Manually add super classes
    ).reduce(function maxNumberOfParameters(lengths, className) {
      descriptorMap(window[className].prototype, function(name, descriptor) {
        // Set all property names, will default to `NaN`
        lengths[name] = +lengths[name]

        if (typeof descriptor.value === "function") {
          lengths[name] = Math.max(lengths[name]|0, descriptor.value.length)
        }
      })

      return lengths
    }, {}), function createElementDescriptor(length, name) {
      return new ElementDescriptor(name, length)
    })
  }

  // --- Helpers ---

  function defineFunction(name, length, fn) {
    return Object.defineProperties(fn, {
      name: new Constant(name),
      length: new Constant(length)
    })
  }

  function getPropertyDescriptor(target, name) {
    var it

    for (it = target; it != null; it = Object.getPrototypeOf(it)) {
      if (has(it, name)) {
        return Object.getOwnPropertyDescriptor(it, name)
      }
    }

    // Return object to avoid null checks
    return Object.create(null)
  }

  function toDescriptors(properties) {
    var result = objectMap(properties, Hidden)

    if (has(properties, "constructor")) {
      result.constructor = new Hidden(properties.constructor)
    }
    return result
  }

  // === Mapper functions ===

  function descriptorMap(object, _fn, thisArg) {
    var i, name, result,
        fn = _fn.bind(thisArg),
        names = Object.getOwnPropertyNames(object)

    for (i = 0; i < names.length; ++i) {
      // Disallow modifying `length` and `constructor`
      if (name === "length" || name === "constructor") continue
      name = names[i]
      result[name] = fn(
        Object.getOwnPropertyDescriptor(object, name), name, object
      )
    }

    return result
  }

  function objectMap(object, _fn, thisArg) {
    var i, key, result,
        fn = _fn.bind(thisArg),
        keys = Object.keys(object)

    for (i = 0; i < keys.length; ++i) {
      // Disallow modifying `length` and `constructor`
      if (key === "length" || key === "constructor") continue
      key = keys[i]
      result[key] = fn(object[key], key, object)
    }

    return result
  }

  // === Descriptor classes ===

  function ElementDescriptor(name, length) {
    this.name = name
    this.length = length
  }

  ElementDescriptor.finderFor = function ElementDescriptor_finderFor(name, filter, mapper) {
    return function filterMap() {
      var i, j, descriptor, result = Pico(this.length)

      for(i = 0, j = 0; i < this.length; ++i) {
        descriptor = getPropertyDescriptor(this[i], name)
        if (filter(descriptor)) {
          result[j] = mapper.apply(this[i], arguments)
          j += 1
        }
      }

      // Truncate result
      result.length = j
      return result
    }
  }

  ElementDescriptor.prototype = Object.create(null, {
    constructor: ElementDescriptor,
    enumerable: new Hidden(false),
    configurable: new Hidden(true),
    set: { get: function createSetter() {
      var name = this.name
      return defineFunction("Pico$"+name, 1, ElementDescriptor.finderFor(name,
        function setterFilter(descriptor) {
          return descriptor.writable || descriptor.set
        }, function setter(value) {
          return this[name] = value // Unified setter/value access
        })
      )
    }},
    get: { get: function createGetter() {
      if (isNaN(this.length)) {
        return this._createGetter()
      } else {
        return this._createMethod()
      }
    }},
    _createGetter: { value: function ElementDescriptor$_createGetter() {
      var name = this.name
      return defineFunction("Pico$"+name, 0, ElementDescriptor.finderFor(name,
        function getterFilter(descriptor) {
          return descriptor.get || "value" in descriptor
        }, function getter() {
          return this[name] // Unified getter/value access
        })
      )
    }},
    _createMethod: { value: function ElementDescriptor$_createMethod() {
      var name = this.name
      return Object.defineProperty(
        defineFunction("Pico$"+name, length, ElementDescriptor.finderFor(name,
          function methodFilter(descriptor) {
            return typeof descriptor.value === "function"
          }, function applyMethod() {
            return this[name].apply(this, arguments)
          })
        ), "valueOf", new ValueOf(this._createGetter())
      )
    }}
  })

  function Constant(value) {
    if (!(this instanceof Constant)) return new Hidden(value)
    this.value = value
  }

  Constant.prototype = Object.assign(Object.create(null), {
    constructor: Constant,
    writable: false,
    enumerable:  false,
    configurable: true
  })

  function Hidden(value) {
    if (!(this instanceof Hidden)) return new Hidden(value)
    this.value = value
  }

  Hidden.prototype = Object.assign(Object.create(null), {
    constructor: Hidden,
    writable: true,
    enumerable:  false,
    configurable: true
  })

  function ValueOf(getter) {
    var valueOf =  defineFunction("valueOf", 0, getter)
    this.get = function getValueOf() { return valueOf.bind(this) }
  }

  ValueOf.prototype = Object.create(null, toDescriptors({
    constructor: ValueOf,
    // writable: true, // since we use an accessor, this is illegal
    enumerable: false,
    configurable: true,
    get: null, // defined in the constructor
    set: function setValueOf(value) {
      Object.defineProperty(this, "valueOf", new Hidden(value))
      return this.valueOf
    }
  }))
})()
