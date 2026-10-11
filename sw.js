// Gut Instinct service worker — lets the app open offline.
//
// App files (same site): network-first, so whenever she's online she gets the
// newest version; the cache is only used when offline.
// Google Fonts: cache-first, so the typewriter font works offline too.
// Her logs live in localStorage, which this cache never touches.

const CACHE = "gut-instinct-v1";
const SHELL = ["./", "./index.html", "./icon.svg", "./apple-touch-icon.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);

  if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") {
    e.respondWith(
      caches.match(e.request).then(hit => hit || fetch(e.request).then(resp => {
        const copy = resp.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy));
        return resp;
      }))
    );
    return;
  }

  if (url.origin !== self.location.origin) return;

  e.respondWith(
    fetch(e.request, { cache: "no-cache" })
      .then(resp => {
        if (resp && resp.ok) {
          const copy = resp.clone();
          caches.open(CACHE).then(c => c.put(e.request, copy));
        }
        return resp;
      })
      .catch(() => caches.match(e.request).then(m => m || caches.match("./index.html")))
  );
});
