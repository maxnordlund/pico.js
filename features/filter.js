import { definePicoMethod, _safeGet } from "../internal/functions.js"

definePicoMethod(function filterBy(conditionOrOperator, maybeOperatorOrValue, maybeValue) {
  let conditions = new Map()

  switch (arguments.length) {
    case 0:
      // filterBy()
      // Filter for truthiness on the element itself
      conditions.set("!!", [""])
      break
    case 1: {
      if (typeof conditionOrOperator == "string") {
        // filterBy("deep.property.path")
        conditions.set("!!", [conditionOrOperator])
      } else {
        // filterBy({ instanceof: HTMLFormElement, typeof: ["property", "string"] })
        conditions = new Map()

        for (let [key, value] of _objectIterator(conditionOrOperator)) {
          if (Array.isArray(value)) {
            conditions.set(key, value)
          } else {
            conditions.set(key, ["", value])
          }
        }
      }
      break
    }
    case 2: {
      // filterBy("==", 123)
      conditions.set(conditionOrOperator, ["", maybeValue])
      break
    }
    case 3: {
      // filterBy("some.property", "==", 123)
      // filterBy("some.property", "typeof", "number")
      conditions.set(maybeOperatorOrValue, [conditionOrOperator, maybeValue])
      break
    }
    default:
      // eslint-disable-next-line no-console
      console.warn("Too many arguments provided to filterBy:", ...arguments)
  }

  // Translate strings to operator functions
  for (let [key, [path, value]] of conditions) {
    conditions.set(OPERATORS.get(key), [path, value])
    conditions.delete(key)
  }

  return this.filter(_filterer, conditions)
})

export function _filterer(item, _index, _array) {
  for (let [operator, [path, value]] of this) {
    if (operator(_safeGet(item, path), value)) return true
  }
  return false
}

export function* _objectIterator(object) {
  for (let key in object) {
    if (object.hasOwnProperty(key)) {
      yield [key, object[key]]
    }
  }
}

export function _objectToMap(object) {
  let map = new Map()

  for (let key in object) {
    if (object.hasOwnProperty(key)) {
      map.set(key, object[key])
    }
  }

  return map
}

export function _safeCallFilter(thisArg, method, ...args) {
  if (typeof thisArg[method] == "function") {
    return thisArg[method](...args)
  } else {
    return false
  }
}

export const OPERATORS = new Map([
  // Builtin operators
  ["!", function falsey(subject, _expected) {
    return !subject
  }],
  ["!!", function truthy(subject, _expected) {
    return !!subject
  }],
  ["==", function equality(subject, expected) {
    return subject == expected
  }],
  ["===", function identity(subject, expected) {
    return subject === expected
  }],
  ["!=", function inequality(subject, expected) {
    return subject != expected
  }],
  ["!==", function nonIdentity(subject, expected) {
    return subject !== expected
  }],
  ["<", function lessThen(subject, expected) {
    return subject < expected
  }],
  ["<=", function lessThenOrEqual(subject, expected) {
    return subject <= expected
  }],
  [">", function greaterThen(subject, expected) {
    return subject > expected
  }],
  [">=", function greaterThenOrEqual(subject, expected) {
    return subject >= expected
  }],
  ["typeof", function typeOf(subject, expected) {
    return typeof subject == expected
  }],
  ["instanceof", function instanceOf(subject, expected) {
    return subject instanceof expected
  }],
  ["in", function hasProperty(subject, expected) {
    return subject in expected
  }],
  // Operators based on common methods
  ["has", function has(subject, expected) {
    return _safeCallFilter(subject, "has", expected)
  }],
  ["hasOwnProperty", function hasOwnProperty(subject, expected) {
    return _safeCallFilter(subject, "hasOwnProperty", expected)
  }],
  ["includes", function includes(subject, expected) {
    return _safeCallFilter(subject, "includes", expected)
  }],
  // Totally custom operators
  ["all", function all(subject, test) {
    for (let item of subject) {
      if (!test(item)) return false
    }
    return true
  }],
  ["any", function any(subject, test) {
    for (let item of subject) {
      if (test(item)) return true
    }
    return false
  }],
  ["matches", function matches(subject, selector) {
    return _safeCallFilter(subject, "matches", selector)
  }],
])
