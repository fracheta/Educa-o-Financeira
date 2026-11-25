import {
  AlertCircle,
  BarChart3,
  Lightbulb,
  PieChart as PieChartIcon,
  TrendingUp,
} from 'lucide-react';
import { memo, useMemo } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Category, FinancialSummary, Transaction } from '../types/finance';
import {
  buildExpensesByCategoryData,
  buildIncomeVsExpenseData,
  buildMonthlyEvolutionData,
  buildTimelineMovementsData,
  formatBRL,
} from '../utils/finance';

interface ChartsSectionProps {
  transactions: Transaction[];
  categories: Category[];
  summary: FinancialSummary;
}

function CurrencyTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number; color?: string }>;
  label?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-md px-3 py-2 text-xs">
      {label && <p className="font-semibold text-slate-900 mb-1">{label}</p>}
      <div className="space-y-1">
        {payload.map((entry, idx) => (
          <div key={idx} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-slate-600">
              <span
                className="w-2 h-2 rounded-sm shrink-0"
                style={{ backgroundColor: entry.color || '#0f172a' }}
              />
              {entry.name}
            </span>
            <span className="font-semibold text-slate-900 tabular-nums">
              {formatBRL(Number(entry.value ?? 0))}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export const ChartsSection = memo(function ChartsSection({
  transactions,
  categories,
  summary,
}: ChartsSectionProps) {
  const incomeVsExpense = useMemo(
    () => buildIncomeVsExpenseData(transactions),
    [transactions]
  );
  const expensesByCategory = useMemo(
    () => buildExpensesByCategoryData(transactions, categories),
    [transactions, categories]
  );
  const monthlyEvolution = useMemo(
    () => buildMonthlyEvolutionData(transactions),
    [transactions]
  );
  const timelineMovements = useMemo(
    () => buildTimelineMovementsData(transactions),
    [transactions]
  );

  const hasTransactions = transactions.length > 0;

  return (
    <section
      aria-label="Gráficos e relatórios financeiros"
      className="space-y-6"
    >
      {/* Financial Insights & Problem Solving Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 mb-2">
            <PieChartIcon className="w-4 h-4 text-orange-500" aria-hidden="true" />
            Onde você está gastando mais
          </div>
          {summary.topExpenseCategory ? (
            <div>
              <p className="text-lg font-semibold text-slate-900">
                {summary.topExpenseCategory.category}
              </p>
              <p className="text-xs text-slate-600 mt-1 tabular-nums">
                {formatBRL(summary.topExpenseCategory.amount)} (
                {summary.topExpenseCategory.percentage.toFixed(1)}% do total de
                despesas)
              </p>
            </div>
          ) : (
            <p className="text-xs text-slate-500">
              Cadastre despesas para identificar sua maior categoria de gasto.
            </p>
          )}
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 mb-2">
            <TrendingUp className="w-4 h-4 text-emerald-600" aria-hidden="true" />
            Saúde financeira do mês
          </div>
          {summary.monthIncome > 0 || summary.monthExpenses > 0 ? (
            <div>
              <p
                className={`text-lg font-semibold tabular-nums ${
                  summary.monthBalance >= 0 ? 'text-emerald-700' : 'text-red-600'
                }`}
              >
                {summary.monthIncome > 0
                  ? `${summary.savingsRate.toFixed(1)}% de margem`
                  : formatBRL(summary.monthBalance)}
              </p>
              <p className="text-xs text-slate-600 mt-1 tabular-nums">
                Receitas {formatBRL(summary.monthIncome)} vs Despesas{' '}
                {formatBRL(summary.monthExpenses)}
              </p>
            </div>
          ) : (
            <p className="text-xs text-slate-500">
              Sem movimentações registradas no mês corrente.
            </p>
          )}
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 mb-2">
            {summary.openExpenses > summary.totalBalance ? (
              <AlertCircle className="w-4 h-4 text-red-600" aria-hidden="true" />
            ) : (
              <Lightbulb className="w-4 h-4 text-blue-600" aria-hidden="true" />
            )}
            Diagnóstico de liquidez
          </div>
          {!hasTransactions ? (
            <p className="text-xs text-slate-500">
              Registre receitas e despesas para acompanhar sua capacidade de
              pagamento.
            </p>
          ) : summary.availableBalance < 0 ? (
            <p className="text-xs text-red-700 leading-relaxed tabular-nums">
              Atenção: suas despesas abertas superam o saldo atual em{' '}
              <strong>{formatBRL(Math.abs(summary.availableBalance))}</strong>.
              Priorize a quitação das contas essenciais.
            </p>
          ) : (
            <p className="text-xs text-slate-600 leading-relaxed tabular-nums">
              Saldo livre após compromissos abertos:{' '}
              <strong className="text-slate-900">
                {formatBRL(summary.availableBalance)}
              </strong>
              . Suas contas em aberto estão cobertas.
            </p>
          )}
        </div>
      </div>

      {/* 4 Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Receitas vs Despesas */}
        <div
          data-testid="chart-receitas-vs-despesas"
          className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-emerald-600" aria-hidden="true" />
                Receitas versus Despesas
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Comparativo consolidado de entradas e saídas
              </p>
            </div>
          </div>

          {!hasTransactions ? (
            <div className="h-64 flex items-center justify-center text-sm text-slate-500 border border-dashed border-slate-200 rounded-lg">
              Adicione receitas ou despesas para visualizar o comparativo.
            </div>
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={incomeVsExpense}
                  margin={{ top: 10, right: 16, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} />
                  <YAxis
                    width={64}
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    tickFormatter={(v: number) =>
                      Math.abs(v) >= 1000
                        ? `R$${(v / 1000).toFixed(1).replace('.0', '')}k`
                        : `R$${v}`
                    }
                  />
                  <Tooltip content={<CurrencyTooltip />} />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Bar
                    dataKey="Receitas"
                    fill="#059669"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={72}
                  />
                  <Bar
                    dataKey="Despesas"
                    fill="#ea580c"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={72}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Chart 2: Despesas por Categoria */}
        <div
          data-testid="chart-despesas-categoria"
          className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm"
        >
          <div className="mb-4">
            <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
              <PieChartIcon className="w-4 h-4 text-orange-500" aria-hidden="true" />
              Despesas por Categoria
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Distribuição percentual dos gastos por categoria
            </p>
          </div>

          {expensesByCategory.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-sm text-slate-500 border border-dashed border-slate-200 rounded-lg">
              Cadastre despesas para visualizar a distribuição por categoria.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={expensesByCategory}
                      dataKey="amount"
                      nameKey="category"
                      cx="50%"
                      cy="50%"
                      innerRadius={48}
                      outerRadius={82}
                      paddingAngle={2}
                    >
                      {expensesByCategory.map((entry) => (
                        <Cell key={entry.category} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value) => formatBRL(Number(value ?? 0))}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                {expensesByCategory.map((item) => (
                  <div
                    key={item.category}
                    className="flex items-center justify-between gap-2 text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-2.5 h-2.5 rounded-sm shrink-0"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="font-medium text-slate-700 truncate">
                        {item.category}
                      </span>
                    </div>
                    <div className="text-right shrink-0 tabular-nums">
                      <span className="font-semibold text-slate-900">
                        {formatBRL(item.amount)}
                      </span>
                      <span className="text-slate-500 ml-1.5">
                        ({item.percentage.toFixed(1)}%)
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Chart 3: Evolução Financeira Mensal */}
        <div
          data-testid="chart-evolucao-mensal"
          className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm"
        >
          <div className="mb-4">
            <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-600" aria-hidden="true" />
              Evolução Financeira Mensal
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Receitas, despesas e saldo acumulado mês a mês
            </p>
          </div>

          {monthlyEvolution.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-sm text-slate-500 border border-dashed border-slate-200 rounded-lg">
              Sem dados mensais registrados até o momento.
            </div>
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={monthlyEvolution}
                  margin={{ top: 10, right: 16, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#64748b' }} />
                  <YAxis
                    width={64}
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    tickFormatter={(v: number) =>
                      Math.abs(v) >= 1000
                        ? `R$${(v / 1000).toFixed(1).replace('.0', '')}k`
                        : `R$${v}`
                    }
                  />
                  <Tooltip content={<CurrencyTooltip />} />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Bar
                    dataKey="receitas"
                    name="Receitas"
                    fill="#059669"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={40}
                  />
                  <Bar
                    dataKey="despesas"
                    name="Despesas"
                    fill="#ea580c"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={40}
                  />
                  <Line
                    type="monotone"
                    dataKey="saldoAcumulado"
                    name="Saldo Acumulado"
                    stroke="#0f172a"
                    strokeWidth={2.5}
                    dot={{ r: 4 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Chart 4: Movimentações ao Longo do Tempo */}
        <div
          data-testid="chart-movimentacoes-tempo"
          className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm"
        >
          <div className="mb-4">
            <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-slate-700" aria-hidden="true" />
              Movimentações ao Longo do Tempo
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Fluxo diário de entradas, saídas e saldo líquido por data
            </p>
          </div>

          {timelineMovements.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-sm text-slate-500 border border-dashed border-slate-200 rounded-lg">
              Sem movimentações registradas para exibir a linha do tempo.
            </div>
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={timelineMovements}
                  margin={{ top: 10, right: 16, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis
                    width={64}
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    tickFormatter={(v: number) =>
                      Math.abs(v) >= 1000
                        ? `R$${(v / 1000).toFixed(1).replace('.0', '')}k`
                        : `R$${v}`
                    }
                  />
                  <Tooltip content={<CurrencyTooltip />} />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Area
                    type="monotone"
                    dataKey="receitas"
                    name="Receitas"
                    stroke="#059669"
                    fill="#d1fae5"
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="despesas"
                    name="Despesas"
                    stroke="#ea580c"
                    fill="#ffedd5"
                    strokeWidth={2}
                  />
                  <Line
                    type="monotone"
                    dataKey="fluxoLiquido"
                    name="Fluxo Líquido"
                    stroke="#0f172a"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </section>
  );
});
