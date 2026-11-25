import {
  CheckCircle2,
  Clock,
  Download,
  Eye,
  FilterX,
  Pencil,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import { memo, useEffect, useState } from 'react';
import {
  Category,
  ExpenseStatus,
  Origin,
  Transaction,
  TransactionFilters,
} from '../types/finance';
import {
  formatBRL,
  formatDateBR,
  getTodayISO,
  transactionsToCSV,
} from '../utils/finance';

interface TransactionsSectionProps {
  transactions: Transaction[];
  filteredTransactions: Transaction[];
  filters: TransactionFilters;
  categories: Category[];
  origins: Origin[];
  onFiltersChange: (next: TransactionFilters) => void;
  onResetFilters: () => void;
  onViewTransaction: (tx: Transaction) => void;
  onEditTransaction: (tx: Transaction) => void;
  onDeleteRequest: (tx: Transaction) => void;
  onMarkAsPaid: (tx: Transaction) => Promise<void>;
  onOpenNewModal?: () => void;
  compact?: boolean;
}

const STATUS_TABS: Array<{ id: 'all' | ExpenseStatus; label: string }> = [
  { id: 'all', label: 'Todas' },
  { id: 'Aberta', label: 'Abertas' },
  { id: 'Aguardar', label: 'Aguardar' },
  { id: 'Paga', label: 'Pagas' },
];

const PAGE_SIZE = 25;

export const TransactionsSection = memo(function TransactionsSection({
  transactions,
  filteredTransactions,
  filters,
  categories,
  origins,
  onFiltersChange,
  onResetFilters,
  onViewTransaction,
  onEditTransaction,
  onDeleteRequest,
  onMarkAsPaid,
  onOpenNewModal,
  compact = false,
}: TransactionsSectionProps) {
  const [visibleLimit, setVisibleLimit] = useState(PAGE_SIZE);

  useEffect(() => {
    setVisibleLimit(PAGE_SIZE);
  }, [
    filters.search,
    filters.type,
    filters.status,
    filters.category,
    filters.origin,
    filters.dateStart,
    filters.dateEnd,
  ]);

  const displayedTransactions = filteredTransactions.slice(0, visibleLimit);
  const hasMore = filteredTransactions.length > visibleLimit;

  const hasActiveFilters =
    filters.search !== '' ||
    filters.type !== 'all' ||
    filters.status !== 'all' ||
    filters.category !== 'all' ||
    filters.origin !== 'all' ||
    filters.dateStart !== '' ||
    filters.dateEnd !== '';

  const applyCurrentMonthPreset = () => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const lastDay = new Date(y, now.getMonth() + 1, 0).getDate();
    onFiltersChange({
      ...filters,
      dateStart: `${y}-${m}-01`,
      dateEnd: `${y}-${m}-${String(lastDay).padStart(2, '0')}`,
    });
  };

  const applyLast30DaysPreset = () => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 30);
    onFiltersChange({
      ...filters,
      dateStart: getTodayISO(start),
      dateEnd: getTodayISO(end),
    });
  };

  const handleExportCSV = () => {
    const csv = transactionsToCSV(filteredTransactions);
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `controle-financeiro-${getTodayISO()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const renderStatusText = (tx: Transaction) => {
    if (tx.type === 'receita') {
      return (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
          <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
          Receita
        </span>
      );
    }
    if (tx.status === 'Paga') {
      return (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
          <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
          Paga
        </span>
      );
    }
    if (tx.status === 'Aguardar') {
      return (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700">
          <Clock className="w-3.5 h-3.5" aria-hidden="true" />
          Aguardar
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-orange-700">
        <Clock className="w-3.5 h-3.5" aria-hidden="true" />
        Aberta
      </span>
    );
  };

  return (
    <section
      aria-label="Histórico e Despesas"
      className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden"
    >
      {/* Header + Status Tabs */}
      <div className="p-4 border-b border-slate-200 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-slate-50">
        <div className="flex items-center gap-3 flex-wrap">
          <h2 className="text-lg font-semibold text-slate-900">
            Histórico e Despesas
          </h2>
          <span className="text-xs text-slate-500 tabular-nums">
            {filteredTransactions.length} de {transactions.length} registros
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto justify-between lg:justify-end">
          <div
            role="group"
            aria-label="Filtrar por status"
            className="flex bg-slate-200 p-1 rounded-lg overflow-x-auto"
          >
            {STATUS_TABS.map((tab) => {
              const active = filters.status === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() =>
                    onFiltersChange({ ...filters, status: tab.id })
                  }
                  className={`px-3.5 py-1.5 text-sm font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    active
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            {filteredTransactions.length > 0 && (
              <button
                type="button"
                onClick={handleExportCSV}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" aria-hidden="true" />
                Exportar CSV
              </button>
            )}
            {onOpenNewModal && (
              <button
                type="button"
                onClick={onOpenNewModal}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-slate-900 rounded-md hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                Nova Movimentação
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Search and Advanced Filters */}
      <div className="p-4 border-b border-slate-200 bg-white space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          <div className="sm:col-span-2">
            <label htmlFor="tx-search" className="sr-only">
              Pesquisar por descrição
            </label>
            <div className="relative">
              <Search
                className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                aria-hidden="true"
              />
              <input
                id="tx-search"
                type="search"
                value={filters.search}
                onChange={(e) =>
                  onFiltersChange({ ...filters, search: e.target.value })
                }
                placeholder="Pesquisar por descrição..."
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>
          </div>

          <div>
            <label htmlFor="tx-filter-type" className="sr-only">
              Filtrar por tipo
            </label>
            <select
              id="tx-filter-type"
              aria-label="Filtrar por tipo"
              value={filters.type}
              onChange={(e) =>
                onFiltersChange({
                  ...filters,
                  type: e.target.value as TransactionFilters['type'],
                })
              }
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
            >
              <option value="all">Receitas e Despesas</option>
              <option value="receita">Apenas Receitas</option>
              <option value="despesa">Apenas Despesas</option>
            </select>
          </div>

          <div>
            <label htmlFor="tx-filter-category" className="sr-only">
              Filtrar por categoria
            </label>
            <select
              id="tx-filter-category"
              aria-label="Filtrar por categoria"
              value={filters.category}
              onChange={(e) =>
                onFiltersChange({ ...filters, category: e.target.value })
              }
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
            >
              <option value="all">Todas as categorias</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.name}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {!compact && (
            <div>
              <label htmlFor="tx-filter-origin" className="sr-only">
                Filtrar por origem
              </label>
              <select
                id="tx-filter-origin"
                aria-label="Filtrar por origem"
                value={filters.origin}
                onChange={(e) =>
                  onFiltersChange({ ...filters, origin: e.target.value })
                }
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
              >
                <option value="all">Todas as origens</option>
                {origins.map((ori) => (
                  <option key={ori.id} value={ori.name}>
                    {ori.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className={compact ? 'sm:col-span-2 flex items-center gap-2' : 'flex items-center gap-2'}>
            <input
              id="tx-filter-start"
              type="date"
              aria-label="Data inicial"
              title="Data inicial"
              value={filters.dateStart}
              onChange={(e) =>
                onFiltersChange({ ...filters, dateStart: e.target.value })
              }
              className="w-full min-w-0 px-2 py-2 text-xs border border-slate-300 rounded-md tabular-nums focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
            <span className="text-slate-400 text-xs shrink-0">até</span>
            <input
              id="tx-filter-end"
              type="date"
              aria-label="Data final"
              title="Data final"
              value={filters.dateEnd}
              onChange={(e) =>
                onFiltersChange({ ...filters, dateEnd: e.target.value })
              }
              className="w-full min-w-0 px-2 py-2 text-xs border border-slate-300 rounded-md tabular-nums focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-slate-500">Período rápido:</span>
            <button
              type="button"
              onClick={applyCurrentMonthPreset}
              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded transition-colors cursor-pointer"
            >
              Este mês
            </button>
            <button
              type="button"
              onClick={applyLast30DaysPreset}
              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded transition-colors cursor-pointer"
            >
              Últimos 30 dias
            </button>
          </div>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={onResetFilters}
              className="inline-flex items-center gap-1 text-slate-600 hover:text-slate-900 font-medium cursor-pointer"
            >
              <FilterX className="w-3.5 h-3.5" aria-hidden="true" />
              Limpar filtros
            </button>
          )}
        </div>
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-white border-b border-slate-200 text-xs uppercase text-slate-500">
              <th className="p-4 font-semibold text-slate-500">Data</th>
              <th className="p-4 font-semibold text-slate-500">
                Descrição / Categoria
              </th>
              <th className="p-4 font-semibold text-slate-500">Valor</th>
              <th className="p-4 font-semibold text-slate-500">
                Origem / Status
              </th>
              <th className="p-4 font-semibold text-slate-500 text-right">
                Ações
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredTransactions.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-slate-500">
                  {transactions.length === 0
                    ? 'Nenhuma transação encontrada.'
                    : 'Nenhuma movimentação corresponde aos filtros selecionados.'}
                </td>
              </tr>
            ) : (
              displayedTransactions.map((tx) => (
                <tr
                  key={tx.id}
                  className="hover:bg-slate-50/80 transition-colors"
                >
                  <td className="p-4 text-sm text-slate-600 tabular-nums whitespace-nowrap">
                    {formatDateBR(tx.date)}
                  </td>
                  <td className="p-4">
                    <p className="text-sm font-medium text-slate-900">
                      {tx.description}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {tx.category}
                      <span aria-hidden="true"> · </span>
                      {tx.type === 'receita' ? 'Receita' : 'Despesa'}
                    </p>
                  </td>
                  <td className="p-4 whitespace-nowrap">
                    <span
                      className={`text-sm font-semibold tabular-nums ${
                        tx.type === 'receita'
                          ? 'text-emerald-600'
                          : 'text-slate-900'
                      }`}
                    >
                      {tx.type === 'receita' ? '+' : '-'}
                      {formatBRL(tx.amount)}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="text-xs text-slate-700 font-medium">
                      {tx.origin}
                    </div>
                    <div className="mt-0.5">{renderStatusText(tx)}</div>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => onViewTransaction(tx)}
                        aria-label={`Visualizar '${tx.description}'`}
                        title="Visualizar detalhes"
                        className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                      >
                        <Eye className="w-4 h-4" aria-hidden="true" />
                      </button>

                      {tx.type === 'despesa' && tx.status !== 'Paga' && (
                        <button
                          type="button"
                          onClick={() => onMarkAsPaid(tx)}
                          aria-label={`Marcar '${tx.description}' como paga`}
                          title="Marcar como Paga"
                          className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors cursor-pointer"
                        >
                          <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => onEditTransaction(tx)}
                        aria-label={`Editar '${tx.description}'`}
                        title="Editar"
                        className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors cursor-pointer"
                      >
                        <Pencil className="w-4 h-4" aria-hidden="true" />
                      </button>

                      <button
                        type="button"
                        onClick={() => onDeleteRequest(tx)}
                        aria-label={`Excluir '${tx.description}'`}
                        title="Excluir"
                        className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" aria-hidden="true" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards List */}
      <div className="md:hidden divide-y divide-slate-100">
        {filteredTransactions.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">
            {transactions.length === 0
              ? 'Nenhuma transação encontrada.'
              : 'Nenhuma movimentação corresponde aos filtros selecionados.'}
          </div>
        ) : (
          displayedTransactions.map((tx) => (
            <div key={tx.id} className="p-4 space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate">
                    {tx.description}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {formatDateBR(tx.date)} · {tx.category} · {tx.origin}
                  </p>
                </div>
                <span
                  className={`text-sm font-semibold tabular-nums shrink-0 ${
                    tx.type === 'receita'
                      ? 'text-emerald-600'
                      : 'text-slate-900'
                  }`}
                >
                  {tx.type === 'receita' ? '+' : '-'}
                  {formatBRL(tx.amount)}
                </span>
              </div>

              <div className="flex items-center justify-between pt-1">
                {renderStatusText(tx)}
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => onViewTransaction(tx)}
                    aria-label={`Visualizar '${tx.description}'`}
                    className="p-2 text-slate-500 hover:text-slate-900 rounded-md"
                  >
                    <Eye className="w-4 h-4" aria-hidden="true" />
                  </button>
                  {tx.type === 'despesa' && tx.status !== 'Paga' && (
                    <button
                      type="button"
                      onClick={() => onMarkAsPaid(tx)}
                      aria-label={`Marcar '${tx.description}' como paga`}
                      className="p-2 text-slate-500 hover:text-emerald-600 rounded-md"
                    >
                      <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => onEditTransaction(tx)}
                    aria-label={`Editar '${tx.description}'`}
                    className="p-2 text-slate-500 hover:text-blue-600 rounded-md"
                  >
                    <Pencil className="w-4 h-4" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteRequest(tx)}
                    aria-label={`Excluir '${tx.description}'`}
                    className="p-2 text-slate-500 hover:text-red-600 rounded-md"
                  >
                    <Trash2 className="w-4 h-4" aria-hidden="true" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {hasMore && (
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3 text-xs">
          <span className="text-slate-500 tabular-nums">
            Exibindo {displayedTransactions.length} de{' '}
            {filteredTransactions.length} movimentações
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setVisibleLimit((prev) => prev + PAGE_SIZE)}
              className="px-3 py-1.5 font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Mostrar mais {Math.min(PAGE_SIZE, filteredTransactions.length - visibleLimit)}
            </button>
            <button
              type="button"
              onClick={() => setVisibleLimit(filteredTransactions.length)}
              className="px-3 py-1.5 font-medium text-slate-900 bg-white border border-slate-200 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Ver todas
            </button>
          </div>
        </div>
      )}
    </section>
  );
});
