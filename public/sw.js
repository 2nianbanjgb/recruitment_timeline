const CACHE_NAME = 'recruitment-timeline-v1'
const PRECACHE = ['/', '/index.html', '/manifest.webmanifest', '/icon-192.png', '/icon-512.png']

self.addEventListener('install', event => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', event => {
  event.waitUntil(
    caches
      .keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', event => {
  const request = event.request
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  // 页面导航：网络优先，离线时回落到缓存的 index.html。
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          const copy = response.clone()
          caches.open(CACHE_NAME).then(cache => cache.put('/index.html', copy))
          return response
        })
        .catch(() => caches.match('/index.html').then(hit => hit || caches.match('/'))),
    )
    return
  }

  // 构建产物带 hash，可以放心缓存优先。
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.match(request).then(hit => {
        if (hit) return hit
        return fetch(request).then(response => {
          if (response.ok) {
            const copy = response.clone()
            caches.open(CACHE_NAME).then(cache => cache.put(request, copy))
          }
          return response
        })
      }),
    )
    return
  }

  event.respondWith(caches.match(request).then(hit => hit || fetch(request)))
})

self.addEventListener('notificationclick', event => {
  event.notification.close()
  const eventId = event.notification.data && event.notification.data.eventId
  const target = eventId ? `/index.html#/events?focus=${eventId}` : '/index.html'

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      const existing = clientList.find(client => 'focus' in client)
      if (existing) {
        const opened = existing.focus()
        if (eventId) existing.postMessage({ type: 'open-event', id: eventId })
        return opened
      }
      return self.clients.openWindow(target)
    }),
  )
})
