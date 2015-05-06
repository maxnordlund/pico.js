(function pico() {
  window.$ = function $(input) {
    var context = (this instanceof Element) ? this: document

    // Normalize input to an array(-like) object
    if (input == null) input = []
    if (input instanceof Element) input = [input]
    if (typeof input === "string") input = context.querySelectorAll(input)

    // Ensure input is an actual native array object
    input = Array.from(input)

    // Use the actual native array object, but change its prototype to allow
    // extensions without touching Array.prototype
    Object.setPrototypeOf(input, Pico.prototype)
    return input
  }

  // Extended array class
  function Pico() {}
  Pico.prototype = Object.create(Array.prototype, {
    on: { value: function Pico$on(type, listner) {
      this.addEventListener(type, listner, false)
    }},
    off: { value: function Pico$off(type, listner) {
      this.removeEventListener(type, listner, false)
    }},
    once: { value: function Pico$once(type, listner) {
      var self = this
      this.on(function once() {
        self.off(type, once, false)
        return listner.apply(this, arguments)
      }, false)
    }}
  })

  // Find all element types and attach their methods on the Pico class
  Object.getOwnPropertyNames(window).filter(function isElement(name) {
    return /^(HTML|SVG).*Element$/.test(name) &&
      Element.prototype.isPrototypeOf(Object(window[name]).prototype)
  }).concat("Node", "Element", "EventTarget") // Manually add superclasses
  .forEach(function attachElementMethod(name) {
    var klass = window[name],
        proto = klass.prototype

    Object.getOwnPropertyNames(proto).forEach(function attach(property) {
      var descriptor = Object.getOwnPropertyDescriptor(proto, property)

      if (typeof descriptor.value === "function") {
        descriptor.value = wrapMethod(klass, "map", descriptor.value)
      }
      if (typeof descriptor.get === "function") {
        descriptor.get = wrapMethod(klass, "map", descriptor.get)
      }
      if (typeof descriptor.set === "function") {
        descriptor.set = wrapMethod(klass, "forEach", descriptor.set)
      }

      Object.defineProperty(Pico.prototype, property, descriptor)
    })
  })

  function wrapMethod(klass, transform, method) {
    return function wrapper() {
      var args = Array.from(arguments)
      return [].concat(this.filter(function instanceOfKlass(element) {
        return element instanceof klass
      })[transform](function applyMethod(element) {
        return method.apply(element, args)
      }))
    }
  }
})()

