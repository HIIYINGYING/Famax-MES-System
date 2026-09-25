const CACHE = "famax-mes-v1";
self.addEventListener("install", event => { event.waitUntil(caches.open(CACHE)); self.skipWaiting(); });
self.addEventListener("activate", event => { event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key))))); self.clients.claim(); });
self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET" || new URL(request.url).origin !== self.location.origin || request.url.includes("/api/")) return;
  event.respondWith(fetch(request).then(response => { if (response.ok) { const copy = response.clone(); caches.open(CACHE).then(cache => cache.put(request, copy)); } return response; }).catch(() => caches.match(request).then(response => response ?? caches.match("/dashboard"))));
});
