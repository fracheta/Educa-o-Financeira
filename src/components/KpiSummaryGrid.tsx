import {
  ArrowDownCircle,
  ArrowUpCircle,
  CalendarCheck,
  ListChecks,
  PiggyBank,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { FinancialSummary } from '../types/finance';
import { formatBRL } from '../utils/finance';

interface KpiSummaryGridProps {
  summary: FinancialSummary;
}

export function KpiSummaryGrid({ summary }: KpiSummaryGridProps) {
  return (
    <section aria-label="Indicadores financeiros" className="mb-8 space-y-4">
      {/* Row 1: Reference 4 primary cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          data-testid="kpi-saldo-total"
          className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wider">
              Saldo Total
            </h3>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <Wallet className="w-5 h-5" aria-hidden="true" />
            </div>
          </div>
          <div>
            <p className="text-2xl font-semibold text-slate-900 tabular-nums">
              {formatBRL(summary.totalBalance)}
            </p>
            <p className="text-xs text-slate-500 mt-1">Soma de todas as origens</p>
          </div>
        </div>

        <div
          data-testid="kpi-despesas-abertas"
          className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wider">
              Despesas Abertas
            </h3>
            <div className="p-2 bg-orange-50 text-orange-600 rounded-lg">
              <TrendingDown className="w-5 h-5" aria-hidden="true" />
            </div>
          </div>
          <div>
            <p className="text-2xl font-semibold text-slate-900 tabular-nums">
              {formatBRL(summary.openExpenses)}
            </p>
            <p className="text-xs text-slate-500 mt-1">Abertas e aguardando</p>
          </div>
        </div>

        <div
          data-testid="kpi-pagas-mes"
          className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wider">
              Pagas (Mês)
            </h3>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <CalendarCheck className="w-5 h-5" aria-hidden="true" />
            </div>
          </div>
          <div>
            <p className="text-2xl font-semibold text-slate-900 tabular-nums">
              {formatBRL(summary.paidThisMonth)}
            </p>
            <p className="text-xs text-slate-500 mt-1">Neste mês corrente</p>
          </div>
        </div>

        <div
          data-testid="kpi-saldo-disponivel"
          className="bg-slate-900 p-6 rounded-xl border border-slate-800 shadow-sm flex flex-col justify-between text-white"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-slate-300 uppercase tracking-wider">
              Saldo Disponível
            </h3>
            <div className="p-2 bg-slate-800 text-emerald-400 rounded-lg">
              <PiggyBank className="w-5 h-5" aria-hidden="true" />
            </div>
          </div>
          <div>
            <p className="text-2xl font-semibold tabular-nums">
              {formatBRL(summary.availableBalance)}
            </p>
            <p className="text-xs text-slate-400 mt-1">Saldo - Despesas Abertas</p>
          </div>
        </div>
      </div>

      {/* Row 2: Extended financial indicators requested */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          data-testid="kpi-total-receitas"
          className="bg-white px-5 py-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between gap-4"
        >
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Total de Receitas
            </p>
            <p className="text-lg font-semibold text-emerald-700 tabular-nums mt-1">
              {formatBRL(summary.totalIncome)}
            </p>
            <p className="text-xs text-slate-500 mt-0.5 tabular-nums">
              Mês: {formatBRL(summary.monthIncome)}
            </p>
          </div>
          <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg shrink-0">
            <ArrowDownCircle className="w-5 h-5" aria-hidden="true" />
          </div>
        </div>

        <div
          data-testid="kpi-total-despesas"
          className="bg-white px-5 py-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between gap-4"
        >
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Total de Despesas
            </p>
            <p className="text-lg font-semibold text-slate-900 tabular-nums mt-1">
              {formatBRL(summary.totalExpenses)}
            </p>
            <p className="text-xs text-slate-500 mt-0.5 tabular-nums">
              Mês: {formatBRL(summary.monthExpenses)}
            </p>
          </div>
          <div className="p-2 bg-orange-50 text-orange-600 rounded-lg shrink-0">
            <ArrowUpCircle className="w-5 h-5" aria-hidden="true" />
          </div>
        </div>

        <div
          data-testid="kpi-saldo-mes"
          className="bg-white px-5 py-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between gap-4"
        >
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Resultado do Mês
            </p>
            <p
              className={`text-lg font-semibold tabular-nums mt-1 ${
                summary.monthBalance >= 0 ? 'text-emerald-700' : 'text-red-600'
              }`}
            >
              {formatBRL(summary.monthBalance)}
            </p>
            <p className="text-xs text-slate-500 mt-0.5 tabular-nums">
              Receitas - Despesas ({summary.savingsRate >= 0 ? '+' : ''}
              {summary.savingsRate.toFixed(1)}%)
            </p>
          </div>
          <div className="p-2 bg-slate-100 text-slate-700 rounded-lg shrink-0">
            <TrendingUp className="w-5 h-5" aria-hidden="true" />
          </div>
        </div>

        <div
          data-testid="kpi-qtd-movimentacoes"
          className="bg-white px-5 py-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between gap-4"
        >
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Movimentações
            </p>
            <p className="text-lg font-semibold text-slate-900 tabular-nums mt-1">
              {summary.transactionCount}
            </p>
            <p className="text-xs text-slate-500 mt-0.5 tabular-nums">
              {summary.incomeCount}{' '}
              {summary.incomeCount === 1 ? 'receita' : 'receitas'} ·{' '}
              {summary.expenseCount}{' '}
              {summary.expenseCount === 1 ? 'despesa' : 'despesas'}
            </p>
          </div>
          <div className="p-2 bg-slate-100 text-slate-700 rounded-lg shrink-0">
            <ListChecks className="w-5 h-5" aria-hidden="true" />
          </div>
        </div>
      </div>
    </section>
  );
}
