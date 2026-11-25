import { User } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  DocumentReference,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import {
  Category,
  CategoryScope,
  ExpenseStatus,
  Origin,
  Transaction,
} from '../types/finance';
import {
  DEFAULT_CATEGORIES,
  DEFAULT_ORIGINS,
  NormalizedTransactionPayload,
  sortCategories,
  sortOrigins,
} from '../utils/finance';
import {
  clearAllLocalData,
  clearLocalTransactions,
  deleteLocalCategory,
  deleteLocalOrigin,
  deleteLocalTransaction,
  generateSafeId,
  getAllLocalTransactions,
  loadAllLocalStores,
  putLocalCategory,
  putLocalOrigin,
  putLocalTransaction,
} from './localDb';

function toIsoString(val: unknown): string {
  if (val instanceof Timestamp) {
    return val.toDate().toISOString();
  }
  if (typeof val === 'string') return val;
  return new Date().toISOString();
}

async function commitDeletesInChunks(refs: DocumentReference[], path: string) {
  const CHUNK_SIZE = 450;
  for (let i = 0; i < refs.length; i += CHUNK_SIZE) {
    const chunk = refs.slice(i, i + CHUNK_SIZE);
    const batch = writeBatch(db);
    for (const ref of chunk) {
      batch.delete(ref);
    }
    try {
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  }
}

export async function ensureUserProfileAndDefaults(user: User): Promise<void> {
  const userPath = `users/${user.uid}`;
  try {
    const userRef = doc(db, 'users', user.uid);
    const snap = await getDoc(userRef);
    if (!snap.exists()) {
      await setDoc(userRef, {
        uid: user.uid,
        displayName: (user.displayName || user.email || 'Usuário').slice(0, 120),
        email: (user.email || 'usuario@local.dev').slice(0, 200),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(userRef, {
        displayName: (user.displayName || user.email || 'Usuário').slice(0, 120),
        email: (user.email || 'usuario@local.dev').slice(0, 200),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, userPath);
  }

  const originsPath = `users/${user.uid}/origins`;
  const categoriesPath = `users/${user.uid}/categories`;

  try {
    const [originsSnap, catsSnap] = await Promise.all([
      getDocs(collection(db, 'users', user.uid, 'origins')),
      getDocs(collection(db, 'users', user.uid, 'categories')),
    ]);

    if (originsSnap.empty || catsSnap.empty) {
      const batch = writeBatch(db);

      if (originsSnap.empty) {
        for (const def of DEFAULT_ORIGINS) {
          const originId = generateSafeId('ori');
          batch.set(doc(db, 'users', user.uid, 'origins', originId), {
            userId: user.uid,
            name: def.name,
            isDefault: def.isDefault,
            createdAt: serverTimestamp(),
          });
        }
      }

      if (catsSnap.empty) {
        for (const def of DEFAULT_CATEGORIES) {
          const catId = generateSafeId('cat');
          batch.set(doc(db, 'users', user.uid, 'categories', catId), {
            userId: user.uid,
            name: def.name,
            type: def.type,
            color: def.color,
            isDefault: def.isDefault,
            createdAt: serverTimestamp(),
          });
        }
      }

      await batch.commit();
    }
  } catch (error) {
    handleFirestoreError(
      error,
      OperationType.WRITE,
      `${originsPath} / ${categoriesPath}`
    );
  }
}

export function subscribeFirestoreData(
  user: User,
  callbacks: {
    onTransactions: (items: Transaction[]) => void;
    onOrigins: (items: Origin[]) => void;
    onCategories: (items: Category[]) => void;
    onError: (err: Error) => void;
  }
): () => void {
  const txPath = `users/${user.uid}/transactions`;
  const originsPath = `users/${user.uid}/origins`;
  const catsPath = `users/${user.uid}/categories`;

  const unsubTx = onSnapshot(
    query(collection(db, 'users', user.uid, 'transactions'), orderBy('date', 'desc')),
    (snapshot) => {
      const items: Transaction[] = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          userId: String(data.userId),
          type: data.type === 'receita' ? 'receita' : 'despesa',
          description: String(data.description),
          amount: Number(data.amount),
          date: String(data.date),
          category: String(data.category),
          origin: String(data.origin),
          status:
            data.status === 'Paga' || data.status === 'Aguardar'
              ? data.status
              : 'Aberta',
          ...(typeof data.notes === 'string' && data.notes.length > 0
            ? { notes: data.notes }
            : {}),
          createdAt: toIsoString(data.createdAt),
          updatedAt: toIsoString(data.updatedAt),
        };
      });
      callbacks.onTransactions(items);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, txPath);
      } catch (wrapped) {
        callbacks.onError(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
      }
    }
  );

  const unsubOrigins = onSnapshot(
    query(collection(db, 'users', user.uid, 'origins'), orderBy('createdAt', 'asc')),
    (snapshot) => {
      const items: Origin[] = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          userId: String(data.userId),
          name: String(data.name),
          isDefault: Boolean(data.isDefault),
          createdAt: toIsoString(data.createdAt),
        };
      });
      callbacks.onOrigins(sortOrigins(items));
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, originsPath);
      } catch (wrapped) {
        callbacks.onError(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
      }
    }
  );

  const unsubCats = onSnapshot(
    query(collection(db, 'users', user.uid, 'categories'), orderBy('createdAt', 'asc')),
    (snapshot) => {
      const items: Category[] = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          userId: String(data.userId),
          name: String(data.name),
          type:
            data.type === 'receita' || data.type === 'despesa'
              ? data.type
              : 'ambos',
          color: String(data.color || '#64748b'),
          isDefault: Boolean(data.isDefault),
          createdAt: toIsoString(data.createdAt),
        };
      });
      callbacks.onCategories(sortCategories(items));
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, catsPath);
      } catch (wrapped) {
        callbacks.onError(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
      }
    }
  );

  return () => {
    unsubTx();
    unsubOrigins();
    unsubCats();
  };
}

export async function loadLocalData(): Promise<{
  transactions: Transaction[];
  origins: Origin[];
  categories: Category[];
}> {
  const { transactions, origins, categories } = await loadAllLocalStores();
  return {
    transactions,
    origins: sortOrigins(origins),
    categories: sortCategories(categories),
  };
}

export async function createTransactionRecord(
  user: User | null,
  payload: NormalizedTransactionPayload
): Promise<Transaction> {
  const id = generateSafeId('tx');
  const now = new Date().toISOString();

  if (user) {
    const docPath = `users/${user.uid}/transactions/${id}`;
    try {
      await setDoc(doc(db, 'users', user.uid, 'transactions', id), {
        userId: user.uid,
        type: payload.type,
        description: payload.description,
        amount: payload.amount,
        date: payload.date,
        category: payload.category,
        origin: payload.origin,
        status: payload.status,
        ...(payload.notes ? { notes: payload.notes } : {}),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, docPath);
    }
  }

  const record: Transaction = {
    id,
    userId: user?.uid ?? 'local',
    ...payload,
    createdAt: now,
    updatedAt: now,
  };

  if (!user) {
    await putLocalTransaction(record);
  }

  return record;
}

export async function updateTransactionRecord(
  user: User | null,
  existing: Transaction,
  payload: NormalizedTransactionPayload
): Promise<Transaction> {
  const now = new Date().toISOString();

  if (user) {
    const docPath = `users/${user.uid}/transactions/${existing.id}`;
    try {
      await updateDoc(doc(db, 'users', user.uid, 'transactions', existing.id), {
        type: payload.type,
        description: payload.description,
        amount: payload.amount,
        date: payload.date,
        category: payload.category,
        origin: payload.origin,
        status: payload.status,
        notes: payload.notes ?? '',
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, docPath);
    }
  }

  const updated: Transaction = {
    ...existing,
    ...payload,
    updatedAt: now,
  };

  if (!user) {
    await putLocalTransaction(updated);
  }

  return updated;
}

export async function updateTransactionStatusRecord(
  user: User | null,
  existing: Transaction,
  status: ExpenseStatus
): Promise<Transaction> {
  const now = new Date().toISOString();

  if (user) {
    const docPath = `users/${user.uid}/transactions/${existing.id}`;
    try {
      await updateDoc(doc(db, 'users', user.uid, 'transactions', existing.id), {
        status,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, docPath);
    }
  }

  const updated: Transaction = {
    ...existing,
    status,
    updatedAt: now,
  };

  if (!user) {
    await putLocalTransaction(updated);
  }

  return updated;
}

export async function deleteTransactionRecord(
  user: User | null,
  transactionId: string
): Promise<void> {
  if (user) {
    const docPath = `users/${user.uid}/transactions/${transactionId}`;
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'transactions', transactionId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, docPath);
    }
  } else {
    await deleteLocalTransaction(transactionId);
  }
}

export async function createOriginRecord(
  user: User | null,
  name: string
): Promise<Origin> {
  const id = generateSafeId('ori');
  const now = new Date().toISOString();

  if (user) {
    const docPath = `users/${user.uid}/origins/${id}`;
    try {
      await setDoc(doc(db, 'users', user.uid, 'origins', id), {
        userId: user.uid,
        name,
        isDefault: false,
        createdAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, docPath);
    }
  }

  const record: Origin = {
    id,
    userId: user?.uid ?? 'local',
    name,
    isDefault: false,
    createdAt: now,
  };

  if (!user) {
    await putLocalOrigin(record);
  }

  return record;
}

export async function deleteOriginRecord(
  user: User | null,
  originId: string
): Promise<void> {
  if (user) {
    const docPath = `users/${user.uid}/origins/${originId}`;
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'origins', originId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, docPath);
    }
  } else {
    await deleteLocalOrigin(originId);
  }
}

export async function createCategoryRecord(
  user: User | null,
  input: { name: string; type: CategoryScope; color: string }
): Promise<Category> {
  const id = generateSafeId('cat');
  const now = new Date().toISOString();

  if (user) {
    const docPath = `users/${user.uid}/categories/${id}`;
    try {
      await setDoc(doc(db, 'users', user.uid, 'categories', id), {
        userId: user.uid,
        name: input.name,
        type: input.type,
        color: input.color,
        isDefault: false,
        createdAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, docPath);
    }
  }

  const record: Category = {
    id,
    userId: user?.uid ?? 'local',
    name: input.name,
    type: input.type,
    color: input.color,
    isDefault: false,
    createdAt: now,
  };

  if (!user) {
    await putLocalCategory(record);
  }

  return record;
}

export async function deleteCategoryRecord(
  user: User | null,
  categoryId: string
): Promise<void> {
  if (user) {
    const docPath = `users/${user.uid}/categories/${categoryId}`;
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'categories', categoryId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, docPath);
    }
  } else {
    await deleteLocalCategory(categoryId);
  }
}

export async function migrateLocalTransactionsToFirestore(
  user: User
): Promise<number> {
  const localTxs = await getAllLocalTransactions();
  if (localTxs.length === 0) return 0;

  const CHUNK_SIZE = 450;
  const colPath = `users/${user.uid}/transactions`;

  for (let i = 0; i < localTxs.length; i += CHUNK_SIZE) {
    const chunk = localTxs.slice(i, i + CHUNK_SIZE);
    const batch = writeBatch(db);
    for (const tx of chunk) {
      batch.set(doc(db, 'users', user.uid, 'transactions', tx.id), {
        userId: user.uid,
        type: tx.type,
        description: tx.description,
        amount: tx.amount,
        date: tx.date,
        category: tx.category,
        origin: tx.origin,
        status: tx.status,
        ...(tx.notes ? { notes: tx.notes } : {}),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
    try {
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, colPath);
    }
  }

  await clearLocalTransactions();
  return localTxs.length;
}

export async function clearAllUserData(
  user: User | null,
  resetCustomDefinitions: boolean
): Promise<{
  transactions: Transaction[];
  origins: Origin[];
  categories: Category[];
}> {
  if (user) {
    const txPath = `users/${user.uid}/transactions`;
    let txDocs;
    try {
      txDocs = await getDocs(collection(db, 'users', user.uid, 'transactions'));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, txPath);
    }
    await commitDeletesInChunks(
      txDocs.docs.map((d) => d.ref),
      txPath
    );

    if (resetCustomDefinitions) {
      const originsPath = `users/${user.uid}/origins`;
      const catsPath = `users/${user.uid}/categories`;
      try {
        const [oriSnap, catSnap] = await Promise.all([
          getDocs(collection(db, 'users', user.uid, 'origins')),
          getDocs(collection(db, 'users', user.uid, 'categories')),
        ]);
        const customOriRefs = oriSnap.docs
          .filter((d) => !d.data().isDefault)
          .map((d) => d.ref);
        const customCatRefs = catSnap.docs
          .filter((d) => !d.data().isDefault)
          .map((d) => d.ref);

        await commitDeletesInChunks(customOriRefs, originsPath);
        await commitDeletesInChunks(customCatRefs, catsPath);
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, originsPath);
      }
    }

    await clearAllLocalData(resetCustomDefinitions);
    return { transactions: [], origins: [], categories: [] };
  }

  await clearAllLocalData(resetCustomDefinitions);
  return loadLocalData();
}
