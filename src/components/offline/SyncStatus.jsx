// NHFAS sync status indicator (SRS FR-24, NFR 5.5).
// Shows online/offline state and unsynced write count. Click to manually
// trigger a sync when back online.

import { useEffect, useState } from 'react';
import { Cloud, WifiOff, LoaderCircle, AlertCircle, CheckCircle2 } from 'lucide-react';
import { getSyncStatus, onSyncStateChange } from '../../lib/syncEngine.js';

export default function SyncStatus() {
  const [status, setStatus] = useState({ unsyncedCount: 0, syncing: false });
  const [online, setOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

  useEffect(() => {
    setOnline(navigator.onLine);
    const unsub = onSyncStateChange((s) => setStatus(s));
    getSyncStatus().then(setStatus);
    return unsub;
  }, []);

  const handleRetry = () => {
    import('../../lib/syncEngine.js').then(({ syncPendingWrites }) => syncPendingWrites());
  };

  if (status.unsyncedCount === 0 && online && !status.syncing) return null;

  return (
    <div
      className={`fixed bottom-4 right-4 z-50 rounded-lg border px-4 py-3 text-xs font-medium shadow-lg ${
        !online
          ? 'border-amber-200 bg-amber-50 text-amber-800'
          : status.syncing
          ? 'border-blue-200 bg-blue-50 text-blue-800'
          : 'border-emerald-200 bg-emerald-50 text-emerald-800'
      }`}
    >
      <div className="flex items-center gap-2">
        {!online ? (
          <WifiOff className="h-4 w-4" />
        ) : status.syncing ? (
          <LoaderCircle className="h-4 w-4 animate-spin" />
        ) : (
          <CheckCircle2 className="h-4 w-4" />
        )}
        <span>
          {!online ? 'Offline — changes saved locally' : status.syncing ? 'Syncing…' : 'All synced'}
          {status.unsyncedCount > 0 ? ` (${status.unsyncedCount} pending)` : ''}
        </span>
        {!online || status.unsyncedCount > 0 ? (
          <button
            onClick={handleRetry}
            disabled={!online || status.syncing}
            className="ml-3 underline underline-offset-2 hover:opacity-80"
          >
            {online ? 'Retry sync' : 'Queue for sync'}
          </button>
        ) : null}
      </div>
    </div>
  );
}