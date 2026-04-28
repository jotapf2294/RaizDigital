const DB_NAME = 'RaizDigitalDB';
const DB_VERSION = 3;
let db;

const STORES = ['zonas', 'wiki', 'plantios', 'forum_cat', 'forum_top', 'diario'];

export function initDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => {
      db = req.result;
      resolve(db);
    };
    req.onupgradeneeded = e => {
      const db = e.target.result;
      STORES.forEach(store => {
        if (!db.objectStoreNames.contains(store)) {
          db.createObjectStore(store, { keyPath: 'id' });
        }
      });
    };
  });
}

function tx(store, mode = 'readonly') {
  return db.transaction(store, mode).objectStore(store);
}

export const DB = {
  getAll: store => new Promise((res, rej) => {
    const req = tx(store).getAll();
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
  }),

  get: (store, id) => new Promise((res, rej) => {
    const req = tx(store).get(id);
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
  }),

  add: (store, data) => new Promise((res, rej) => {
    if (!data.created_at) data.created_at = Date.now();
    const req = tx(store, 'readwrite').add(data);
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
  }),

  put: (store, data) => new Promise((res, rej) => {
    const req = tx(store, 'readwrite').put(data);
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
  }),

  delete: (store, id) => new Promise((res, rej) => {
    const req = tx(store, 'readwrite').delete(id);
    req.onsuccess = () => res();
    req.onerror = () => rej(req.error);
  })
};
