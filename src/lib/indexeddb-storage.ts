/**
 * OSDEL TECNOLOGIA - GESTÃO X
 * Motor de Armazenamento de Alta Capacidade em IndexedDB (via idb)
 * 
 * Substitui o limite estrito de 5MB a 10MB do LocalStorage.
 * Permite gerir com segurança mais de 10.000 a 100.000 clientes, contratos,
 * faturas, pagamentos e ordens de serviço diretamente no navegador do cliente,
 * Electron Desktop e PWA offline.
 */

import { openDB, type IDBPDatabase } from 'idb';

export const DB_NAME = 'OSDEL_GESTAOX_DB';
export const DB_VERSION = 1;

export const STORE_APP_DATA = 'app_data';
export const STORE_SYNC_QUEUE = 'sync_queue';
export const STORE_META = 'meta';

export const ALL_COLLECTION_KEYS = [
  'clients',
  'contracts',
  'payments',
  'invoices',
  'expenses',
  'financial_accounts',
  'account_transfers',
  'category_budgets',
  'users',
  'settings',
  'inventory',
  'equipment_assignments',
  'service_orders',
  'job_roles',
  'cash_closures',
  'audit_logs',
  'messages',
  'tv_channels',
  'technician_loans',
  'team_missions',
  'schedule_events',
  'monthly_closures',
  'client_credentials',
  'client_agreements',
  'notifications',
] as const;

export type CollectionKey = typeof ALL_COLLECTION_KEYS[number];

let dbPromise: Promise<IDBPDatabase> | null = null;
let isInitialized = false;

/**
 * Abre e retorna a conexão singleton com o banco de dados IndexedDB
 */
export function getDb(): Promise<IDBPDatabase> {
  if (typeof window === 'undefined' || !window.indexedDB) {
    return Promise.reject(new Error('IndexedDB não suportado neste ambiente.'));
  }

  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion, newVersion, transaction) {
        // Armazenamento principal de coleções de dados
        if (!db.objectStoreNames.contains(STORE_APP_DATA)) {
          db.createObjectStore(STORE_APP_DATA);
        }
        // Fila de sincronização offline
        if (!db.objectStoreNames.contains(STORE_SYNC_QUEUE)) {
          db.createObjectStore(STORE_SYNC_QUEUE, { keyPath: 'id' });
        }
        // Metadados do sistema, migrações e cursores
        if (!db.objectStoreNames.contains(STORE_META)) {
          db.createObjectStore(STORE_META);
        }
      },
    });
  }

  return dbPromise;
}

/**
 * Grava um valor em IndexedDB no store de app_data
 */
export async function idbSet<T = any>(key: string, value: T): Promise<void> {
  try {
    const db = await getDb();
    await db.put(STORE_APP_DATA, value, key);
  } catch (error) {
    console.warn(`[IndexedDB] Erro ao gravar chave "${key}":`, error);
  }
}

/**
 * Lê um valor de IndexedDB no store de app_data
 */
export async function idbGet<T = any>(key: string): Promise<T | undefined> {
  try {
    const db = await getDb();
    return await db.get(STORE_APP_DATA, key);
  } catch (error) {
    console.warn(`[IndexedDB] Erro ao ler chave "${key}":`, error);
    return undefined;
  }
}

/**
 * Remove uma chave de IndexedDB
 */
export async function idbDelete(key: string): Promise<void> {
  try {
    const db = await getDb();
    await db.delete(STORE_APP_DATA, key);
  } catch (error) {
    console.warn(`[IndexedDB] Erro ao remover chave "${key}":`, error);
  }
}

/**
 * Limpa todo o store de app_data
 */
export async function idbClear(): Promise<void> {
  try {
    const db = await getDb();
    await db.clear(STORE_APP_DATA);
  } catch (error) {
    console.warn('[IndexedDB] Erro ao limpar base:', error);
  }
}

/**
 * Grava metadado
 */
export async function idbSetMeta<T = any>(key: string, value: T): Promise<void> {
  try {
    const db = await getDb();
    await db.put(STORE_META, value, key);
  } catch (error) {
    console.warn(`[IndexedDB] Erro ao gravar meta "${key}":`, error);
  }
}

/**
 * Lê metadado
 */
export async function idbGetMeta<T = any>(key: string): Promise<T | undefined> {
  try {
    const db = await getDb();
    return await db.get(STORE_META, key);
  } catch (error) {
    return undefined;
  }
}

/**
 * Migra dados do LocalStorage para IndexedDB automaticamente na inicialização.
 * Preserva 100% dos dados já cadastrados pelo utilizador sem perda.
 */
export async function migrateLocalStorageToIndexedDB(): Promise<{
  migratedCount: number;
  keys: string[];
}> {
  if (typeof window === 'undefined' || !window.localStorage) {
    return { migratedCount: 0, keys: [] };
  }

  const migratedKeys: string[] = [];

  try {
    const db = await getDb();
    const isAlreadyMigrated = await db.get(STORE_META, 'migrated_from_localstorage_v1');

    for (const key of ALL_COLLECTION_KEYS) {
      // Verifica se a chave já existe no IndexedDB
      const existingInIdb = await db.get(STORE_APP_DATA, key);

      // Procura no localStorage pelas variações com prefixo
      const rawStored =
        window.localStorage.getItem(`osdel:${key}`) ||
        window.localStorage.getItem(`osdel_${key}`) ||
        window.localStorage.getItem(key);

      if (rawStored) {
        try {
          const parsed = JSON.parse(rawStored);
          // Se não existe em IDB ou se o IDB está vazio, migra
          if (
            existingInIdb === undefined ||
            (Array.isArray(existingInIdb) && existingInIdb.length === 0 && Array.isArray(parsed) && parsed.length > 0)
          ) {
            await db.put(STORE_APP_DATA, parsed, key);
            migratedKeys.push(key);
          }
        } catch {
          // Ignora dados corrompidos
        }
      }
    }

    await db.put(STORE_META, true, 'migrated_from_localstorage_v1');
    await db.put(STORE_META, new Date().toISOString(), 'last_migration_at');

    return { migratedCount: migratedKeys.length, keys: migratedKeys };
  } catch (error) {
    console.warn('[IndexedDB] Erro durante migração automática:', error);
    return { migratedCount: migratedKeys.length, keys: migratedKeys };
  }
}

/**
 * Carrega todas as coleções de IndexedDB para inicialização síncrona/em memória
 */
export async function loadAllFromIndexedDB(): Promise<Record<string, any>> {
  const result: Record<string, any> = {};
  try {
    const db = await getDb();
    const tx = db.transaction(STORE_APP_DATA, 'readonly');
    const store = tx.objectStore(STORE_APP_DATA);

    for (const key of ALL_COLLECTION_KEYS) {
      const val = await store.get(key);
      if (val !== undefined) {
        result[key] = val;
      }
    }
    await tx.done;
  } catch (error) {
    console.warn('[IndexedDB] Erro ao carregar todas as coleções:', error);
  }
  return result;
}

/**
 * Retorna métricas de uso de disco e quota disponível no navegador
 */
export async function getStorageEstimate(): Promise<{
  usageBytes: number;
  quotaBytes: number;
  usageMb: number;
  quotaMb: number;
  usageFormatted: string;
  quotaFormatted: string;
  percentUsed: number;
  indexedDbSupported: boolean;
}> {
  const fallback = {
    usageBytes: 0,
    quotaBytes: 0,
    usageMb: 0,
    quotaMb: 0,
    usageFormatted: '0 MB',
    quotaFormatted: 'Ilimitado',
    percentUsed: 0,
    indexedDbSupported: typeof window !== 'undefined' && 'indexedDB' in window,
  };

  if (typeof navigator === 'undefined' || !navigator.storage || !navigator.storage.estimate) {
    return fallback;
  }

  try {
    const estimate = await navigator.storage.estimate();
    const usage = estimate.usage || 0;
    const quota = estimate.quota || 0;

    const usageMb = Number((usage / (1024 * 1024)).toFixed(2));
    const quotaMb = Number((quota / (1024 * 1024)).toFixed(0));
    const percentUsed = quota > 0 ? Number(((usage / quota) * 100).toFixed(2)) : 0;

    const formatBytes = (bytes: number) => {
      if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
      if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
      return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
    };

    return {
      usageBytes: usage,
      quotaBytes: quota,
      usageMb,
      quotaMb,
      usageFormatted: formatBytes(usage),
      quotaFormatted: formatBytes(quota),
      percentUsed,
      indexedDbSupported: true,
    };
  } catch {
    return fallback;
  }
}
