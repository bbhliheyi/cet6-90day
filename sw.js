const CACHE_NAME = "cet6-90day-v1.0.0";
const APP_SHELL = [
  "./",
  "./index.html",
  "./styles.css?v=1.0.0",
  "./manifest.webmanifest",
  "./icon.svg",
  "./THIRD_PARTY_NOTICES.md",
  "./src/app.js?v=1.0.0",
  "./src/content.js?v=1.0.0",
  "./src/practice-bank.js?v=1.0.0",
  "./src/mock-exams.js?v=1.0.0",
  "./src/ear-training.js?v=1.0.0",
  "./src/lessons.js?v=1.0.0",
  "./src/resources.js?v=1.0.0",
  "./src/vocabulary-bank.js?v=1.0.0",
  "./src/vocabulary-enrichment.js?v=1.0.0",
  "./src/storage.js?v=1.0.0",
  "./src/accounts.js?v=1.0.0",
  "./src/cloud.js?v=1.0.0",
  "./src/cloud-config.js?v=1.0.0",
  "./src/vendor/supabase.js?v=1.0.0",
  "./src/db.js?v=1.0.0"
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
