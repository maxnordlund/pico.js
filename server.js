const fs   = require("fs"),
      http = require("http"),
      url  = require("url")

const index = fs.readFileSync("./index.html"),
      pico  = fs.readFileSync("./pico.js"),
      SPACE = " ".repeat(100),
      LENGTH_OF_STARTUP_MESSAGE = 48

process.on("SIGINT", () => {
  console.log("\nExiting...")
  process.exit(0)
})

http.createServer(function server(req, res) {
  let body, type, start = process.hrtime()

  if (url.parse(req.url).pathname === "/pico.js") {
    [body, type] = [pico, "appliation/javascript"]
  } else {
    [body, type] = [index, "text/html"]
  }

  res.writeHead(200, {
    "Content-Length": Buffer.byteLength(body),
    "Content-Type": type
  })
  res.end(body, function done() {
    let duration, [seconds, nanoseconds] = process.hrtime(start)

    if (nanoseconds < 1e6) {
      duration = formatDuration(nanoseconds, 1e2, " µ", req.url.length)
    } else {
      duration = formatDuration(nanoseconds, 1e5, "ms", req.url.length)
    }

    console.log(
      `\u001b[90m${req.method}\u001b[0m`,
      `\u001b[36m${req.url}\u001b[0m`,
      duration
    )
  })
}).listen(8080, function started() {
  console.log(`Listening on http://localhost:8080/ started in: ${
    formatDuration(process.uptime(), 1e-3, " s", 0).trim()
  }`)
})

function formatDuration(nanoseconds, magnitude, suffix, urlLength) {
  let duration = `${Math.round(nanoseconds/magnitude)/10}`,
    padding = SPACE.slice(
      0, LENGTH_OF_STARTUP_MESSAGE - urlLength - duration.length
    )

  return `${padding}\u001b[2m${duration}\u001b[0m ${suffix}`
}
