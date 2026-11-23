import { Category, Origin, Transaction } from '../types/finance';
import { DEFAULT_CATEGORIES, DEFAULT_ORIGINS } from '../utils/finance';

const DB_NAME = 'controle_financeiro_db';
const DB_VERSION = 1;
const STORE_TRANSACTIONS = 'transactions';
const STORE_ORIGINS = 'origins';
const STORE_CATEGORIES = 'categories';
const STORE_META = 'meta';

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB indisponível neste navegador.'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_TRANSACTIONS)) {
        db.createObjectStore(STORE_TRANSACTIONS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_ORIGINS)) {
        db.createObjectStore(STORE_ORIGINS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_CATEGORIES)) {
        db.createObjectStore(STORE_CATEGORIES, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_META)) {
        db.createObjectStore(STORE_META, { keyPath: 'key' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error('Erro ao abrir banco de dados local.'));
  });
}

function runStoreRequest<T>(
  storeName: string,
  mode: IDBTransactionMode,
  executor: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  return openDatabase().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(storeName, mode);
        const store = tx.objectStore(storeName);
        const req = executor(store);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () =>
          reject(req.error ?? new Error(`Erro na operação em ${storeName}.`));
        tx.oncomplete = () => db.close();
        tx.onerror = () => {
          db.close();
          reject(tx.error ?? new Error(`Falha na transação em ${storeName}.`));
        };
      })
  );
}

export function generateSafeId(prefix: string): string {
  const rand =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID().replace(/-/g, '').slice(0, 16)
      : `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
  return `${prefix}_${rand}`;
}

export async function ensureLocalDefaults(): Promise<void> {
  const seeded = await runStoreRequest<{ key: string; value: boolean } | undefined>(
    STORE_META,
    'readonly',
    (store) => store.get('seeded')
  );
  if (seeded?.value) return;

  const existingOrigins = await getAllLocalOrigins();
  const existingCategories = await getAllLocalCategories();
  const baseTime = Date.now();

  if (existingOrigins.length === 0) {
    for (let i = 0; i < DEFAULT_ORIGINS.length; i += 1) {
      const def = DEFAULT_ORIGINS[i];
      await putLocalOrigin({
        id: generateSafeId('ori'),
        userId: 'local',
        name: def.name,
        isDefault: def.isDefault,
        createdAt: new Date(baseTime + i * 10).toISOString(),
      });
    }
  }

  if (existingCategories.length === 0) {
    for (let i = 0; i < DEFAULT_CATEGORIES.length; i += 1) {
      const def = DEFAULT_CATEGORIES[i];
      await putLocalCategory({
        id: generateSafeId('cat'),
        userId: 'local',
        name: def.name,
        type: def.type,
        color: def.color,
        isDefault: def.isDefault,
        createdAt: new Date(baseTime + i * 10).toISOString(),
      });
    }
  }

  await runStoreRequest(STORE_META, 'readwrite', (store) =>
    store.put({ key: 'seeded', value: true })
  );
}

export function getAllLocalTransactions(): Promise<Transaction[]> {
  return runStoreRequest<Transaction[]>(STORE_TRANSACTIONS, 'readonly', (store) =>
    store.getAll()
  );
}

export async function putLocalTransaction(tx: Transaction): Promise<void> {
  await runStoreRequest(STORE_TRANSACTIONS, 'readwrite', (store) => store.put(tx));
}

export async function deleteLocalTransaction(id: string): Promise<void> {
  await runStoreRequest(STORE_TRANSACTIONS, 'readwrite', (store) => store.delete(id));
}

export function getAllLocalOrigins(): Promise<Origin[]> {
  return runStoreRequest<Origin[]>(STORE_ORIGINS, 'readonly', (store) =>
    store.getAll()
  );
}

export async function putLocalOrigin(origin: Origin): Promise<void> {
  await runStoreRequest(STORE_ORIGINS, 'readwrite', (store) => store.put(origin));
}

export async function deleteLocalOrigin(id: string): Promise<void> {
  await runStoreRequest(STORE_ORIGINS, 'readwrite', (store) => store.delete(id));
}

export function getAllLocalCategories(): Promise<Category[]> {
  return runStoreRequest<Category[]>(STORE_CATEGORIES, 'readonly', (store) =>
    store.getAll()
  );
}

export async function putLocalCategory(category: Category): Promise<void> {
  await runStoreRequest(STORE_CATEGORIES, 'readwrite', (store) =>
    store.put(category)
  );
}

export async function deleteLocalCategory(id: string): Promise<void> {
  await runStoreRequest(STORE_CATEGORIES, 'readwrite', (store) => store.delete(id));
}

export async function clearLocalTransactions(): Promise<void> {
  await runStoreRequest(STORE_TRANSACTIONS, 'readwrite', (store) => store.clear());
}
