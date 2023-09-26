import * as builtin from "../internal/builtin.js"
import { definePicoMethod } from "../internal/functions.js"

/**
 * Retrieves the provided URL using the provided HTTP method and options.
 *
 * This acts as a wrapper around the builtin `fetch`. Like it, this defaults to
 * preform a `GET` request. Unlike the builtin `fetch` however, this throws an
 * `HTTPError` for non-2XX status codes as determined by the `ok` property of a
 * `fetch` response.
 *
 * In addition, it adds a couple of conveniences, such as providing a
 * FormData or HTMLFormElement automatically uses them as the request body.
 * If you provide a builtin `Array` or `Object` it automatically calls
 * `JSON.stringify`. By default it includes CORS credentials and sets the
 * `Content-Type` to `application/json`.
 *
 * @param {string} [method=GET] HTTP method used for the request.
 * @param {string} input URL to fetch, same meaning and restrictions as the
 *                       corresponding parameter to the builtin `fetch`.
 * @param {Object} [init] optional options used for the request, same meaning
 *                        and restrictions as the corresponding parameter to
 *                        the builtin `fetch`.
 *
 * @return {Promise<Response>}
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API
 * @see https://developer.mozilla.org/en-US/docs/Web/API/FormData
 */
// eslint-disable-next-line no-unused-vars
export async function retrieve(method="GET", input, init={}) {
  [method, input, init] = _normalizeRetrieveParameterOrder(...arguments)
  init = _assignDefaultFetchOptions(method, init)

  return _performFetch(input, init)
}

/**
 * Represents a successful response with a 4XX or 5XX status code.
 */
export class HTTPError extends Error {
  constructor(response, message=response.statusText) {
    super(message)

    this.response = response
    this.status = response.status
  }
}

/**
 * @typedef {RequestInit} RetrieveInit
 * @property {boolean} [rawBody] perform no content negotiation on the response
 */

/**
 * Calls `fetch` and performs content negotiation. Uses the same parameters as
 * the global `fetch`.
 *
 * Passing `rawBody: true` in the `init` no content negotiation is performed.
 * This then becomes equivalent to calling `fetch` directly.
 *
 * Throws an `HTTPError` if the response has an non-2XX status.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API
 *
 * @param {string} [method] HTTP method
 * @param {string | URL} input URL to the resource to fetch.
 * @param {RetrieveInit} [init] Extra options for the request.
 *
 * @return {Promise<Response>}
 */
definePicoMethod(async function retrieve(method="GET", input, init={}) {
  switch (arguments.length) {
    case 0: // $("form").retrieve()
    case 1: // $("form").retrieve({})
      return _retrieveExtractedFormData(
        // Ignore input as we always get the URL from the forms action property
        undefined, init, _extractFormData(this.filterByInstance(HTMLFormElement))
      )
    default:
      [method, input, init] = _normalizeRetrieveParameterOrder(...arguments)
      init = _assignDefaultFetchOptions(method, init)
  }

  // If a body is present this is already a complete request ready to go.
  if (init.body) {
    return new this.constructor[Symbol.species](_performFetch(input, init))
  } else {
    let result = _retrieveExtractedFormData(input, init, _extractFormData(this))

    if (result.length == 0) {
      // We couldn't find anything to attach, just fire the request as-is.
      result.push(_performFetch(input, init))
    }
    return result
  }
})

/**
 * @param {string | URL | HTMLFormElement} [method]
 * @param {string | URL} input
 * @param {RetrieveInit} [init]
 * @returns [string, string, RetrieveInit]
 */
export function _normalizeRetrieveParameterOrder(method="GET", input, init={}) {
  switch (arguments.length) {
    case 0:
      throw new TypeError("missing parameter input")
    case 1:
      if (typeof method == "string") {
        // retrieve("/foo")
        [method, input] = ["GET", method]
      } else if (method instanceof HTMLFormElement) {
        // retrieve(form)
        [method, input, init] = [method.method, method.action, method]
      } else {
        throw new TypeError("input is not a string or form element")
      }
      break
    case 2:
      if (typeof input == "string") {
        // retrieve("DELETE", "/foo")
      } else {
        // retrieve("/foo", {})
        [method, input, init] = ["GET", method, input]
      }
      break
    case 3:
      // retrieve("POST", "/foo", {})
      break
    default:
      // eslint-disable-next-line no-console
      console.warn("Too many arguments provided to retrieve:", ...arguments)
  }
  return [method, input, init]
}

/**
 * @param {string} method
 * @param {HTMLFormElement | RetrieveInit} init
 */
export function _assignDefaultFetchOptions(method, init) {
  if (init instanceof FormData) {
    // We're posting a regular form, just wrap it for `fetch`
    init = { body: init }
  } else if (init instanceof HTMLFormElement) {
    // Like above, wrap the form for `fetch`
    init = { body: new FormData(init) }
  } else if (init.body instanceof HTMLFormElement) {
    // Also allow using forms directly as body
    init.body = new FormData(init.body)
  }

  if (method.toUpperCase() != "GET") {
    if (init.method) {
      throw new TypeError(`Two method supplied, ${method} directly and ${init.method} in init`)
    } else {
      init.method = method
    }
  }

  init = Object.assign({
    credentials: "include",
    rawBody: false
  }, init)

  init.headers = Object.assign({
    "Accept": "application/json",
  }, init.headers)

  // Check if body is an object or array literal, i.e. {} or []
  let body = init.body,
      bodyPrototype = body && Object.getPrototypeOf(body),
      bodyConstructor = bodyPrototype && bodyPrototype.constructor

  if (body && (
    // Object.create(null)
    bodyPrototype === null ||
    // Object literal
    bodyConstructor === Object ||
    // Array literal, unlike Array.isArray this does not allow subclasses like
    // Pico. Using one of those is probably a mistake, and can easily be fixed
    // by an explicit cast using Array.from
    bodyConstructor === Array
  )) {
    // We're sending JSON over the wire
    init.headers["Content-Type"] = "application/json"
    init.body = JSON.stringify(init.body)
  }

  return init
}

/**
 * @param {string | URL} input URL to the resource to fetch.
 * @param {RetrieveInit} init Extra options for the request.
 *
 * @return {Promise<Response>}
 */
export async function _performFetch(input, init) {
  let response

  if (init.rawBody) {
    response = await builtin.fetch(input, init)
  } else {
    let contentType, body

    response = await builtin.fetch(input, init),
    contentType = response.headers.get("content-type")

    if (contentType.includes("json")) {
      body = await response.json()
    } else if (contentType.includes("text")) {
      body = await response.text()
    } else {
      body = await response.blob()
    }

    // Overwrite `body` as it's a closed stream. But take care to match it's
    // properties.
    Object.defineProperty(response, "body", {
      value: body,
      writable: false,
      enumerable: true,
      configurable: true
    })
  }

  if (response.ok) {
    return response
  } else {
    // Throw an error for 4XX and 5XX instead of happily return like the
    // builtin `fetch`.
    throw new HTTPError(response)
  }
}

export function _extractFormData(array) {
  let formData = new FormData(),
      hasExtraData = false,
      result = new Object.getPrototypeOf(array).constructor[Symbol.species]()

  for (let item of array) {
    if (item instanceof HTMLFormElement) {
      result.push([item.action, {
        body: item,
        method: item.method
      }])
    } else if (item instanceof HTMLInputElement && item.name) {
      hasExtraData = true
      if (item.type == "file") {
        let files = item.files,
            length = files.length

        for (let i = 0; i < length; ++i) {
          formData.append(item.name, files[i])
        }
      } else {
        formData.append(item.name, item.value)
      }
    } else if (item instanceof HTMLSelectElement && item.name) {
      hasExtraData = true
      for (let option of item.selectedOptions) {
        formData.append(item.name, option.value)
      }
    } else if (item instanceof HTMLTextAreaElement && item.name) {
      hasExtraData = true
      formData.append(item.name, item.value)
    }
  }

  if (hasExtraData) {
    result.push([undefined, { body: formData }])
  }

  return result
}

export function _retrieveExtractedFormData(input, init, mappable) {
  return mappable.map((params) => {
    return retrieve(params[0] || input, Object.assign({}, init, params[1]))
  })

}
