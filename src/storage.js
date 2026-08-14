(() => {
  'use strict';

  const DB_NAME = 'MediaDeckDB';
  const DB_VERSION = 3; // Increased for library cache store
  const STORES = {
    HANDLES: 'handles',
    PROGRAM_LOG: 'program_log',
    MEDIA_LIBRARY: 'media_library',
    SETTINGS: 'settings',
    CRATES: 'crates',
    SAVED_PLAYLISTS: 'saved_playlists'
  };

  const dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (e) => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORES.HANDLES)) db.createObjectStore(STORES.HANDLES);
      if (!db.objectStoreNames.contains(STORES.PROGRAM_LOG)) db.createObjectStore(STORES.PROGRAM_LOG);
      if (!db.objectStoreNames.contains(STORES.MEDIA_LIBRARY)) db.createObjectStore(STORES.MEDIA_LIBRARY);
      if (!db.objectStoreNames.contains(STORES.SETTINGS)) db.createObjectStore(STORES.SETTINGS);
      if (!db.objectStoreNames.contains(STORES.CRATES)) db.createObjectStore(STORES.CRATES);
      if (!db.objectStoreNames.contains(STORES.SAVED_PLAYLISTS)) db.createObjectStore(STORES.SAVED_PLAYLISTS);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  window.MediaStore = {
    async put(store, key, val) {
      const db = await dbPromise;
      const tx = db.transaction(store, 'readwrite');
      tx.objectStore(store).put(val, key);
      return new Promise((r) => tx.oncomplete = r);
    },
    async get(store, key) {
      const db = await dbPromise;
      const tx = db.transaction(store, 'readonly');
      const request = tx.objectStore(store).get(key);
      return new Promise((r) => request.onsuccess = () => r(request.result));
    },
    async getAll(store) {
      const db = await dbPromise;
      const tx = db.transaction(store, 'readonly');
      const request = tx.objectStore(store).getAll();
      return new Promise((r) => request.onsuccess = () => r(request.result));
    },
    async delete(store, key) {
      const db = await dbPromise;
      const tx = db.transaction(store, 'readwrite');
      tx.objectStore(store).delete(key);
      return new Promise((r) => tx.oncomplete = r);
    },
    STORES
  };

})();
