# Pico
Tiny jQuery like library built using modern Web APIs.

## Dependencies
Array.from
Object.assign
Object.isPrototypeOf
Object.getPrototypeOf
Object.setPrototypeOf

## Caveats
Since Pico combines methods/accessors from all sub classes of Element, there
are a few conflicts. Most of the time it will just work, but when the confilict
is between a method and getter, the method wins. If you need to access the
getter you can add `.valueOf()` after the method, e.g. `foo.select.valueOf()`.
This bypasses the method and uses the getter instead. This is always safe to
call, as it returns `this` for most objects in JavaScript.
