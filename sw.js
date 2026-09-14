const CACHE_NAME = "cet6-90day-v0.5.8";
const APP_SHELL = [
  "./",
  "./index.html",
  "./styles.css?v=0.5.8",
  "./manifest.webmanifest",
  "./icon.svg",
  "./src/app.js?v=0.5.8",
  "./src/content.js?v=0.5.8",
  "./src/practice-bank.js?v=0.5.8",
  "./src/mock-exams.js?v=0.5.8",
  "./src/ear-training.js?v=0.5.8",
  "./src/lessons.js?v=0.5.8",
  "./src/resources.js?v=0.5.8",
  "./src/storage.js?v=0.5.8",
  "./src/accounts.js?v=0.5.8",
  "./src/cloud.js?v=0.5.8",
  "./src/cloud-config.js?v=0.5.8",
  "./src/vendor/supabase.js?v=0.5.8",
  "./src/db.js?v=0.5.8"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const requestUrl = new URL(event.request.url);
  if (requestUrl.origin !== self.location.origin) return;

  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put("./index.html", copy));
          return response;
        })
        .catch(() => caches.match("./index.html")),
    );
    return;
  }

  if (["script", "style", "worker"].includes(event.request.destination)) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(() => caches.match(event.request)),
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        }
        return response;
      });
    }),
  );
});
