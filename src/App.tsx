import { onAuthStateChanged, User } from 'firebase/auth';
import { CheckCircle2, Cloud, Database, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CategoriesOriginsManager } from './components/CategoriesOriginsManager';
import { ChartsSection } from './components/ChartsSection';
import { Header } from './components/Header';
import { KpiSummaryGrid } from './components/KpiSummaryGrid';
import {
  DeleteConfirmModal,
  TransactionDetailModal,
  TransactionFormModal,
} from './components/Modals';
import { OriginsSection } from './components/OriginsSection';
import { QuickEntryForms } from './components/QuickEntryForms';
import { TransactionsSection } from './components/TransactionsSection';
import { auth, signInWithGoogle, signOutUser } from './firebase';
import {
  createCategoryRecord,
  createOriginRecord,
  createTransactionRecord,
  deleteCategoryRecord,
  deleteOriginRecord,
  deleteTransactionRecord,
  ensureUserProfileAndDefaults,
  loadLocalData,
  migrateLocalTransactionsToFirestore,
  subscribeFirestoreData,
  updateTransactionRecord,
  updateTransactionStatusRecord,
} from './services/financeRepository';
import {
  Category,
  CategoryScope,
  NavTab,
  Origin,
  Transaction,
  TransactionFilters,
} from './types/finance';
import {
  calculateFinancialSummary,
  createDefaultFilters,
  filterTransactions,
  NormalizedTransactionPayload,
} from './utils/finance';

interface ToastState {
  type: 'success' | 'error';
  message: string;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);

  const [loadingData, setLoadingData] = useState(true);
  const [dbError, setDbError] = useState<string | null>(null);

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [origins, setOrigins] = useState<Origin[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  const [filters, setFilters] = useState<TransactionFilters>(() =>
    createDefaultFilters()
  );

  // Modals
  const [viewingTx, setViewingTx] = useState<Transaction | null>(null);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [creatingModalOpen, setCreatingModalOpen] = useState(false);
  const [deletingTx, setDeletingTx] = useState<Transaction | null>(null);
  const [deletingBusy, setDeletingBusy] = useState(false);

  const [toast, setToast] = useState<ToastState | null>(null);
  const lastSubmissionRef = useRef<{ signature: string; time: number } | null>(
    null
  );

  const showToast = useCallback((type: 'success' | 'error', message: string) => {
    setToast({ type, message });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 4000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  // Listen to Firebase Auth state
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setAuthReady(true);
    });
    return () => unsub();
  }, []);

  // Load either Cloud Firestore (when signed in) or IndexedDB (local database)
  useEffect(() => {
    if (!authReady) return;

    let cancelled = false;
    let unsubFirestore: (() => void) | null = null;

    async function initData() {
      setLoadingData(true);
      setDbError(null);

      if (user) {
        try {
          await ensureUserProfileAndDefaults(user);
          const migratedCount = await migrateLocalTransactionsToFirestore(user);
          if (migratedCount > 0 && !cancelled) {
            showToast(
              'success',
              `${migratedCount} movimentação(ões) locais sincronizadas com a nuvem.`
            );
          }

          if (cancelled) return;
          unsubFirestore = subscribeFirestoreData(user, {
            onTransactions: (items) => {
              setTransactions(items);
              setLoadingData(false);
            },
            onOrigins: (items) => setOrigins(items),
            onCategories: (items) => setCategories(items),
            onError: (err) => {
              setDbError(err.message);
              setLoadingData(false);
            },
          });
        } catch (err) {
          if (!cancelled) {
            setDbError(
              err instanceof Error
                ? err.message
                : 'Erro ao conectar com o Firestore.'
            );
            setLoadingData(false);
          }
        }
      } else {
        try {
          const local = await loadLocalData();
          if (!cancelled) {
            setTransactions(local.transactions);
            setOrigins(local.origins);
            setCategories(local.categories);
            setLoadingData(false);
          }
        } catch (err) {
          if (!cancelled) {
            setDbError(
              err instanceof Error
                ? err.message
                : 'Erro ao carregar o banco de dados local.'
            );
            setLoadingData(false);
          }
        }
      }
    }

    initData();

    return () => {
      cancelled = true;
      if (unsubFirestore) unsubFirestore();
    };
  }, [authReady, user, showToast]);

  const summary = useMemo(
    () => calculateFinancialSummary(transactions, origins),
    [transactions, origins]
  );

  const filteredTransactions = useMemo(
    () => filterTransactions(transactions, filters),
    [transactions, filters]
  );

  const handleSignIn = async () => {
    setAuthLoading(true);
    try {
      await signInWithGoogle();
      showToast('success', 'Conectado com sucesso ao Firebase.');
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Falha ao autenticar com Google.';
      showToast('error', msg);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOutUser();
      showToast('success', 'Sessão encerrada.');
    } catch (err) {
      showToast(
        'error',
        err instanceof Error ? err.message : 'Erro ao sair da conta.'
      );
    }
  };

  const handleCreateTransaction = async (
    payload: NormalizedTransactionPayload
  ) => {
    const signature = `${payload.type}|${payload.description.toLowerCase()}|${payload.amount}|${payload.date}|${payload.origin}`;
    const nowMs = Date.now();
    if (
      lastSubmissionRef.current &&
      lastSubmissionRef.current.signature === signature &&
      nowMs - lastSubmissionRef.current.time < 2500
    ) {
      showToast(
        'error',
        'Movimentação duplicada detectada. Aguarde um instante.'
      );
      return;
    }
    lastSubmissionRef.current = { signature, time: nowMs };

    const created = await createTransactionRecord(user, payload);
    if (!user) {
      setTransactions((prev) => [created, ...prev]);
    }
    showToast(
      'success',
      payload.type === 'receita'
        ? 'Receita salva com sucesso.'
        : 'Despesa salva com sucesso.'
    );
  };

  const handleSaveModalTransaction = async (
    payload: NormalizedTransactionPayload,
    existing: Transaction | null
  ) => {
    if (existing) {
      const updated = await updateTransactionRecord(user, existing, payload);
      if (!user) {
        setTransactions((prev) =>
          prev.map((item) => (item.id === existing.id ? updated : item))
        );
      }
      showToast('success', 'Movimentação atualizada.');
    } else {
      await handleCreateTransaction(payload);
    }
  };

  const handleMarkAsPaid = async (tx: Transaction) => {
    try {
      const updated = await updateTransactionStatusRecord(user, tx, 'Paga');
      if (!user) {
        setTransactions((prev) =>
          prev.map((item) => (item.id === tx.id ? updated : item))
        );
      }
      showToast('success', `'${tx.description}' marcada como paga.`);
    } catch (err) {
      showToast(
        'error',
        err instanceof Error ? err.message : 'Erro ao atualizar status.'
      );
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingTx || deletingBusy) return;
    setDeletingBusy(true);
    try {
      await deleteTransactionRecord(user, deletingTx.id);
      if (!user) {
        setTransactions((prev) =>
          prev.filter((item) => item.id !== deletingTx.id)
        );
      }
      showToast('success', 'Movimentação excluída.');
      setDeletingTx(null);
    } catch (err) {
      showToast(
        'error',
        err instanceof Error ? err.message : 'Erro ao excluir movimentação.'
      );
    } finally {
      setDeletingBusy(false);
    }
  };

  const handleAddOrigin = async (name: string) => {
    const created = await createOriginRecord(user, name);
    if (!user) {
      setOrigins((prev) => [...prev, created]);
    }
    showToast('success', `Banco '${name}' adicionado.`);
  };

  const handleDeleteOrigin = async (id: string) => {
    try {
      await deleteOriginRecord(user, id);
      if (!user) {
        setOrigins((prev) => prev.filter((o) => o.id !== id));
      }
      showToast('success', 'Origem removida.');
    } catch (err) {
      showToast(
        'error',
        err instanceof Error ? err.message : 'Erro ao remover origem.'
      );
    }
  };

  const handleAddCategory = async (input: {
    name: string;
    type: CategoryScope;
    color: string;
  }) => {
    const created = await createCategoryRecord(user, input);
    if (!user) {
      setCategories((prev) => [...prev, created]);
    }
    showToast('success', `Categoria '${input.name}' criada.`);
  };

  const handleDeleteCategory = async (id: string) => {
    try {
      await deleteCategoryRecord(user, id);
      if (!user) {
        setCategories((prev) => prev.filter((c) => c.id !== id));
      }
      showToast('success', 'Categoria removida.');
    } catch (err) {
      showToast(
        'error',
        err instanceof Error ? err.message : 'Erro ao remover categoria.'
      );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 selection:bg-emerald-200 flex flex-col">
      <Header
        activeTab={activeTab}
        onTabChange={setActiveTab}
        user={user}
        authLoading={authLoading}
        onSignIn={handleSignIn}
        onSignOut={handleSignOut}
      />

      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1">
        {/* Storage / Cloud Sync Banner */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-white border border-slate-200 rounded-xl px-4 py-3 text-xs text-slate-600 shadow-sm">
          <div className="flex items-center gap-2">
            {user ? (
              <>
                <Cloud
                  className="w-4 h-4 text-emerald-600 shrink-0"
                  aria-hidden="true"
                />
                <span>
                  Sincronizado em tempo real com{' '}
                  <strong className="text-slate-900">Firebase Firestore</strong>{' '}
                  ({user.email})
                </span>
              </>
            ) : (
              <>
                <Database
                  className="w-4 h-4 text-slate-600 shrink-0"
                  aria-hidden="true"
                />
                <span>
                  Armazenamento local persistente ativo (IndexedDB).{' '}
                  <button
                    type="button"
                    onClick={handleSignIn}
                    className="font-semibold text-slate-900 underline hover:text-emerald-700 cursor-pointer"
                  >
                    Entre com Google
                  </button>{' '}
                  para sincronizar na nuvem.
                </span>
              </>
            )}
          </div>
          <span className="text-slate-500 tabular-nums shrink-0">
            {transactions.length} movimentações salvas
          </span>
        </div>

        {dbError && (
          <div
            role="alert"
            className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-center justify-between gap-4"
          >
            <span>Erro no banco de dados: {dbError}</span>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-3 py-1 bg-red-600 text-white rounded-md text-xs font-medium hover:bg-red-700 shrink-0"
            >
              Tentar novamente
            </button>
          </div>
        )}

        {loadingData ? (
          <div
            aria-label="Carregando dados financeiros"
            className="space-y-6 animate-pulse"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-36 bg-white border border-slate-200 rounded-xl"
                />
              ))}
            </div>
            <div className="h-64 bg-white border border-slate-200 rounded-xl" />
          </div>
        ) : (
          <>
            {activeTab === 'dashboard' && (
              <>
                <KpiSummaryGrid summary={summary} />

                <OriginsSection
                  origins={origins}
                  originBalances={summary.originBalances}
                  onAddOrigin={handleAddOrigin}
                />

                <QuickEntryForms
                  origins={origins}
                  categories={categories}
                  onCreateTransaction={handleCreateTransaction}
                />

                <div className="mb-8">
                  <TransactionsSection
                    transactions={transactions}
                    filteredTransactions={filteredTransactions}
                    filters={filters}
                    categories={categories}
                    origins={origins}
                    onFiltersChange={setFilters}
                    onResetFilters={() => setFilters(createDefaultFilters())}
                    onViewTransaction={setViewingTx}
                    onEditTransaction={setEditingTx}
                    onDeleteRequest={setDeletingTx}
                    onMarkAsPaid={handleMarkAsPaid}
                    compact
                  />
                </div>

                <ChartsSection
                  transactions={transactions}
                  categories={categories}
                  summary={summary}
                />
              </>
            )}

            {activeTab === 'movimentacoes' && (
              <div className="space-y-6">
                <KpiSummaryGrid summary={summary} />
                <TransactionsSection
                  transactions={transactions}
                  filteredTransactions={filteredTransactions}
                  filters={filters}
                  categories={categories}
                  origins={origins}
                  onFiltersChange={setFilters}
                  onResetFilters={() => setFilters(createDefaultFilters())}
                  onViewTransaction={setViewingTx}
                  onEditTransaction={setEditingTx}
                  onDeleteRequest={setDeletingTx}
                  onMarkAsPaid={handleMarkAsPaid}
                  onOpenNewModal={() => setCreatingModalOpen(true)}
                />
              </div>
            )}

            {activeTab === 'relatorios' && (
              <div className="space-y-6">
                <KpiSummaryGrid summary={summary} />
                <ChartsSection
                  transactions={transactions}
                  categories={categories}
                  summary={summary}
                />
              </div>
            )}

            {activeTab === 'categorias' && (
              <CategoriesOriginsManager
                categories={categories}
                origins={origins}
                originBalances={summary.originBalances}
                onAddCategory={handleAddCategory}
                onDeleteCategory={handleDeleteCategory}
                onAddOrigin={handleAddOrigin}
                onDeleteOrigin={handleDeleteOrigin}
              />
            )}
          </>
        )}
      </main>

      {/* Modals */}
      {viewingTx && (
        <TransactionDetailModal
          transaction={viewingTx}
          onClose={() => setViewingTx(null)}
          onEdit={(tx) => setEditingTx(tx)}
        />
      )}

      {(editingTx || creatingModalOpen) && (
        <TransactionFormModal
          initialTransaction={editingTx}
          origins={origins}
          categories={categories}
          onClose={() => {
            setEditingTx(null);
            setCreatingModalOpen(false);
          }}
          onSubmit={handleSaveModalTransaction}
        />
      )}

      {deletingTx && (
        <DeleteConfirmModal
          transaction={deletingTx}
          deleting={deletingBusy}
          onCancel={() => setDeletingTx(null)}
          onConfirm={handleConfirmDelete}
        />
      )}

      {/* Toast feedback */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed bottom-4 right-4 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium ${
            toast.type === 'success'
              ? 'bg-slate-900 text-white border-slate-800'
              : 'bg-red-600 text-white border-red-700'
          }`}
        >
          <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>{toast.message}</span>
          <button
            type="button"
            onClick={() => setToast(null)}
            aria-label="Fechar notificação"
            className="ml-1 opacity-75 hover:opacity-100 cursor-pointer"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  );
}
