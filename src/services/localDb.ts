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
        let result!: T;
        req.onsuccess = () => {
          result = req.result;
        };
        req.onerror = () =>
          reject(req.error ?? new Error(`Erro na operação em ${storeName}.`));
        tx.oncomplete = () => {
          db.close();
          resolve(result);
        };
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
  const db = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(
        [STORE_META, STORE_ORIGINS, STORE_CATEGORIES],
        'readwrite'
      );
      const metaStore = tx.objectStore(STORE_META);
      const originStore = tx.objectStore(STORE_ORIGINS);
      const catStore = tx.objectStore(STORE_CATEGORIES);

      const seededReq = metaStore.get('seeded');
      const oriCountReq = originStore.count();
      const catCountReq = catStore.count();

      let seededVal = false;
      let oriCount = 0;
      let catCount = 0;
      let checksDone = 0;

      const maybeSeed = () => {
        checksDone += 1;
        if (checksDone < 3) return;

        if (!seededVal) {
          const baseTime = Date.now();
          if (oriCount === 0) {
            DEFAULT_ORIGINS.forEach((def, idx) => {
              originStore.put({
                id: generateSafeId('ori'),
                userId: 'local',
                name: def.name,
                isDefault: def.isDefault,
                createdAt: new Date(baseTime + idx * 10).toISOString(),
              } satisfies Origin);
            });
          }
          if (catCount === 0) {
            DEFAULT_CATEGORIES.forEach((def, idx) => {
              catStore.put({
                id: generateSafeId('cat'),
                userId: 'local',
                name: def.name,
                type: def.type,
                color: def.color,
                isDefault: def.isDefault,
                createdAt: new Date(baseTime + idx * 10).toISOString(),
              } satisfies Category);
            });
          }
          metaStore.put({ key: 'seeded', value: true });
        }
      };

      seededReq.onsuccess = () => {
        seededVal = Boolean(seededReq.result?.value);
        maybeSeed();
      };
      oriCountReq.onsuccess = () => {
        oriCount = oriCountReq.result;
        maybeSeed();
      };
      catCountReq.onsuccess = () => {
        catCount = catCountReq.result;
        maybeSeed();
      };

      tx.oncomplete = () => resolve();
      tx.onerror = () =>
        reject(tx.error ?? new Error('Erro ao inicializar dados locais.'));
    });
  } finally {
    db.close();
  }
}

export async function loadAllLocalStores(): Promise<{
  transactions: Transaction[];
  origins: Origin[];
  categories: Category[];
}> {
  await ensureLocalDefaults();
  const db = await openDatabase();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(
        [STORE_TRANSACTIONS, STORE_ORIGINS, STORE_CATEGORIES],
        'readonly'
      );
      const txReq = tx.objectStore(STORE_TRANSACTIONS).getAll();
      const oriReq = tx.objectStore(STORE_ORIGINS).getAll();
      const catReq = tx.objectStore(STORE_CATEGORIES).getAll();

      tx.oncomplete = () => {
        resolve({
          transactions: (txReq.result as Transaction[]) || [],
          origins: (oriReq.result as Origin[]) || [],
          categories: (catReq.result as Category[]) || [],
        });
      };
      tx.onerror = () =>
        reject(tx.error ?? new Error('Erro ao ler banco de dados local.'));
    });
  } finally {
    db.close();
  }
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

export async function clearAllLocalData(
  resetCustomDefinitions: boolean
): Promise<void> {
  const db = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const storeNames = resetCustomDefinitions
        ? [STORE_TRANSACTIONS, STORE_ORIGINS, STORE_CATEGORIES, STORE_META]
        : [STORE_TRANSACTIONS];
      const tx = db.transaction(storeNames, 'readwrite');
      tx.objectStore(STORE_TRANSACTIONS).clear();

      if (resetCustomDefinitions) {
        const originStore = tx.objectStore(STORE_ORIGINS);
        const catStore = tx.objectStore(STORE_CATEGORIES);
        const metaStore = tx.objectStore(STORE_META);

        originStore.clear();
        catStore.clear();

        const baseTime = Date.now();
        DEFAULT_ORIGINS.forEach((def, idx) => {
          originStore.put({
            id: generateSafeId('ori'),
            userId: 'local',
            name: def.name,
            isDefault: def.isDefault,
            createdAt: new Date(baseTime + idx * 10).toISOString(),
          } satisfies Origin);
        });
        DEFAULT_CATEGORIES.forEach((def, idx) => {
          catStore.put({
            id: generateSafeId('cat'),
            userId: 'local',
            name: def.name,
            type: def.type,
            color: def.color,
            isDefault: def.isDefault,
            createdAt: new Date(baseTime + idx * 10).toISOString(),
          } satisfies Category);
        });
        metaStore.put({ key: 'seeded', value: true });
      }

      tx.oncomplete = () => resolve();
      tx.onerror = () =>
        reject(tx.error ?? new Error('Erro ao limpar banco de dados local.'));
    });
  } finally {
    db.close();
  }
}
