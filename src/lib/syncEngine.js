// NHFAS sync-on-reconnect engine (SRS FR-24, NFR 5.5).
// Replays pending IndexedDB writes when the browser regains connectivity,
// with conflict detection, retry limits, and user-visible sync status.

import { getPendingWrites, markSynced, incrementAttempt, removeWrite, getUnsyncedCount } from './offlineDB.js';

const MAX_RETRIES = 5;
const BACKOFF_BASE_MS = 1000;

let syncing = false;
let listeners = new Set();

export function onSyncStateChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function emit(state) {
  listeners.forEach((fn) => fn(state));
}

export async function getSyncStatus() {
  const count = await getUnsyncedCount();
  return { unsyncedCount: count, syncing };
}

// Attempt to send a single pending write. Returns true if synced/removed.
async function processWrite(item) {
  const { id, type, payload } = item;

  // Conflict resolution: for idempotent operations (same id + same type),
  // the server RPC already handles dedupe. For destructive operations we
  // include a client-generated etag so the server can reject stale writes.
  const headers = { 'Content-Type': 'application/json' };
  const clientEtag = payload._etag;
  if (clientEtag) headers['If-Match'] = clientEtag;

  let response;
  try {
    response = await fetch('/api/offline-sync', {
      method: 'POST',
      headers,
      body: JSON.stringify({ type, payload, id, createdAt: payload.createdAt }),
    });
  } catch (err) {
    throw new Error(`network: ${err.message}`);
  }

  if (response.status === 409 || response.status === 412) {
    // Conflict — server has a newer version. Remove local write and let the
    // user refetch authoritative data on next load.
    await removeWrite(id);
    return { conflict: true, id };
  }

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  await markSynced(id);
  return { synced: true, id };
}

export async function syncPendingWrites() {
  if (syncing) return;
  syncing = true;
  emit({ syncing: true, unsyncedCount: await getUnsyncedCount() });

  try {
    const items = await getPendingWrites();
    const results = [];

    for (const item of items) {
      try {
        const result = await processWrite(item);
        results.push(result);
      } catch (err) {
        await incrementAttempt(item.id);
        if ((item.attempt || 0) + 1 >= MAX_RETRIES) {
          await removeWrite(item.id);
          results.push({ failed: true, id: item.id, reason: err.message });
        } else {
          results.push({ retry: true, id: item.id, reason: err.message });
        }
        // Backoff before next write
        await new Promise((r) => setTimeout(r, BACKOFF_BASE_MS * (item.attempt || 1)));
      }
    }

    const unsyncedCount = await getUnsyncedCount();
    emit({ syncing: false, unsyncedCount, results });
    return results;
  } finally {
    syncing = false;
  }
}

export function setupOnlineListener() {
  if (typeof window === 'undefined') return;

  const handleOnline = async () => {
    if (navigator.onLine) {
      await syncPendingWrites();
    }
  };

  window.addEventListener('online', handleOnline);

  // Also sync periodically while online to catch writes made while offline
  const interval = setInterval(async () => {
    if (navigator.onLine) {
      const count = await getUnsyncedCount();
      if (count > 0) await syncPendingWrites();
    }
  }, 10000);

  return () => {
    window.removeEventListener('online', handleOnline);
    clearInterval(interval);
  };
}

// Convenience: enqueue a write and attempt sync if online
export async function enqueueAndSync({ id, type, payload }) {
  await enqueueWrite({ id, type, payload });
  if (navigator.onLine) {
    await syncPendingWrites();
  }
}