import { _safeGet } from "./internal/functions.js"

/**
 * @param {string | Iterable<any> | ArrayLike<any> | null} input
 */
export function $(input) {
  let context = (this instanceof Element) ? this : document

  if (typeof input == "string") {
    return Pico.from(context.querySelectorAll(input))
  } else if (typeof Object(input)[Symbol.iterator] == "function") {
    return Pico.from(input)
  } else if (input == null) {
    return new Pico()
  } else {
    return new Pico(input)
  }
}

export default class Pico extends Array {
  get [Symbol.toStringTag]() {
    return "Pico"
  }

  // eslint-disable-next-line no-unused-vars
  async retrieve(method="GET", input, init={}) {
    throw new NotImplementedError("retrieve")
  }

  // eslint-disable-next-line no-unused-vars, require-yield
  async* listen(type, options) {
    throw new NotImplementedError("listen")
  }

  /**
   * Adds the provided event listener to each element in this Pico array.
   *
   * This is a safe shorthand for calling addEventListener on each element.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener
   */
  on(type, options, listener) {
    if (typeof options == "function") {
      [listener, options] = [options, listener]
    }

    for (let item of this) {
      if (typeof item.addEventListener == "function") {
        item.addEventListener(type, listener, options)
      }
    }
  }

  /**
   * Removes the provided event listener from each element in this Pico array.
   *
   * This is a safe shorthand for calling removeEventListener on each element.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/removeEventListener
   */
  off(type, options, listener) {
    if (typeof options == "function") {
      [listener, options] = [options, listener]
    }

    for (let item of this) {
      if (typeof item.removeEventListener == "function") {
        item.removeEventListener(type, listener, options)
      }
    }
  }

  get once() {
    let method, onceSupported = false

    try {
      let options = {
        get once() {
          onceSupported = true
        }
      }

      window.addEventListener("test", options, options)
      window.removeEventListener("test", options, options)
    } catch(_error) {
      onceSupported = false
    }

    if (onceSupported) {
      method = function once(type, options, listener) {
        switch (typeof options) {
          case "boolean": {
            options = { capture: options }
            break
          }
          case "function": {
            [listener, options] = [options, listener]
            break
          }
        }
        options.once = true
        this.on(type, listener, options)
      }
    } else {
      method = function once(type, options, listener) {
        if (typeof options == "function") {
          [listener, options] = [options, listener]
        }

        let self = this

        this.on(type, function callback() {
          self.off(type, callback, options)
          return listener.apply(this, arguments)
        }, options)
      }
    }

    Object.defineProperty(Pico.prototype, "once", {
      value: method,
      writable: true,
      enumerable: false,
      configurable: true
    })

    return method
  }

  get html() {
    let fragment = document.createDocumentFragment()
    fragment.append(...this)
    return fragment
  }

  clone(deep=true) {
    return this.map((item) => {
      if (typeof item.cloneNode == "function") {
        return item.cloneNode(deep)
      } else {
        return item
      }
    })
  }

  get(key) {
    return this.map((item) => {
      if(typeof item.has == "function" && typeof item.get == "function") {
        // It looks like a collection ,i.e. Map/Set, let's use it as such.
        // We don't fall through to the `key in item` as that would lead to
        // weird behavior.

        // If you're proactive and use Map then you shouldn't get bitten by the
        // `key` being a property of said Map. Typically `has`/`get`/... would
        // give you trouble.

        if (item.has(key)) {
          return item.get(key)
        }
      } else {
        // ...but if you do just have some vanilla objects it's convenient to
        // be able to access their properties like this.
        return _safeGet(item, key)
      }
    })
  }

  set(key, value) {
    for (let item of this) {
      if (item == null) {
        continue
      } else if(item.set == "function") {
        // See the comments above in `get` for why this done like this.
        item.set(key, value)
      } else {
        item[key] = value
      }
    }
  }

  // eslint-disable-next-line no-unused-vars
  filterBy(key="", operator="", value) {
    throw new NotImplementedError("filterBy")
  }

  sortBy(key="") {
    return this.sort((a, b) => {
      let aValue = _safeGet(a, key),
          bValue = _safeGet(b, key)

      if (aValue < bValue) {
        return -1
      } else if (aValue === bValue) {
        return 0
      } else {
        return 1
      }
    })
  }

  sortNumericallyBy(key="") {
    return this.sort((a, b) => _safeGet(a, key) - _safeGet(b, key))
  }

  /**
   * Same as the builtin version, except that the parameter order is reversed.
   *
   * This makes it more ergonomic to use when you want to provide an initial
   * value. Compare:
   *
   * ```
   * $('input[type="number"]').reduce(0, (memo, input) => memo + input.value)
   * ```
   *
   * with:
   *
   * ```
   * $('input[type="number"]').reduce(((memo, input) => memo + input.value), 0)
   * ```
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/Reduce
   */
  reduce(initialValue, callback) {
    if (arguments.length > 1) {
      return super.reduce(callback, initialValue)
    } else {
      return super.reduce(initialValue)
    }
  }

  /**
   * Same as the builtin version, except that the parameter order is reversed.
   *
   * This makes it more ergonomic to use when you want to provide an initial
   * value. Compare:
   *
   * ```
   * $('input[type="number"]').reduceRight(0, (memo, input) => memo + input.value)
   * ```
   *
   * with:
   *
   * ```
   * $('input[type="number"]').reduceRight(((memo, input) => memo + input.value), 0)
   * ```
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/ReduceRight
   */
  reduceRight(initialValue, callback) {
    if (arguments.length > 1) {
      return super.reduceRight(callback, initialValue)
    } else {
      return super.reduceRight(initialValue)
    }
  }

  then(_success, _failure) {
    // Pass `arguments` directly in case the user is using a different Promise
    // implementation that uses extra params, i.e. progress handler.
    return Promise.all(this).then(...arguments)
  }

  toString() {
    return this.join("\n")
  }
}

export class NotImplementedError extends Error {
  constructor(method) {
    super(`Method ${method} is not defined, perhaps you forgot to import "pico/features/${method}"?`)

    this.method = method

    if (typeof Error.captureStackTrace == "function") {
      Error.captureStackTrace(this, this.constructor)
    }
  }
}
