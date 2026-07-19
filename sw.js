const CACHE_NAME = 'pmp6-links-cache-v1';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './data.js',
  './manifest.json',
  './icons/icon.svg'
];

// Phase d'installation : Mise en cache des ressources statiques initiales
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Mise en cache des ressources PWA...');
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .then(() => self.skipWaiting())
  );
});

// Phase d'activation : Nettoyage des anciens caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('Suppression de l\'ancien cache PWA:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Stratégie de Fetch : Réseau en premier, repli sur le cache (Network First)
// Cette stratégie est idéale pour notre portail de liens car nous voulons toujours
// afficher les derniers liens si internet est disponible, tout en permettant
// à l'application de fonctionner entièrement hors ligne avec les données en cache.
self.addEventListener('fetch', (event) => {
  // Ignorer les requêtes non GET (ex: POST, etc.)
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Si la réponse est valide, on met à jour le cache en arrière-plan
        if (response && response.status === 200) {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => {
        // En cas d'échec du réseau (hors ligne), on cherche dans le cache
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          
          // Si la ressource demandée n'est pas dans le cache, on retourne une erreur basique
          return new Response('Connexion perdue. Cette ressource n\'est pas disponible hors ligne.', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: new Headers({ 'Content-Type': 'text/plain; charset=utf-8' })
          });
        });
      })
  );
});
