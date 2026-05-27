const CACHE = 'qingli-v2'

const PRECACHE = [
  '/',
  '/css/design-system.css',
  '/css/calendar.css',
  '/css/responsive.css',
  '/js/holiday-service.js',
  '/js/calendar.js',
  '/js/events.js',
  '/js/app.js',
  '/public/manifest.json',
  '/public/logo.svg',
  '/public/offline.html',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE))
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)

  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request).catch(() => caches.match('/public/offline.html'))
    )
    return
  }

  if (url.pathname === '/public/offline.html') {
    event.respondWith(caches.match(event.request))
    return
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const fetchPromise = fetch(event.request)
        .then((response) => {
          if (response && response.status === 200 && response.type === 'basic') {
            const clone = response.clone()
            caches.open(CACHE).then((cache) => cache.put(event.request, clone))
          }
          return response
        })
        .catch(() => cached)

      return cached || fetchPromise
    })
  )
})