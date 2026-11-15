/* مدينتي بعيوني — offline cache.
 * The whole game ships as one HTML file, so caching it (plus the Google Fonts it uses)
 * lets the game re-open without a connection. Navigation is network-first, so a new
 * version is picked up whenever the player is online. */
const CACHE = 'madinah-offline-v1'

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(['./']).catch(() => {})))
  self.skipWaiting()
})

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== CACHE) await caches.delete(k)
    await self.clients.claim()
  })())
})

self.addEventListener('fetch', (e) => {
  const req = e.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  // Only the game page itself and its web fonts are handled; every other request
  // (including anything the hosting page loads) goes straight to the network.
  if (req.mode === 'navigate' && url.origin === self.location.origin) {
    e.respondWith((async () => {
      try {
        const res = await fetch(req)
        if (res && res.ok) (await caches.open(CACHE)).put('./', res.clone())
        return res
      } catch {
        return (await caches.match('./')) || Response.error()
      }
    })())
    return
  }
  if (/(^|\.)fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)) {
    e.respondWith((async () => {
      const c = await caches.open(CACHE)
      const hit = await c.match(req)
      const net = fetch(req).then((res) => { if (res && (res.ok || res.type === 'opaque')) c.put(req, res.clone()); return res }).catch(() => null)
      return hit || (await net) || Response.error()
    })())
  }
})
