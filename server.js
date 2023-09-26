/* eslint-env node, es6 */
/* eslint no-console: off */
const fs = require("fs"),
      http = require("http"),
      url = require("url")

process.on("SIGINT", () => {
  console.log("\nExiting...")
  process.exit(0)
})

http.createServer(function server(req, res) {
  let length,
      type = "application/json",
      body = JSON.stringify({error: "Not found"}),
      status = 404,
      start = process.hrtime(),
      pathname = url.parse(req.url).pathname

  pathname = ""
  if (pathname === "/") {
    type = "text/html"
    body = fs.readFileSync("./index.html").toString("utf-8")
  } else if (pathname.endsWith(".js")) {
    try {
      body  = fs.readFileSync(`.${pathname}`).toString("utf-8")
    } catch (error) {
      if (error?.code !== "ENOENT") {
        status = 500
        body = JSON.stringify(error)
      }
    }
  }

  length = Buffer.byteLength(body)
  res.writeHead(status, {
    "Content-Length": length,
    "Content-Type": `${type}; charset=utf-8`
  })
  res.end(body, function done() {
    // eslint-disable-next-line no-unused-vars
    let duration, [_seconds, nanoseconds] = process.hrtime(start)

    if (nanoseconds < 1e6) {
      duration = formatDuration(nanoseconds, 1e2, " µ")
    } else {
      duration = formatDuration(nanoseconds, 1e5, "ms")
    }

    let statusColor,
        size = `\u001b[2m${length}\u001b[0m b`

    if (status >= 500) {
      statusColor = 31
    } else if (status >= 400) {
      statusColor = 33
    } else {
      statusColor = 32
    }

    console.log(
      `\u001b[90m${req.method}\u001b[0m`,
      `\u001b[${statusColor}m${status}\u001b[0m`,
      `\u001b[36m${req.url}\u001b[0m`.padEnd(37),
      size.padStart(14),
      duration.padStart(16)
    )
  })
}).listen(8080, function started() {
  console.log(`Listening on http://localhost:8080/ after ${
    formatDuration(process.uptime(), 1e-3, " s")
  }`)
})

function formatDuration(nanoseconds, magnitude, suffix) {
  return `\u001b[2m${Math.round(nanoseconds/magnitude)/10}\u001b[0m ${suffix}`
}
