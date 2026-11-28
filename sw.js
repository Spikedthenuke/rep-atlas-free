const CACHE = "rep-atlas-v29";
const FILES = [
  "./", "./index.html", "./app.css?v=29", "./app.js?v=29", "./push.js/push.js",
  "./catalog.json", "./manifest.webmanifest", "./icon.svg", "./icon-180.png", "./icon-192.png", "./icon-512.png",
  "./muscle-map-reference.png", "./muscle-map-neutral.png",
  "./muscle-mask-abs-left.png", "./muscle-mask-abs-right.png",
  "./muscle-mask-adductors-left.png", "./muscle-mask-adductors-right.png",
  "./muscle-mask-biceps-left.png", "./muscle-mask-biceps-right.png",
  "./muscle-mask-calves-left.png", "./muscle-mask-calves-right.png",
  "./muscle-mask-chest-left.png", "./muscle-mask-chest-right.png",
  "./muscle-mask-forearms-left.png", "./muscle-mask-forearms-right.png",
  "./muscle-mask-glutes-left.png", "./muscle-mask-glutes-right.png",
  "./muscle-mask-hamstrings-left.png", "./muscle-mask-hamstrings-right.png",
  "./muscle-mask-lats-left.png", "./muscle-mask-lats-right.png",
  "./muscle-mask-lower-back-left.png", "./muscle-mask-lower-back-right.png",
  "./muscle-mask-obliques-left.png", "./muscle-mask-obliques-right.png",
  "./muscle-mask-quads-left.png", "./muscle-mask-quads-right.png",
  "./muscle-mask-serratus-left.png", "./muscle-mask-serratus-right.png",
  "./muscle-mask-shoulders-left.png", "./muscle-mask-shoulders-right.png",
  "./muscle-mask-traps-left.png", "./muscle-mask-traps-right.png",
  "./muscle-mask-triceps-left.png", "./muscle-mask-triceps-right.png",
  "./muscle-mask-upper-back-left.png", "./muscle-mask-upper-back-right.png"
];
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
