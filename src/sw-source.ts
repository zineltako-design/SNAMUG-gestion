// Service Worker SNAMUG GESTION — mode hors-ligne (App Shell caching)
// Servi à la racine (/sw.js) pour couvrir tout le scope de l'application.

export const SERVICE_WORKER_SOURCE = `
const CACHE_NAME = 'snamug-shell-v2';

const APP_SHELL = [
  '/',
  '/static/style.css',
  '/static/manifest.json',
  '/static/api.js',
  '/static/utils.js',
  '/static/store.js',
  '/static/layout.js',
  '/static/app.js',
  '/static/views/login.js',
  '/static/views/changer-mdp.js',
  '/static/views/dashboard.js',
  '/static/views/membres.js',
  '/static/views/paiements.js',
  '/static/views/depenses.js',
  '/static/views/communes.js',
  '/static/views/comptables.js',
  '/static/views/parametres.js',
  '/static/views/projets.js',
  '/static/views/cloture.js',
  '/static/offline/db.js',
  '/static/offline/sync.js',
  '/static/offline/connectivity.js',
  '/static/offline/offline-api.js',
  'https://cdn.tailwindcss.com',
  'https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css',
  'https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js',
  'https://cdn.jsdelivr.net/npm/dayjs@1.11.10/dayjs.min.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.all(
        APP_SHELL.map((url) =>
          cache.add(url).catch(() => {
            // Une ressource externe (CDN) peut échouer au premier install si hors-ligne : on ignore.
          })
        )
      );
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Ne jamais mettre en cache les appels API ni les fichiers uploadés : toujours réseau,
  // la gestion hors-ligne des données métier est déléguée à IndexedDB (offline-api.js).
  if (url.pathname.startsWith('/api/')) {
    return; // laisse la requête suivre son cours normal (réseau), échouera proprement si hors-ligne
  }

  // Navigation (chargement de page) : essaie le réseau, sinon retombe sur le shell en cache.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(() => caches.match('/'))
    );
    return;
  }

  // Fichiers de l'application et CDN : cache-first avec mise à jour en arrière-plan.
  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          if (res && res.status === 200) {
            const resClone = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
          }
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
`
