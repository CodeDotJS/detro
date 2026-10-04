const SHELL = "dms-shell-2026-10-04h"
const SNAPSHOT = "dms-snapshot-2026-09-30"

self.addEventListener("install", (event) => {
  event.waitUntil(precacheApp().then(() => self.skipWaiting()))
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

async function precacheApp() {
  const list = await precacheList()
  if (!list) return
  await addAll(SNAPSHOT, list.snapshot)
  await addAll(SHELL, list.shell)
}

async function precacheList() {
  const response = await fetch("/precache.json")
  if (!response.ok) return null
  const list = await response.json()
  return {
    shell: Array.isArray(list.shell) ? list.shell : [],
    snapshot: Array.isArray(list.snapshot) ? list.snapshot : [],
  }
}

async function addAll(name, urls) {
  const cache = await caches.open(name)
  for (let index = 0; index < urls.length; index += 24) {
    const batch = urls.slice(index, index + 24)
    await Promise.all(
      batch.map(async (url) => {
        try {
          const response = await fetch(url)
          if (response.ok) await cache.put(url, response)
        } catch {
          // One missing file does not block the rest of the shell.
        }
      }),
    )
  }
}

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
