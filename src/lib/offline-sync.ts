/**
 * OSDEL TECNOLOGIA - Motor de Sincronização & Modo Offline
 *
 * Permite que a aplicação funcione completamente sem ligação à internet,
 * armazenando dados localmente e sincronizando automaticamente as alterações
 * (clientes, pagamentos, ordens de serviço, saídas de caixa, inventário)
 * assim que o dispositivo recuperar a conectividade.
 */

import { getApiBaseUrl } from '@/lib/api-config';

export interface SyncQueueItem {
  id: string;
  timestamp: string;
  module:
    | 'clientes'
    | 'pagamentos'
    | 'despesas'
    | 'ordens'
    | 'inventario'
    | 'fecho'
    | 'configuracoes'
    | 'missoes'
    | 'agenda'
    | 'equipa'
    | 'emprestimos'
    | 'atividades'
    | 'chat'
    | 'canais'
    | 'mensagens'
    | 'geral';
  action: 'create' | 'update' | 'delete' | 'status_change' | 'complete' | 'sync';
  entity: string;
  description: string;
  payload: any;
  status: 'pending' | 'syncing' | 'synced' | 'failed';
  retryCount: number;
  syncedAt?: string;
  error?: string;
}

export interface SyncHistorySession {
  id: string;
  startedAt: string;
  completedAt: string;
  syncedCount: number;
  failedCount: number;
  source: 'auto_reconnect' | 'manual' | 'periodic' | 'immediate' | 'startup' | 'visibility';
  status: 'success' | 'partial' | 'failed';
}

const STORAGE_QUEUE = 'osdel:offline_sync_queue';
const STORAGE_HISTORY = 'osdel:offline_sync_history';
const STORAGE_SIMULATED_OFFLINE = 'osdel:simulated_offline';
const STORAGE_LAST_SYNC = 'osdel:last_sync_timestamp';

// Broadcast channel for instantaneous cross-tab synchronization
let broadcastChannel: BroadcastChannel | null = null;
if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
  try {
    broadcastChannel = new BroadcastChannel('osdel-sync-events');
    broadcastChannel.onmessage = (event) => {
      if (event.data?.type === 'SYNC_UPDATED') {
        window.dispatchEvent(new CustomEvent('osdel-sync-change'));
      }
    };
  } catch (e) {
    console.warn('BroadcastChannel not supported in this environment', e);
  }
}

function notifySyncChanged() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('osdel-sync-change'));
    try {
      broadcastChannel?.postMessage({ type: 'SYNC_UPDATED', timestamp: Date.now() });
    } catch {
      /* ignore */
    }
  }
}

export function isSimulatedOffline(): boolean {
  if (typeof window === 'undefined') return false;
  return window.localStorage.getItem(STORAGE_SIMULATED_OFFLINE) === 'true';
}

export function setSimulatedOffline(simulated: boolean): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_SIMULATED_OFFLINE, simulated ? 'true' : 'false');
  notifySyncChanged();
  if (!simulated && navigator.onLine) {
    // If user restored connection from simulated offline, trigger automatic sync!
    triggerAutoSync('auto_reconnect');
  }
}

export function isSystemOnline(): boolean {
  if (typeof window === 'undefined') return true;
  if (isSimulatedOffline()) return false;
  return typeof navigator !== 'undefined' ? navigator.onLine : true;
}

let cachedQueue: SyncQueueItem[] | null = null;

// Hidratação assíncrona da fila pelo IndexedDB
if (typeof window !== 'undefined') {
  import('@/lib/indexeddb-storage').then(({ idbGet }) => {
    idbGet<SyncQueueItem[]>('offline_sync_queue').then((idbQ) => {
      if (Array.isArray(idbQ) && idbQ.length > 0) {
        cachedQueue = idbQ;
        notifySyncChanged();
      }
    }).catch(() => {});
  }).catch(() => {});
}

export function getSyncQueue(): SyncQueueItem[] {
  if (cachedQueue) return cachedQueue;
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_QUEUE);
    if (!raw) return [];
    cachedQueue = JSON.parse(raw);
    return cachedQueue || [];
  } catch {
    return [];
  }
}

export function saveSyncQueue(queue: SyncQueueItem[]): void {
  if (typeof window === 'undefined') return;
  try {
    // Retém até 1.000 itens recentes com IndexedDB
    const trimmed = queue.slice(-1000);
    cachedQueue = trimmed;

    // Grava no IndexedDB sem restrição de 5MB
    import('@/lib/indexeddb-storage').then(({ idbSet }) => {
      idbSet('offline_sync_queue', trimmed).catch(() => {});
    }).catch(() => {});

    // Fallback LocalStorage tolerante a cota
    try {
      window.localStorage.setItem(STORAGE_QUEUE, JSON.stringify(trimmed.slice(-300)));
    } catch {}
  } catch (err) {
    console.warn('Failed to save sync queue:', err);
  }
}

export function getPendingSyncCount(): number {
  const queue = getSyncQueue();
  return queue.filter((item) => item.status === 'pending' || item.status === 'failed').length;
}

export function getSyncHistory(): SyncHistorySession[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_HISTORY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveSyncHistory(session: SyncHistorySession): void {
  if (typeof window === 'undefined') return;
  try {
    const history = getSyncHistory();
    const updated = [session, ...history].slice(0, 50);
    window.localStorage.setItem(STORAGE_HISTORY, JSON.stringify(updated));
  } catch (err) {
    console.warn('Failed to save sync history:', err);
  }
}

export function getLastSyncTimestamp(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(STORAGE_LAST_SYNC);
}

export function setLastSyncTimestamp(isoString: string): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_LAST_SYNC, isoString);
}

/**
 * Enqueue a mutation done by user (offline or online).
 * All new mutations enter as 'pending' and are immediately dispatched to the cloud if online.
 */
export function enqueueSyncMutation(item: {
  module: SyncQueueItem['module'];
  action: SyncQueueItem['action'];
  entity: string;
  description: string;
  payload: any;
}): SyncQueueItem {
  const queue = getSyncQueue();

  const newItem: SyncQueueItem = {
    id: `sync_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    timestamp: new Date().toISOString(),
    module: item.module,
    action: item.action,
    entity: item.entity,
    description: item.description,
    payload: item.payload,
    status: 'pending',
    retryCount: 0,
  };

  const updatedQueue = [...queue, newItem];
  saveSyncQueue(updatedQueue);
  notifySyncChanged();

  // Se o dispositivo estiver online, despacha a sincronização na nuvem imediatamente em segundo plano
  if (isSystemOnline()) {
    setTimeout(() => {
      triggerAutoSync('immediate');
    }, 40);
  }

  return newItem;
}

let isSyncInProgress = false;

export function isCurrentlySyncing(): boolean {
  return isSyncInProgress;
}

/**
 * Execute synchronization of all pending items in the queue
 */
export async function syncPendingQueue(options?: {
  source?: SyncHistorySession['source'];
}): Promise<{
  success: boolean;
  syncedCount: number;
  failedCount: number;
}> {
  if (isSyncInProgress) {
    return { success: false, syncedCount: 0, failedCount: 0 };
  }

  if (!isSystemOnline()) {
    return { success: false, syncedCount: 0, failedCount: 0 };
  }

  const queue = getSyncQueue();
  const pendingIndices = queue
    .map((item, idx) => ({ item, idx }))
    .filter(({ item }) => item.status === 'pending' || item.status === 'failed');

  if (pendingIndices.length === 0) {
    setLastSyncTimestamp(new Date().toISOString());
    notifySyncChanged();
    return { success: true, syncedCount: 0, failedCount: 0 };
  }

  isSyncInProgress = true;
  notifySyncChanged();

  const startedAt = new Date().toISOString();
  let syncedCount = 0;
  let failedCount = 0;

  try {
    // Set pending items to 'syncing'
    pendingIndices.forEach(({ idx }) => {
      queue[idx].status = 'syncing';
    });
    saveSyncQueue(queue);
    notifySyncChanged();

    const baseUrl = getApiBaseUrl();
    const itemsToSync = pendingIndices.map(({ item }) => item);
    let serverSuccess = false;
    let appliedIdsSet = new Set<string>();
    let networkErrorMessage = '';

    if (baseUrl && itemsToSync.length > 0) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 12000);

        const pushResponse = await fetch(`${baseUrl}/api/v1/sync/batch`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({
            mutations: itemsToSync,
            clientTimestamp: new Date().toISOString(),
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (pushResponse.ok) {
          const resData = await pushResponse.json();
          if (resData && resData.success !== false) {
            serverSuccess = true;
            if (Array.isArray(resData.applied_ids) && resData.applied_ids.length > 0) {
              resData.applied_ids.forEach((id: string) => appliedIdsSet.add(String(id)));
            } else {
              itemsToSync.forEach((it) => appliedIdsSet.add(it.id));
            }
          }
        } else {
          networkErrorMessage = `Servidor retornou HTTP ${pushResponse.status}`;
        }
      } catch (pushErr: any) {
        networkErrorMessage = pushErr?.message || 'Erro de conexão à nuvem';
      }
    }

    // Process synchronization results based on genuine server confirmation
    const nowIso = new Date().toISOString();
    pendingIndices.forEach(({ item, idx }) => {
      if (serverSuccess && (appliedIdsSet.size === 0 || appliedIdsSet.has(item.id))) {
        queue[idx].status = 'synced';
        queue[idx].syncedAt = nowIso;
        queue[idx].error = undefined;
        syncedCount++;
      } else {
        // Keep in queue as pending/failed to be retried
        queue[idx].status = 'failed';
        queue[idx].retryCount = (queue[idx].retryCount || 0) + 1;
        queue[idx].error = networkErrorMessage || 'Aguardando sincronização com a nuvem';
        failedCount++;
      }
    });

    saveSyncQueue(queue);
    if (syncedCount > 0) {
      setLastSyncTimestamp(nowIso);
    }

    // Record session history
    const session: SyncHistorySession = {
      id: `session_${Date.now()}`,
      startedAt,
      completedAt: nowIso,
      syncedCount,
      failedCount,
      source: options?.source || 'manual',
      status: failedCount === 0 ? 'success' : syncedCount > 0 ? 'partial' : 'failed',
    };
    saveSyncHistory(session);

    // Dispatch completion event for toast notification
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('osdel-sync-completed', {
          detail: {
            syncedCount,
            failedCount,
            source: options?.source || 'manual',
          },
        })
      );
    }

    return {
      success: failedCount === 0,
      syncedCount,
      failedCount,
    };
  } finally {
    isSyncInProgress = false;
    notifySyncChanged();
  }
}

/**
 * Trigger automatic sync (e.g. after network reconnection)
 */
export function triggerAutoSync(source: SyncHistorySession['source'] = 'auto_reconnect') {
  if (isSystemOnline() && !isSyncInProgress) {
    syncPendingQueue({ source }).catch((err) => {
      console.warn('Auto sync execution error:', err);
    });
  }
}

/**
 * Remove items from queue that have already been synchronized
 */
export function clearSyncedItems(): void {
  const queue = getSyncQueue();
  const kept = queue.filter((item) => item.status === 'pending' || item.status === 'failed');
  saveSyncQueue(kept);
  notifySyncChanged();
}

/**
 * Export a complete offline backup bundle
 */
export function exportOfflineBackup(): string {
  const data: Record<string, any> = {
    exportedAt: new Date().toISOString(),
    system: 'OSDEL TECNOLOGIA - Gestão Integrada',
    version: '2.4-offline-ready',
    syncQueue: getSyncQueue(),
    syncHistory: getSyncHistory(),
    lastSync: getLastSyncTimestamp(),
  };

  if (typeof window !== 'undefined') {
    const keys = Object.keys(window.localStorage).filter((k) => k.startsWith('osdel:'));
    const database: Record<string, any> = {};
    keys.forEach((key) => {
      try {
        database[key] = JSON.parse(window.localStorage.getItem(key) || 'null');
      } catch {
        database[key] = window.localStorage.getItem(key);
      }
    });
    data.database = database;
  }

  return JSON.stringify(data, null, 2);
}

/**
 * Import and restore an offline backup
 */
export function importOfflineBackup(jsonStr: string): { success: boolean; message: string } {
  try {
    const parsed = JSON.parse(jsonStr);
    if (!parsed.database && !parsed.syncQueue) {
      return { success: false, message: 'Ficheiro de backup inválido.' };
    }

    if (parsed.database && typeof window !== 'undefined') {
      Object.entries(parsed.database).forEach(([key, val]) => {
        window.localStorage.setItem(key, typeof val === 'string' ? val : JSON.stringify(val));
      });
    }

    if (parsed.syncQueue) {
      saveSyncQueue(parsed.syncQueue);
    }

    notifySyncChanged();
    window.location.reload();
    return { success: true, message: 'Dados restaurados com sucesso!' };
  } catch (err: any) {
    return { success: false, message: `Erro ao importar: ${err?.message || 'Formato inválido'}` };
  }
}

// Global window event listener setup for automatic reconnection
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    console.log('OSDEL: Ligação à internet restabelecida! A iniciar sincronização automática...');
    notifySyncChanged();
    triggerAutoSync('auto_reconnect');
  });

  window.addEventListener('offline', () => {
    console.log('OSDEL: Dispositivo offline. Modo de armazenamento local activado.');
    notifySyncChanged();
  });

  // Periodic health check every 25 seconds: if there are pending items and we are online, auto-sync!
  setInterval(() => {
    if (isSystemOnline() && !isSyncInProgress) {
      const pending = getPendingSyncCount();
      if (pending > 0) {
        triggerAutoSync('periodic');
      }
    }
  }, 25000);
}
