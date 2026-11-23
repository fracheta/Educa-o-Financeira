import { ArrowDownToLine, ArrowUpFromLine } from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';
import { Category, ExpenseStatus, Origin } from '../types/finance';
import {
  getTodayISO,
  NormalizedTransactionPayload,
  validateTransactionInput,
} from '../utils/finance';

interface QuickEntryFormsProps {
  origins: Origin[];
  categories: Category[];
  onCreateTransaction: (payload: NormalizedTransactionPayload) => Promise<void>;
}

export function QuickEntryForms({
  origins,
  categories,
  onCreateTransaction,
}: QuickEntryFormsProps) {
  const incomeCategories = categories.filter(
    (c) => c.type === 'receita' || c.type === 'ambos'
  );
  const expenseCategories = categories.filter(
    (c) => c.type === 'despesa' || c.type === 'ambos'
  );

  // Receita form state
  const [incDesc, setIncDesc] = useState('');
  const [incAmount, setIncAmount] = useState('');
  const [incDate, setIncDate] = useState(() => getTodayISO());
  const [incCategory, setIncCategory] = useState(
    incomeCategories[0]?.name || 'Salário'
  );
  const [incOrigin, setIncOrigin] = useState(origins[0]?.name || 'Itaú');
  const [incErrors, setIncErrors] = useState<Record<string, string>>({});
  const [incSubmitting, setIncSubmitting] = useState(false);

  // Despesa form state
  const [expDesc, setExpDesc] = useState('');
  const [expAmount, setExpAmount] = useState('');
  const [expDate, setExpDate] = useState(() => getTodayISO());
  const [expCategory, setExpCategory] = useState(
    expenseCategories[0]?.name || 'Moradia'
  );
  const [expStatus, setExpStatus] = useState<ExpenseStatus>('Aberta');
  const [expOrigin, setExpOrigin] = useState(origins[0]?.name || 'Itaú');
  const [expErrors, setExpErrors] = useState<Record<string, string>>({});
  const [expSubmitting, setExpSubmitting] = useState(false);

  useEffect(() => {
    if (origins.length > 0) {
      if (!origins.some((o) => o.name === incOrigin)) {
        setIncOrigin(origins[0].name);
      }
      if (!origins.some((o) => o.name === expOrigin)) {
        setExpOrigin(origins[0].name);
      }
    }
  }, [origins, incOrigin, expOrigin]);

  useEffect(() => {
    if (
      incomeCategories.length > 0 &&
      !incomeCategories.some((c) => c.name === incCategory)
    ) {
      setIncCategory(incomeCategories[0].name);
    }
  }, [incomeCategories, incCategory]);

  useEffect(() => {
    if (
      expenseCategories.length > 0 &&
      !expenseCategories.some((c) => c.name === expCategory)
    ) {
      setExpCategory(expenseCategories[0].name);
    }
  }, [expenseCategories, expCategory]);

  const handleIncomeSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (incSubmitting) return;

    const validation = validateTransactionInput({
      type: 'receita',
      description: incDesc,
      amount: incAmount,
      date: incDate,
      category: incCategory,
      origin: incOrigin,
      status: 'Paga',
    });

    if (!validation.valid || !validation.data) {
      setIncErrors(validation.errors);
      return;
    }

    setIncSubmitting(true);
    setIncErrors({});
    try {
      await onCreateTransaction(validation.data);
      setIncDesc('');
      setIncAmount('');
    } catch (err) {
      setIncErrors({
        form: err instanceof Error ? err.message : 'Erro ao salvar receita.',
      });
    } finally {
      setIncSubmitting(false);
    }
  };

  const handleExpenseSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (expSubmitting) return;

    const validation = validateTransactionInput({
      type: 'despesa',
      description: expDesc,
      amount: expAmount,
      date: expDate,
      category: expCategory,
      origin: expOrigin,
      status: expStatus,
    });

    if (!validation.valid || !validation.data) {
      setExpErrors(validation.errors);
      return;
    }

    setExpSubmitting(true);
    setExpErrors({});
    try {
      await onCreateTransaction(validation.data);
      setExpDesc('');
      setExpAmount('');
    } catch (err) {
      setExpErrors({
        form: err instanceof Error ? err.message : 'Erro ao salvar despesa.',
      });
    } finally {
      setExpSubmitting(false);
    }
  };

  return (
    <section
      aria-label="Cadastro rápido de receitas e despesas"
      className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8"
    >
      {/* Adicionar Receita */}
      <form
        onSubmit={handleIncomeSubmit}
        noValidate
        className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between"
      >
        <div>
          <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <ArrowDownToLine
              className="w-5 h-5 text-emerald-500"
              aria-hidden="true"
            />
            Adicionar Receita
          </h3>

          <div className="space-y-4">
            <div>
              <label
                htmlFor="inc-description"
                className="block text-sm font-medium text-slate-700 mb-1"
              >
                Descrição
              </label>
              <input
                id="inc-description"
                type="text"
                value={incDesc}
                onChange={(e) => {
                  setIncDesc(e.target.value);
                  if (incErrors.description) {
                    setIncErrors((prev) => ({ ...prev, description: '' }));
                  }
                }}
                placeholder="Ex: Salário, Freelance..."
                maxLength={120}
                className="w-full border border-slate-300 rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
              {incErrors.description && (
                <p role="alert" className="text-xs text-red-600 mt-1">
                  {incErrors.description}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="inc-amount"
                  className="block text-sm font-medium text-slate-700 mb-1"
                >
                  Valor (R$)
                </label>
                <input
                  id="inc-amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={incAmount}
                  onChange={(e) => {
                    setIncAmount(e.target.value);
                    if (incErrors.amount) {
                      setIncErrors((prev) => ({ ...prev, amount: '' }));
                    }
                  }}
                  placeholder="0.00"
                  className="w-full border border-slate-300 rounded-md p-2 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
                {incErrors.amount && (
                  <p role="alert" className="text-xs text-red-600 mt-1">
                    {incErrors.amount}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="inc-date"
                  className="block text-sm font-medium text-slate-700 mb-1"
                >
                  Data
                </label>
                <input
                  id="inc-date"
                  type="date"
                  value={incDate}
                  onChange={(e) => {
                    setIncDate(e.target.value);
                    if (incErrors.date) {
                      setIncErrors((prev) => ({ ...prev, date: '' }));
                    }
                  }}
                  className="w-full border border-slate-300 rounded-md p-2 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
                {incErrors.date && (
                  <p role="alert" className="text-xs text-red-600 mt-1">
                    {incErrors.date}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="inc-category"
                  className="block text-sm font-medium text-slate-700 mb-1"
                >
                  Categoria
                </label>
                <select
                  id="inc-category"
                  value={incCategory}
                  onChange={(e) => setIncCategory(e.target.value)}
                  className="w-full border border-slate-300 rounded-md p-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                >
                  {incomeCategories.map((cat) => (
                    <option key={cat.id} value={cat.name}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="inc-origin"
                  className="block text-sm font-medium text-slate-700 mb-1"
                >
                  Destino (Onde entrou?)
                </label>
                <select
                  id="inc-origin"
                  value={incOrigin}
                  onChange={(e) => setIncOrigin(e.target.value)}
                  className="w-full border border-slate-300 rounded-md p-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                >
                  {origins.map((origin) => (
                    <option key={origin.id} value={origin.name}>
                      {origin.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {incErrors.form && (
              <p role="alert" className="text-xs text-red-600">
                {incErrors.form}
              </p>
            )}
          </div>
        </div>

        <button
          type="submit"
          disabled={incSubmitting}
          className="mt-4 w-full bg-emerald-600 text-white font-medium py-2 px-4 rounded-md hover:bg-emerald-700 disabled:opacity-60 transition-colors cursor-pointer"
        >
          {incSubmitting ? 'Salvando...' : 'Salvar Receita'}
        </button>
      </form>

      {/* Adicionar Despesa */}
      <form
        onSubmit={handleExpenseSubmit}
        noValidate
        className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between"
      >
        <div>
          <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <ArrowUpFromLine
              className="w-5 h-5 text-orange-500"
              aria-hidden="true"
            />
            Adicionar Despesa
          </h3>

          <div className="space-y-4">
            <div>
              <label
                htmlFor="exp-description"
                className="block text-sm font-medium text-slate-700 mb-1"
              >
                Descrição
              </label>
              <input
                id="exp-description"
                type="text"
                value={expDesc}
                onChange={(e) => {
                  setExpDesc(e.target.value);
                  if (expErrors.description) {
                    setExpErrors((prev) => ({ ...prev, description: '' }));
                  }
                }}
                placeholder="Ex: Aluguel, Supermercado..."
                maxLength={120}
                className="w-full border border-slate-300 rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              />
              {expErrors.description && (
                <p role="alert" className="text-xs text-red-600 mt-1">
                  {expErrors.description}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="exp-amount"
                  className="block text-sm font-medium text-slate-700 mb-1"
                >
                  Valor (R$)
                </label>
                <input
                  id="exp-amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={expAmount}
                  onChange={(e) => {
                    setExpAmount(e.target.value);
                    if (expErrors.amount) {
                      setExpErrors((prev) => ({ ...prev, amount: '' }));
                    }
                  }}
                  placeholder="0.00"
                  className="w-full border border-slate-300 rounded-md p-2 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
                {expErrors.amount && (
                  <p role="alert" className="text-xs text-red-600 mt-1">
                    {expErrors.amount}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="exp-date"
                  className="block text-sm font-medium text-slate-700 mb-1"
                >
                  Vencimento
                </label>
                <input
                  id="exp-date"
                  type="date"
                  value={expDate}
                  onChange={(e) => {
                    setExpDate(e.target.value);
                    if (expErrors.date) {
                      setExpErrors((prev) => ({ ...prev, date: '' }));
                    }
                  }}
                  className="w-full border border-slate-300 rounded-md p-2 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
                {expErrors.date && (
                  <p role="alert" className="text-xs text-red-600 mt-1">
                    {expErrors.date}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="exp-category"
                  className="block text-sm font-medium text-slate-700 mb-1"
                >
                  Categoria
                </label>
                <select
                  id="exp-category"
                  value={expCategory}
                  onChange={(e) => setExpCategory(e.target.value)}
                  className="w-full border border-slate-300 rounded-md p-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                >
                  {expenseCategories.map((cat) => (
                    <option key={cat.id} value={cat.name}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="exp-status"
                  className="block text-sm font-medium text-slate-700 mb-1"
                >
                  Status
                </label>
                <select
                  id="exp-status"
                  value={expStatus}
                  onChange={(e) => setExpStatus(e.target.value as ExpenseStatus)}
                  className="w-full border border-slate-300 rounded-md p-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                >
                  <option value="Aberta">Aberta</option>
                  <option value="Aguardar">Aguardar</option>
                  <option value="Paga">Paga</option>
                </select>
              </div>
            </div>

            <div>
              <label
                htmlFor="exp-origin"
                className="block text-sm font-medium text-slate-700 mb-1"
              >
                Origem (De onde vai sair?)
              </label>
              <select
                id="exp-origin"
                value={expOrigin}
                onChange={(e) => setExpOrigin(e.target.value)}
                className="w-full border border-slate-300 rounded-md p-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              >
                {origins.map((origin) => (
                  <option key={origin.id} value={origin.name}>
                    {origin.name}
                  </option>
                ))}
              </select>
            </div>

            {expErrors.form && (
              <p role="alert" className="text-xs text-red-600">
                {expErrors.form}
              </p>
            )}
          </div>
        </div>

        <button
          type="submit"
          disabled={expSubmitting}
          className="mt-4 w-full bg-slate-900 text-white font-medium py-2 px-4 rounded-md hover:bg-slate-800 disabled:opacity-60 transition-colors cursor-pointer"
        >
          {expSubmitting ? 'Salvando...' : 'Salvar Despesa'}
        </button>
      </form>
    </section>
  );
}
