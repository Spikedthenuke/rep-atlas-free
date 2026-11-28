const CACHE = "rep-atlas-v24";
const FILES = ["./", "./index.html", "./app.css?v=24", "./app.js?v=24", "./push.js/push.js", "./catalog.json", "./manifest.webmanifest", "./icon.svg", "./icon-180.png", "./icon-192.png", "./icon-512.png", "./muscle-map-reference.png"];
self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(FILES)));
  self.skipWaiting();
});
self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)))));
  self.clients.claim();
});
self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request).then(response => {
    if (response.ok && new URL(event.request.url).origin === self.location.origin) {
      const copy = response.clone();
      caches.open(CACHE).then(cache => cache.put(event.request, copy));
    }
    return response;
  })));
});
self.addEventListener("push", event => {
  let payload = {};
  try { payload = event.data ? event.data.json() : {}; } catch {}
  const title = payload.title || "Rep Atlas workout reminder";
  const target = new URL(payload.url || "./", self.location.origin);
  if (target.origin !== self.location.origin) target.href = self.location.origin + "/rep-atlas-free/";
  event.waitUntil(self.registration.showNotification(title, {
    body: payload.body || "Your scheduled workout is ready.",
    icon: "./icon-192.png",
    badge: "./icon-192.png",
    tag: "rep-atlas-workout",
    data: {url: target.href}
  }));
});
self.addEventListener("notificationclick", event => {
  event.notification.close();
  const target = new URL(event.notification.data && event.notification.data.url || "./", self.location.origin);
  if (target.origin !== self.location.origin) target.href = self.location.origin + "/rep-atlas-free/";
  event.waitUntil(self.clients.matchAll({type:"window",includeUncontrolled:true}).then(windows => {
    const existing = windows.find(client => new URL(client.url).origin === self.location.origin);
    if (existing) { existing.focus(); return; }
    return self.clients.openWindow(target.href);
  }));
});
