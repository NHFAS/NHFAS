// NHFAS offline-first IndexedDB layer (SRS FR-24, NFR 5.5).
// Stores pending writes (job posts, bids, messages, proof-of-work) so the
// app keeps working offline and synchronises on reconnect with explicit
// conflict rules and user-visible sync status.

const DB_NAME = 'nhfas-offline';
const DB_VERSION = 1;
const STORE_NAME = 'pending-writes';

let dbPromise = null;

function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('createdAt', 'createdAt', { unique: false });
        store.createIndex('type', 'type', { unique: false });
        store.createIndex('synced', 'synced', { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

export async function enqueueWrite({ id, type, payload, createdAt = Date.now() }) {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);
  await store.add({ id, type, payload, createdAt, synced: false, attempt: 0 });
  return tx.complete;
}

export async function getPendingWrites() {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readonly');
  const store = tx.objectStore(STORE_NAME);
  const items = await new Promise((resolve, reject) => {
    const req = store.openCursor();
    const results = [];
    req.onsuccess = (e) => {
      const cursor = e.target.result;
      if (cursor) {
        if (cursor.value.synced === false) results.push(cursor.value);
        cursor.continue();
      } else resolve(results);
    };
    req.onerror = () => reject(req.error);
  });
  return items;
}

export async function markSynced(id) {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);
  const item = await new Promise((resolve, reject) => {
    const req = store.get(id);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  if (item) {
    item.synced = true;
    await store.put(item);
  }
  return tx.complete;
}

export async function incrementAttempt(id) {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);
  const item = await new Promise((resolve, reject) => {
    const req = store.get(id);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  if (item) {
    item.attempt = (item.attempt || 0) + 1;
    await store.put(item);
  }
  return tx.complete;
}

export async function removeWrite(id) {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);
  await store.delete(id);
  return tx.complete;
}

export async function getUnsyncedCount() {
  const items = await getPendingWrites();
  return items.length;
}