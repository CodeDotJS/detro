import fs from "node:fs"
import path from "node:path"
import react from "@vitejs/plugin-react"
import type { Connect, Plugin } from "vite"
import { defineConfig } from "vitest/config"
import { classifyPrecache } from "./src/lib/offline/precache.ts"

function serveSnapshot(): Plugin {
  const root = path.resolve("data")
  const handler: Connect.NextHandleFunction = (req, res) => {
    const raw = decodeURIComponent((req.url ?? "/").split("?")[0])
    const pathname = raw.startsWith("/snapshot/") ? raw.slice("/snapshot".length) : raw
    const file = path.resolve(root, `.${pathname}`)
    if (!file.startsWith(`${root}${path.sep}`) || !file.endsWith(".json") || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
      res.statusCode = 404
      res.end()
      return
    }
    res.setHeader("Content-Type", "application/json; charset=utf-8")
    fs.createReadStream(file).pipe(res)
  }
  return {
    name: "serve-snapshot",
    configureServer(server) {
      server.middlewares.use("/snapshot", handler)
    },
    configurePreviewServer(server) {
      server.middlewares.use("/snapshot", handler)
    },
  }
}

function shipOfflineSnapshot(): Plugin {
  return {
    name: "ship-offline-snapshot",
    apply: "build",
    closeBundle() {
      const dist = path.resolve("dist")
      copyJson(path.resolve("data/en/station_brief"), path.join(dist, "snapshot/en/station_brief"))
      copyJson(path.resolve("data/en/journeys"), path.join(dist, "snapshot/en/journeys"))
      const urls: string[] = []
      walkFiles(dist, (file) => {
        const rel = path.relative(dist, file).split(path.sep).join("/")
        if (!rel || rel.endsWith(".DS_Store")) return
        urls.push(`/${rel}`)
      })
      fs.writeFileSync(path.join(dist, "precache.json"), JSON.stringify(classifyPrecache(urls)))
    },
  }
}

function copyJson(from: string, to: string) {
  if (!fs.existsSync(from)) return
  fs.mkdirSync(to, { recursive: true })
  for (const name of fs.readdirSync(from)) {
    if (!name.endsWith(".json")) continue
    fs.copyFileSync(path.join(from, name), path.join(to, name))
  }
}

function walkFiles(dir: string, visit: (file: string) => void) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) walkFiles(full, visit)
    else if (entry.isFile()) visit(full)
  }
}

export default defineConfig({
  plugins: [react(), serveSnapshot(), shipOfflineSnapshot()],
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
  },
})
