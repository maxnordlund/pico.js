import { definePicoMethod } from "../internal/functions.js"

definePicoMethod(function listen(type, options) {
  return new LazyList(_eventToAsyncGenerator(this, type, options))
})

export async function* _eventToAsyncGenerator(pico, type, options) {
  let events = [],
      semaphore = new Lock()

  function callback(event) {
    events.push(event)
    semaphore.unlock()
  }
  pico.on(type, options, callback)

  if (typeof options.end == "string") {
    pico.once(options.end, (event) => {
      pico.off(type, options, callback)
      callback(event)
    })
  }

  while (true) {
    await semaphore.lock()

    while (events.length) {
      yield events.shift()
    }
  }
}

export class Lock {
  constructor() {
    this.lock()
  }

  lock() {
    let promise = new Promise((resolve, _reject) => {
      this.unlock = resolve
    })
    this.then = promise.then.bind(promise)

    return this
  }

  unlock() {}

  then() {}
}

export default class LazyList {
  constructor(source) {
    this.source = source
  }

  filter(fn) {
    return new FilterList(this, fn)
  }

  map(fn) {
    return new MapList(this, fn)
  }

  reduce(memo, fn) {
    for (let item of this) {
      memo = fn(memo, item)
    }
    return memo
  }

  zip(...iterables) {
    iterables.unshift(this)
    return new ZipList(iterables)
  }

  *[Symbol.iterator]() {
    yield* this.source[Symbol.iterator]()
  }

  async* [Symbol.asyncIterator]() {
    let asyncIterator = this.source[Symbol.asyncIterator]

    if (typeof asyncIterator == "function") {
      yield* asyncIterator.call(this)
    } else {
      yield* this[Symbol.iterator]()
    }
  }
}

class FilterList extends LazyList {
  constructor(source, fn) {
    super(source)
    this.fn = fn
  }

  *[Symbol.iterator]() {
    for (let item of this.source) {
      if (this.fn(item)) {
        yield item
      }
    }
  }

  async* [Symbol.asyncIterator]() {
    for await (let item of this.source) {
      if (await this.fn(item)) {
        yield item
      }
    }
  }
}

class MapList extends LazyList {
  constructor(source, fn) {
    super(source)
    this.fn = fn
  }

  *[Symbol.iterator]() {
    for (let item of this.source) {
      yield this.fn(item)
    }
  }

  async* [Symbol.asyncIterator]() {
    for await (let item of this.source) {
      yield await this.fn(item)
    }
  }
}

class ZipList extends LazyList {
  constructor(sources) {
    super()
    this.sources = sources
  }

  *[Symbol.iterator]() {
    let iterators = this.sources.map((src) => src[Symbol.iterator]())

    for (let allDone = false; !allDone; allDone = true) {
      let tuple = []

      for (let iterator of iterators) {
        let { value, done } = iterator.next()
        tuple.push(value)
        allDone = allDone && done
      }

      yield tuple
    }
  }

  async* [Symbol.asyncIterator]() {
    let iterators = this.sources.map((src) => src[Symbol.asyncIterator]())

    for (let allDone = false; !allDone; allDone = true) {
      let tuple = [],
          next = await Promise.all(iterators.map((iterator) => iterator.next()))

      for (let { value, done } of next) {
        tuple.push(value)
        allDone = allDone && done
      }

      yield tuple
    }
  }
}
