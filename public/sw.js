const CACHE = 'qingli-v1'
const urlsToCache = [
  '/',
  '/css/design-system.css',
  '/css/calendar.css',
  '/css/responsive.css',
  '/js/calendar.js',
  '/js/events.js',
  '/js/app.js',
  '/public/manifest.json',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => {
      return cache.addAll(urlsToCache)
    })
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))
      )
    })
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  if (event.request.url.includes('/api/')) {
    return
  }
  event.respondWith(
    caches.match(event.request).then((cached) => {
      return cached || fetch(event.request).then((response) => {
        return caches.open(CACHE).then((cache) => {
          cache.put(event.request, response.clone())
          return response
        })
      })
    })
  )
})
