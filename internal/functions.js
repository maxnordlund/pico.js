import Pico from "../pico.js"

export function definePicoMethod(method) {
  let descriptor = Object.getOwnPropertyDescriptor(Pico.prototype, method.name)

  if (descriptor == undefined) {
    throw new TypeError(`Missing stub method for ${method.name}`)
  } else {
    descriptor.value = method
    Object.defineProperty(Pico.prototype, method.name, descriptor)
  }
}

/**
 * @param {object} object
 * @param {string} path
 */
export function _safeGet(object, path) {
  if (path == "") return object

  for (let key of path.split(".")) {
    if (object == null) {
      break
    } else {
      object = object[key]
    }
  }

  return object
}
