const SHELL = "dms-shell-2026-10-04h"
const SNAPSHOT = "dms-snapshot-2026-09-30"

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting())
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== SHELL && key !== SNAPSHOT).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  )
})

self.addEventListener("fetch", (event) => {
  const request = event.request
  if (request.method !== "GET") return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return
  if (request.mode === "navigate") {
    event.respondWith(navigate(request))
    return
  }
  if (url.pathname.startsWith("/snapshot/")) {
    event.respondWith(cacheFirst(SNAPSHOT, request))
    return
  }
  if (url.pathname.startsWith("/assets/")) {
    event.respondWith(cacheThenNetwork(SHELL, request))
    return
  }
  event.respondWith(networkThenCache(SHELL, request))
})

async function navigate(request) {
  const cache = await caches.open(SHELL)
  try {
    const response = await fetch(request)
    if (response.ok) await cache.put(request, response.clone())
    return response
  } catch {
    return (await cache.match(request)) || (await cache.match("/index.html")) || (await cache.match("/"))
  }
}

async function cacheFirst(name, request) {
  const cache = await caches.open(name)
  const cached = await cache.match(request)
  if (cached) return cached
  return networkThenCache(name, request)
}

async function networkThenCache(name, request) {
  const cache = await caches.open(name)
  try {
    const response = await fetch(request)
    if (response.ok) {
      await cache.put(request, response.clone())
      return response
    }
  } catch {
    // The network is down. A saved copy is enough.
  }
  const cached = await cache.match(request)
  if (cached) return cached
  return new Response("missing", { status: 404 })
}

async function cacheThenNetwork(name, request) {
  const cache = await caches.open(name)
  const cached = await cache.match(request)
  if (cached) return cached
  const response = await fetch(request)
  if (response.ok) await cache.put(request, response.clone())
  return response
}
