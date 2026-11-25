import { AlertTriangle, Lock, X } from 'lucide-react';
import { FormEvent, useState } from 'react';
import {
  Category,
  ExpenseStatus,
  Origin,
  Transaction,
  TransactionType,
} from '../types/finance';
import {
  formatBRL,
  formatDateBR,
  getTodayISO,
  NormalizedTransactionPayload,
  validateTransactionInput,
  verifyClearDataPassword,
} from '../utils/finance';

export function TransactionDetailModal({
  transaction,
  onClose,
  onEdit,
}: {
  transaction: Transaction;
  onClose: () => void;
  onEdit: (tx: Transaction) => void;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="detail-modal-title"
      className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4"
    >
      <div className="bg-white rounded-xl border border-slate-200 shadow-lg max-w-md w-full p-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              {transaction.type === 'receita' ? 'Receita' : 'Despesa'}
            </p>
            <h3
              id="detail-modal-title"
              className="text-lg font-semibold text-slate-900 mt-0.5"
            >
              {transaction.description}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar detalhes"
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-md cursor-pointer"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <dl className="divide-y divide-slate-100 text-sm">
          <div className="py-2.5 flex justify-between gap-4">
            <dt className="text-slate-500">Valor</dt>
            <dd
              className={`font-semibold tabular-nums ${
                transaction.type === 'receita'
                  ? 'text-emerald-600'
                  : 'text-slate-900'
              }`}
            >
              {transaction.type === 'receita' ? '+' : '-'}
              {formatBRL(transaction.amount)}
            </dd>
          </div>
          <div className="py-2.5 flex justify-between gap-4">
            <dt className="text-slate-500">Data</dt>
            <dd className="text-slate-900 tabular-nums">
              {formatDateBR(transaction.date)}
            </dd>
          </div>
          <div className="py-2.5 flex justify-between gap-4">
            <dt className="text-slate-500">Categoria</dt>
            <dd className="text-slate-900">{transaction.category}</dd>
          </div>
          <div className="py-2.5 flex justify-between gap-4">
            <dt className="text-slate-500">
              {transaction.type === 'receita' ? 'Destino' : 'Origem'}
            </dt>
            <dd className="text-slate-900">{transaction.origin}</dd>
          </div>
          <div className="py-2.5 flex justify-between gap-4">
            <dt className="text-slate-500">Status</dt>
            <dd className="text-slate-900 font-medium">
              {transaction.type === 'receita' ? 'Recebida' : transaction.status}
            </dd>
          </div>
          {transaction.notes && (
            <div className="py-2.5">
              <dt className="text-slate-500 mb-1">Observações</dt>
              <dd className="text-slate-700 text-xs leading-relaxed">
                {transaction.notes}
              </dd>
            </div>
          )}
        </dl>

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer"
          >
            Fechar
          </button>
          <button
            type="button"
            onClick={() => {
              onClose();
              onEdit(transaction);
            }}
            className="px-4 py-2 text-sm font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 cursor-pointer"
          >
            Editar movimentação
          </button>
        </div>
      </div>
    </div>
  );
}

export function TransactionFormModal({
  initialTransaction,
  origins,
  categories,
  onClose,
  onSubmit,
}: {
  initialTransaction: Transaction | null;
  origins: Origin[];
  categories: Category[];
  onClose: () => void;
  onSubmit: (
    payload: NormalizedTransactionPayload,
    existing: Transaction | null
  ) => Promise<void>;
}) {
  const isEditing = initialTransaction !== null;

  const [type, setType] = useState<TransactionType>(
    initialTransaction?.type ?? 'despesa'
  );
  const [description, setDescription] = useState(
    initialTransaction?.description ?? ''
  );
  const [amount, setAmount] = useState(
    initialTransaction ? String(initialTransaction.amount) : ''
  );
  const [date, setDate] = useState(initialTransaction?.date ?? getTodayISO());
  const [category, setCategory] = useState(
    initialTransaction?.category ?? categories[0]?.name ?? 'Moradia'
  );
  const [origin, setOrigin] = useState(
    initialTransaction?.origin ?? origins[0]?.name ?? 'Itaú'
  );
  const [status, setStatus] = useState<ExpenseStatus>(
    initialTransaction?.status ?? 'Aberta'
  );
  const [notes, setNotes] = useState(initialTransaction?.notes ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const availableCategories = categories.filter(
    (c) => c.type === type || c.type === 'ambos'
  );

  const handleTypeChange = (nextType: TransactionType) => {
    setType(nextType);
    const matching = categories.filter(
      (c) => c.type === nextType || c.type === 'ambos'
    );
    if (matching.length > 0 && !matching.some((c) => c.name === category)) {
      setCategory(matching[0].name);
    }
    if (nextType === 'receita') {
      setStatus('Paga');
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    const validation = validateTransactionInput({
      type,
      description,
      amount,
      date,
      category,
      origin,
      status,
      notes,
    });

    if (!validation.valid || !validation.data) {
      setErrors(validation.errors);
      return;
    }

    setSubmitting(true);
    setErrors({});
    try {
      await onSubmit(validation.data, initialTransaction);
      onClose();
    } catch (err) {
      setErrors({
        form:
          err instanceof Error
            ? err.message
            : 'Não foi possível salvar a movimentação.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="form-modal-title"
      className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4"
    >
      <div className="bg-white rounded-xl border border-slate-200 shadow-lg max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3
            id="form-modal-title"
            className="text-lg font-semibold text-slate-900"
          >
            {isEditing ? 'Editar Movimentação' : 'Nova Movimentação'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar formulário"
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-md cursor-pointer"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Tipo de movimentação
            </label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-lg">
              <button
                type="button"
                onClick={() => handleTypeChange('receita')}
                className={`py-2 text-sm font-medium rounded-md transition-colors cursor-pointer ${
                  type === 'receita'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-700 hover:text-slate-900'
                }`}
              >
                Receita
              </button>
              <button
                type="button"
                onClick={() => handleTypeChange('despesa')}
                className={`py-2 text-sm font-medium rounded-md transition-colors cursor-pointer ${
                  type === 'despesa'
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-700 hover:text-slate-900'
                }`}
              >
                Despesa
              </button>
            </div>
          </div>

          <div>
            <label
              htmlFor="modal-description"
              className="block text-sm font-medium text-slate-700 mb-1"
            >
              Descrição
            </label>
            <input
              id="modal-description"
              type="text"
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                setErrors((p) => ({ ...p, description: '' }));
              }}
              maxLength={120}
              className="w-full border border-slate-300 rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
            {errors.description && (
              <p role="alert" className="text-xs text-red-600 mt-1">
                {errors.description}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="modal-amount"
                className="block text-sm font-medium text-slate-700 mb-1"
              >
                Valor (R$)
              </label>
              <input
                id="modal-amount"
                type="number"
                step="0.01"
                min="0.01"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  setErrors((p) => ({ ...p, amount: '' }));
                }}
                className="w-full border border-slate-300 rounded-md p-2 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
              {errors.amount && (
                <p role="alert" className="text-xs text-red-600 mt-1">
                  {errors.amount}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="modal-date"
                className="block text-sm font-medium text-slate-700 mb-1"
              >
                {type === 'receita' ? 'Data' : 'Vencimento'}
              </label>
              <input
                id="modal-date"
                type="date"
                value={date}
                onChange={(e) => {
                  setDate(e.target.value);
                  setErrors((p) => ({ ...p, date: '' }));
                }}
                className="w-full border border-slate-300 rounded-md p-2 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
              {errors.date && (
                <p role="alert" className="text-xs text-red-600 mt-1">
                  {errors.date}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="modal-category"
                className="block text-sm font-medium text-slate-700 mb-1"
              >
                Categoria
              </label>
              <select
                id="modal-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full border border-slate-300 rounded-md p-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
              >
                {(availableCategories.length > 0
                  ? availableCategories
                  : categories
                ).map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="modal-origin"
                className="block text-sm font-medium text-slate-700 mb-1"
              >
                {type === 'receita' ? 'Destino' : 'Origem'}
              </label>
              <select
                id="modal-origin"
                value={origin}
                onChange={(e) => setOrigin(e.target.value)}
                className="w-full border border-slate-300 rounded-md p-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
              >
                {origins.map((o) => (
                  <option key={o.id} value={o.name}>
                    {o.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {type === 'despesa' && (
            <div>
              <label
                htmlFor="modal-status"
                className="block text-sm font-medium text-slate-700 mb-1"
              >
                Status
              </label>
              <select
                id="modal-status"
                value={status}
                onChange={(e) => setStatus(e.target.value as ExpenseStatus)}
                className="w-full border border-slate-300 rounded-md p-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
              >
                <option value="Aberta">Aberta</option>
                <option value="Aguardar">Aguardar</option>
                <option value="Paga">Paga</option>
              </select>
            </div>
          )}

          <div>
            <label
              htmlFor="modal-notes"
              className="block text-sm font-medium text-slate-700 mb-1"
            >
              Observações (opcional)
            </label>
            <textarea
              id="modal-notes"
              rows={2}
              maxLength={500}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Detalhes adicionais sobre esta movimentação..."
              className="w-full border border-slate-300 rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>

          {errors.form && (
            <p role="alert" className="text-xs text-red-600">
              {errors.form}
            </p>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 text-sm font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 disabled:opacity-60 cursor-pointer"
            >
              {submitting
                ? 'Salvando...'
                : isEditing
                  ? 'Salvar Alterações'
                  : 'Cadastrar Movimentação'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function DeleteConfirmModal({
  transaction,
  deleting,
  onCancel,
  onConfirm,
}: {
  transaction: Transaction;
  deleting: boolean;
  onCancel: () => void;
  onConfirm: () => Promise<void>;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-modal-title"
      className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4"
    >
      <div className="bg-white rounded-xl border border-slate-200 shadow-lg max-w-md w-full p-6">
        <div className="flex items-start gap-3 mb-4">
          <div className="p-2 bg-red-50 text-red-600 rounded-lg shrink-0">
            <AlertTriangle className="w-5 h-5" aria-hidden="true" />
          </div>
          <div>
            <h3
              id="delete-modal-title"
              className="text-base font-semibold text-slate-900"
            >
              Confirmar exclusão
            </h3>
            <p className="text-sm text-slate-600 mt-1">
              Deseja realmente excluir{' '}
              <strong className="text-slate-900">
                {transaction.description}
              </strong>{' '}
              ({formatBRL(transaction.amount)} ·{' '}
              {formatDateBR(transaction.date)})? Esta ação atualizará seus
              saldos e relatórios automaticamente.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={deleting}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={deleting}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-60 cursor-pointer"
          >
            {deleting ? 'Excluindo...' : 'Excluir movimentação'}
          </button>
        </div>
      </div>
    </div>
  );
}

export function ClearDataModal({
  transactionCount,
  clearing,
  onCancel,
  onConfirm,
}: {
  transactionCount: number;
  clearing: boolean;
  onCancel: () => void;
  onConfirm: (resetCustomDefinitions: boolean) => Promise<void>;
}) {
  const [password, setPassword] = useState('');
  const [resetCustomDefinitions, setResetCustomDefinitions] = useState(true);
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (clearing) return;

    if (!verifyClearDataPassword(password)) {
      setError('Senha incorreta. Digite a senha correta para limpar os dados.');
      return;
    }

    setError('');
    try {
      await onConfirm(resetCustomDefinitions);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Não foi possível limpar os dados do banco.'
      );
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="clear-data-modal-title"
      className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4"
    >
      <div className="bg-white rounded-xl border border-slate-200 shadow-lg max-w-md w-full p-6">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-red-50 text-red-600 rounded-lg shrink-0">
              <Lock className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <h3
                id="clear-data-modal-title"
                className="text-base font-semibold text-slate-900"
              >
                Limpar dados do sistema
              </h3>
              <p className="text-sm text-slate-600 mt-1">
                Esta ação apagará permanentemente{' '}
                <strong className="text-slate-900">
                  {transactionCount} movimentação(ões)
                </strong>{' '}
                armazenada(s) no banco de dados.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onCancel}
            disabled={clearing}
            aria-label="Fechar confirmação de limpeza"
            className="p-1 text-slate-400 hover:text-slate-700 rounded cursor-pointer"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <label className="flex items-start gap-2.5 text-xs text-slate-700 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={resetCustomDefinitions}
              onChange={(e) => setResetCustomDefinitions(e.target.checked)}
              className="mt-0.5 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
            />
            <span>
              Também remover bancos e categorias personalizados (mantendo os
              padrões iniciais)
            </span>
          </label>

          <div>
            <label
              htmlFor="clear-data-password"
              className="block text-sm font-medium text-slate-700 mb-1"
            >
              Senha de confirmação
            </label>
            <input
              id="clear-data-password"
              type="password"
              inputMode="numeric"
              autoComplete="off"
              autoFocus
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (error) setError('');
              }}
              placeholder="Digite a senha"
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-red-600"
            />
            {error && (
              <p role="alert" className="text-xs text-red-600 mt-1.5">
                {error}
              </p>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={onCancel}
              disabled={clearing}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={clearing}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-60 cursor-pointer"
            >
              {clearing ? 'Limpando...' : 'Confirmar limpeza'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

