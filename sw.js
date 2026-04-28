const CACHE_NAME = 'raizdigital-v1';
// Lista apenas o "esqueleto" essencial. 
// O resto será guardado dinamicamente à medida que navegas.
const PRECACHE = [
  './',
  './index.html',
  './css/style.css',
  './js/app.js',
  './js/db.js',
  './js/utils.js',
  './manifest.json'
];

// Instalação: Guarda o básico
self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE))
  );
});

// Ativação: Limpa caches antigos se mudares a versão
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.map(key => {
        if (key !== CACHE_NAME) return caches.delete(key);
      })
    ))
  );
});

// Estratégia: Cache First, falling back to Network
// Isto garante que a app abra instantaneamente sem net.
self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(cachedResponse => {
      if (cachedResponse) return cachedResponse;

      return fetch(e.request).then(networkResponse => {
        // Se for um ficheiro do nosso site, guarda-o no cache para a próxima vez
        if (e.request.url.startsWith(self.location.origin)) {
          return caches.open(CACHE_NAME).then(cache => {
            cache.put(e.request, networkResponse.clone());
            return networkResponse;
          });
        }
        return networkResponse;
      });
    }).catch(() => {
      // Se estiver offline e o ficheiro não estiver no cache (ex: uma imagem nova)
      console.log('Ficheiro não encontrado no cache e sem rede.');
    })
  );
  
});
