const CACHE = 'clavis-v1'

const PRECACHE = [
  '/dashboard',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/logo.svg',
]

// Install: pre-cache the app shell
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(PRECACHE))
  )
  self.skipWaiting()
})

// Activate: drop old caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  )
  self.clients.claim()
})

// Fetch: cache-first for static assets, network-first for everything else
self.addEventListener('fetch', e => {
  const { request } = e
  const url = new URL(request.url)

  // Don't touch non-GET, Supabase calls, or Next.js internal routes
  if (request.method !== 'GET') return
  if (url.hostname !== self.location.hostname) return
  if (url.pathname.startsWith('/_next/')) return

  e.respondWith(
    caches.match(request).then(cached => {
      const fresh = fetch(request).then(res => {
        if (res.ok) {
          caches.open(CACHE).then(c => c.put(request, res.clone()))
        }
        return res
      }).catch(() => cached)
      // Return cache immediately if available, update in background
      return cached || fresh
    })
  )
})
