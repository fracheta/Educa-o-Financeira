import {
  Category,
  CategoryExpensePoint,
  CategoryScope,
  ExpenseStatus,
  FinancialSummary,
  IncomeVsExpensePoint,
  MonthlyEvolutionPoint,
  Origin,
  TimelineMovementPoint,
  Transaction,
  TransactionFilters,
  TransactionInput,
  TransactionType,
  ValidationResult,
} from '../types/finance';

export const DEFAULT_ORIGINS: Array<{ name: string; isDefault: boolean }> = [
  { name: 'Itaú', isDefault: true },
  { name: 'Caixa', isDefault: true },
  { name: 'Nubank', isDefault: true },
  { name: 'Dinheiro Físico', isDefault: true },
];

export const DEFAULT_CATEGORIES: Array<{
  name: string;
  type: CategoryScope;
  color: string;
  isDefault: boolean;
}> = [
  { name: 'Moradia', type: 'despesa', color: '#0f172a', isDefault: true },
  { name: 'Alimentação', type: 'despesa', color: '#ea580c', isDefault: true },
  { name: 'Transporte', type: 'despesa', color: '#2563eb', isDefault: true },
  { name: 'Lazer', type: 'despesa', color: '#7c3aed', isDefault: true },
  { name: 'Saúde', type: 'despesa', color: '#dc2626', isDefault: true },
  { name: 'Educação', type: 'despesa', color: '#0891b2', isDefault: true },
  { name: 'Salário', type: 'receita', color: '#059669', isDefault: true },
  { name: 'Freelance', type: 'receita', color: '#10b981', isDefault: true },
  { name: 'Investimentos', type: 'receita', color: '#14b8a6', isDefault: true },
  { name: 'Outros', type: 'ambos', color: '#64748b', isDefault: true },
];

export const FALLBACK_CATEGORY_COLORS = [
  '#0f172a',
  '#2563eb',
  '#ea580c',
  '#059669',
  '#7c3aed',
  '#dc2626',
  '#0891b2',
  '#d97706',
  '#4f46e5',
  '#64748b',
];

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const HEX_COLOR_REGEX = /^#[0-9a-fA-F]{6}$/;

export function getTodayISO(referenceDate: Date = new Date()): string {
  const year = referenceDate.getFullYear();
  const month = String(referenceDate.getMonth() + 1).padStart(2, '0');
  const day = String(referenceDate.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatBRL(value: number): string {
  const safeValue = Number.isFinite(value) ? value : 0;
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(safeValue);
}

export function formatDateBR(isoDate: string): string {
  if (!ISO_DATE_REGEX.test(isoDate)) {
    return isoDate;
  }
  const [year, month, day] = isoDate.split('-');
  return `${day}/${month}/${year}`;
}

export function formatMonthLabel(monthKey: string): string {
  if (!/^\d{4}-\d{2}$/.test(monthKey)) {
    return monthKey;
  }
  const [year, month] = monthKey.split('-').map(Number);
  const months = [
    'Jan',
    'Fev',
    'Mar',
    'Abr',
    'Mai',
    'Jun',
    'Jul',
    'Ago',
    'Set',
    'Out',
    'Nov',
    'Dez',
  ];
  return `${months[month - 1] ?? monthKey}/${String(year).slice(2)}`;
}

export function parsePositiveAmount(raw: number | string): number {
  if (typeof raw === 'number') {
    return Number.isFinite(raw) ? Math.round(raw * 100) / 100 : NaN;
  }
  const trimmed = String(raw).trim();
  if (!trimmed) return NaN;

  // Support both "1500.50" and Brazilian "1.500,50" / "1500,50"
  let normalized = trimmed;
  if (trimmed.includes(',')) {
    normalized = trimmed.replace(/\./g, '').replace(',', '.');
  }
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? Math.round(parsed * 100) / 100 : NaN;
}

export interface NormalizedTransactionPayload {
  type: TransactionType;
  description: string;
  amount: number;
  date: string;
  category: string;
  origin: string;
  status: ExpenseStatus;
  notes?: string;
}

export function validateTransactionInput(
  input: TransactionInput
): ValidationResult<NormalizedTransactionPayload> {
  const errors: Record<string, string> = {};

  const description = input.description.trim();
  if (description.length < 2) {
    errors.description = 'Informe uma descrição com pelo menos 2 caracteres.';
  } else if (description.length > 120) {
    errors.description = 'A descrição deve ter no máximo 120 caracteres.';
  }

  const amount = parsePositiveAmount(input.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    errors.amount = 'Informe um valor válido maior que R$ 0,00.';
  } else if (amount > 1_000_000_000) {
    errors.amount = 'O valor excede o limite máximo permitido.';
  }

  const date = input.date.trim();
  if (!ISO_DATE_REGEX.test(date)) {
    errors.date = 'Informe uma data válida no formato AAAA-MM-DD.';
  } else {
    const [y, m, d] = date.split('-').map(Number);
    const parsedDate = new Date(Date.UTC(y, m - 1, d));
    if (
      parsedDate.getUTCFullYear() !== y ||
      parsedDate.getUTCMonth() !== m - 1 ||
      parsedDate.getUTCDate() !== d
    ) {
      errors.date = 'A data informada não existe no calendário.';
    }
  }

  const type: TransactionType = input.type;
  if (type !== 'receita' && type !== 'despesa') {
    errors.type = 'Tipo de movimentação inválido.';
  }

  const category = input.category.trim();
  if (!category || category.length > 60) {
    errors.category = 'Selecione uma categoria válida.';
  }

  const origin = input.origin.trim();
  if (!origin || origin.length > 60) {
    errors.origin = 'Selecione uma origem/banco válida.';
  }

  const status: ExpenseStatus = type === 'receita' ? 'Paga' : input.status;
  if (status !== 'Aberta' && status !== 'Aguardar' && status !== 'Paga') {
    errors.status = 'Status inválido.';
  }

  const notes = input.notes?.trim();
  if (notes && notes.length > 500) {
    errors.notes = 'As observações devem ter no máximo 500 caracteres.';
  }

  if (Object.keys(errors).length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    errors: {},
    data: {
      type,
      description,
      amount,
      date,
      category,
      origin,
      status,
      ...(notes ? { notes } : {}),
    },
  };
}

export function validateOriginName(
  rawName: string,
  existingOrigins: Origin[]
): ValidationResult<{ name: string }> {
  const name = rawName.trim();
  if (!name) {
    return { valid: false, errors: { name: 'Informe o nome do banco ou origem.' } };
  }
  if (name.length > 60) {
    return { valid: false, errors: { name: 'O nome deve ter no máximo 60 caracteres.' } };
  }
  const duplicate = existingOrigins.some(
    (o) => o.name.trim().toLowerCase() === name.toLowerCase()
  );
  if (duplicate) {
    return { valid: false, errors: { name: 'Esta origem já está cadastrada.' } };
  }
  return { valid: true, errors: {}, data: { name } };
}

export function validateCategoryInput(
  rawName: string,
  type: CategoryScope,
  color: string,
  existingCategories: Category[],
  ignoreId?: string
): ValidationResult<{ name: string; type: CategoryScope; color: string }> {
  const errors: Record<string, string> = {};
  const name = rawName.trim();
  if (!name) {
    errors.name = 'Informe o nome da categoria.';
  } else if (name.length > 60) {
    errors.name = 'O nome deve ter no máximo 60 caracteres.';
  } else if (
    existingCategories.some(
      (c) => c.id !== ignoreId && c.name.trim().toLowerCase() === name.toLowerCase()
    )
  ) {
    errors.name = 'Já existe uma categoria com este nome.';
  }

  if (type !== 'receita' && type !== 'despesa' && type !== 'ambos') {
    errors.type = 'Tipo de categoria inválido.';
  }

  if (!HEX_COLOR_REGEX.test(color)) {
    errors.color = 'Selecione uma cor hexadecimal válida (#RRGGBB).';
  }

  if (Object.keys(errors).length > 0) {
    return { valid: false, errors };
  }

  return { valid: true, errors: {}, data: { name, type, color } };
}

export function createDefaultFilters(): TransactionFilters {
  return {
    search: '',
    type: 'all',
    status: 'all',
    category: 'all',
    origin: 'all',
    dateStart: '',
    dateEnd: '',
  };
}

export function filterTransactions(
  transactions: Transaction[],
  filters: TransactionFilters
): Transaction[] {
  const query = filters.search.trim().toLowerCase();

  return transactions
    .filter((tx) => {
      if (filters.type !== 'all' && tx.type !== filters.type) {
        return false;
      }
      if (filters.status !== 'all') {
        if (filters.status === 'Paga') {
          if (tx.type !== 'despesa' || tx.status !== 'Paga') return false;
        } else if (tx.type !== 'despesa' || tx.status !== filters.status) {
          return false;
        }
      }
      if (filters.category !== 'all' && tx.category !== filters.category) {
        return false;
      }
      if (filters.origin !== 'all' && tx.origin !== filters.origin) {
        return false;
      }
      if (filters.dateStart && tx.date < filters.dateStart) {
        return false;
      }
      if (filters.dateEnd && tx.date > filters.dateEnd) {
        return false;
      }
      if (query) {
        const matchesDescription = tx.description.toLowerCase().includes(query);
        const matchesCategory = tx.category.toLowerCase().includes(query);
        const matchesOrigin = tx.origin.toLowerCase().includes(query);
        const matchesNotes = (tx.notes ?? '').toLowerCase().includes(query);
        if (!matchesDescription && !matchesCategory && !matchesOrigin && !matchesNotes) {
          return false;
        }
      }
      return true;
    })
    .sort((a, b) => {
      if (a.date !== b.date) {
        return b.date.localeCompare(a.date);
      }
      return b.createdAt.localeCompare(a.createdAt);
    });
}

export function calculateFinancialSummary(
  transactions: Transaction[],
  origins: Origin[],
  referenceDate: Date = new Date()
): FinancialSummary {
  const currentMonthKey = `${referenceDate.getFullYear()}-${String(
    referenceDate.getMonth() + 1
  ).padStart(2, '0')}`;

  const originBalances: Record<string, number> = {};
  for (const origin of origins) {
    originBalances[origin.name] = 0;
  }

  let totalIncome = 0;
  let totalExpenses = 0;
  let totalPaidExpenses = 0;
  let openExpenses = 0;
  let paidThisMonth = 0;
  let monthIncome = 0;
  let monthExpenses = 0;
  let incomeCount = 0;
  let expenseCount = 0;

  const expenseByCategory = new Map<string, number>();

  for (const tx of transactions) {
    const amount = Number.isFinite(tx.amount) ? tx.amount : 0;
    const isCurrentMonth = tx.date.startsWith(currentMonthKey);

    if (!(tx.origin in originBalances)) {
      originBalances[tx.origin] = 0;
    }

    if (tx.type === 'receita') {
      totalIncome += amount;
      incomeCount += 1;
      originBalances[tx.origin] += amount;
      if (isCurrentMonth) {
        monthIncome += amount;
      }
    } else {
      totalExpenses += amount;
      expenseCount += 1;
      expenseByCategory.set(
        tx.category,
        (expenseByCategory.get(tx.category) ?? 0) + amount
      );
      if (isCurrentMonth) {
        monthExpenses += amount;
      }

      if (tx.status === 'Paga') {
        totalPaidExpenses += amount;
        originBalances[tx.origin] -= amount;
        if (isCurrentMonth) {
          paidThisMonth += amount;
        }
      } else {
        openExpenses += amount;
      }
    }
  }

  const totalBalance = roundCurrency(totalIncome - totalPaidExpenses);
  const availableBalance = roundCurrency(totalBalance - openExpenses);
  const monthBalance = roundCurrency(monthIncome - monthExpenses);
  const savingsRate =
    monthIncome > 0
      ? Math.round(((monthIncome - monthExpenses) / monthIncome) * 1000) / 10
      : 0;

  let topExpenseCategory: FinancialSummary['topExpenseCategory'] = null;
  if (totalExpenses > 0 && expenseByCategory.size > 0) {
    let topName = '';
    let topAmount = -1;
    for (const [cat, amt] of expenseByCategory.entries()) {
      if (amt > topAmount) {
        topName = cat;
        topAmount = amt;
      }
    }
    if (topAmount > 0) {
      topExpenseCategory = {
        category: topName,
        amount: roundCurrency(topAmount),
        percentage: Math.round((topAmount / totalExpenses) * 1000) / 10,
      };
    }
  }

  for (const key of Object.keys(originBalances)) {
    originBalances[key] = roundCurrency(originBalances[key]);
  }

  return {
    totalBalance,
    openExpenses: roundCurrency(openExpenses),
    paidThisMonth: roundCurrency(paidThisMonth),
    availableBalance,
    totalIncome: roundCurrency(totalIncome),
    totalExpenses: roundCurrency(totalExpenses),
    totalPaidExpenses: roundCurrency(totalPaidExpenses),
    currentBalance: totalBalance,
    transactionCount: transactions.length,
    incomeCount,
    expenseCount,
    monthIncome: roundCurrency(monthIncome),
    monthExpenses: roundCurrency(monthExpenses),
    monthBalance,
    savingsRate,
    originBalances,
    topExpenseCategory,
  };
}

function roundCurrency(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function buildIncomeVsExpenseData(
  transactions: Transaction[]
): IncomeVsExpensePoint[] {
  let receitas = 0;
  let despesas = 0;

  for (const tx of transactions) {
    if (tx.type === 'receita') receitas += tx.amount;
    else despesas += tx.amount;
  }

  return [
    {
      name: 'Geral',
      Receitas: roundCurrency(receitas),
      Despesas: roundCurrency(despesas),
      Saldo: roundCurrency(receitas - despesas),
    },
  ];
}

export function buildExpensesByCategoryData(
  transactions: Transaction[],
  categories: Category[]
): CategoryExpensePoint[] {
  const colorMap = new Map<string, string>();
  categories.forEach((cat) => colorMap.set(cat.name, cat.color));

  const grouped = new Map<string, { amount: number; count: number }>();
  let totalExpenses = 0;

  for (const tx of transactions) {
    if (tx.type !== 'despesa') continue;
    totalExpenses += tx.amount;
    const prev = grouped.get(tx.category) ?? { amount: 0, count: 0 };
    grouped.set(tx.category, {
      amount: prev.amount + tx.amount,
      count: prev.count + 1,
    });
  }

  return Array.from(grouped.entries())
    .map(([category, info], index) => ({
      category,
      amount: roundCurrency(info.amount),
      percentage:
        totalExpenses > 0
          ? Math.round((info.amount / totalExpenses) * 1000) / 10
          : 0,
      color:
        colorMap.get(category) ??
        FALLBACK_CATEGORY_COLORS[index % FALLBACK_CATEGORY_COLORS.length],
      count: info.count,
    }))
    .sort((a, b) => b.amount - a.amount);
}

export function buildMonthlyEvolutionData(
  transactions: Transaction[]
): MonthlyEvolutionPoint[] {
  const grouped = new Map<
    string,
    { receitas: number; despesas: number; despesasPagas: number }
  >();

  for (const tx of transactions) {
    const monthKey = tx.date.slice(0, 7);
    const current = grouped.get(monthKey) ?? {
      receitas: 0,
      despesas: 0,
      despesasPagas: 0,
    };
    if (tx.type === 'receita') {
      current.receitas += tx.amount;
    } else {
      current.despesas += tx.amount;
      if (tx.status === 'Paga') {
        current.despesasPagas += tx.amount;
      }
    }
    grouped.set(monthKey, current);
  }

  const sortedKeys = Array.from(grouped.keys()).sort();
  let runningBalance = 0;

  return sortedKeys.map((monthKey) => {
    const item = grouped.get(monthKey)!;
    const saldoMensal = roundCurrency(item.receitas - item.despesas);
    runningBalance = roundCurrency(runningBalance + item.receitas - item.despesasPagas);
    return {
      monthKey,
      label: formatMonthLabel(monthKey),
      receitas: roundCurrency(item.receitas),
      despesas: roundCurrency(item.despesas),
      despesasPagas: roundCurrency(item.despesasPagas),
      saldoMensal,
      saldoAcumulado: runningBalance,
    };
  });
}

export function buildTimelineMovementsData(
  transactions: Transaction[]
): TimelineMovementPoint[] {
  const grouped = new Map<
    string,
    { receitas: number; despesas: number; quantidade: number }
  >();

  for (const tx of transactions) {
    const current = grouped.get(tx.date) ?? {
      receitas: 0,
      despesas: 0,
      quantidade: 0,
    };
    if (tx.type === 'receita') {
      current.receitas += tx.amount;
    } else {
      current.despesas += tx.amount;
    }
    current.quantidade += 1;
    grouped.set(tx.date, current);
  }

  return Array.from(grouped.keys())
    .sort()
    .map((date) => {
      const item = grouped.get(date)!;
      return {
        date,
        label: formatDateBR(date),
        receitas: roundCurrency(item.receitas),
        despesas: roundCurrency(item.despesas),
        fluxoLiquido: roundCurrency(item.receitas - item.despesas),
        quantidade: item.quantidade,
      };
    });
}

export function transactionsToCSV(transactions: Transaction[]): string {
  const header = ['Data', 'Tipo', 'Descrição', 'Categoria', 'Origem', 'Status', 'Valor (R$)', 'Observações'];
  const escape = (val: string) => `"${val.replace(/"/g, '""')}"`;

  const rows = transactions.map((tx) => [
    escape(formatDateBR(tx.date)),
    escape(tx.type === 'receita' ? 'Receita' : 'Despesa'),
    escape(tx.description),
    escape(tx.category),
    escape(tx.origin),
    escape(tx.type === 'receita' ? 'Recebida' : tx.status),
    escape(tx.amount.toFixed(2).replace('.', ',')),
    escape(tx.notes ?? ''),
  ]);

  return [header.map(escape).join(';'), ...rows.map((r) => r.join(';'))].join('\n');
}

export const CLEAR_DATA_PASSWORD = '1234';

export function verifyClearDataPassword(input: string): boolean {
  return input.trim() === CLEAR_DATA_PASSWORD;
}

export function sortOrigins(origins: Origin[]): Origin[] {
  const defaultOrder = new Map(
    DEFAULT_ORIGINS.map((o, idx) => [o.name.toLowerCase(), idx])
  );
  return [...origins].sort((a, b) => {
    const idxA = defaultOrder.get(a.name.toLowerCase());
    const idxB = defaultOrder.get(b.name.toLowerCase());
    if (idxA !== undefined && idxB !== undefined) return idxA - idxB;
    if (idxA !== undefined) return -1;
    if (idxB !== undefined) return 1;
    return a.createdAt.localeCompare(b.createdAt);
  });
}

export function sortCategories(categories: Category[]): Category[] {
  const defaultOrder = new Map(
    DEFAULT_CATEGORIES.map((c, idx) => [c.name.toLowerCase(), idx])
  );
  return [...categories].sort((a, b) => {
    const idxA = defaultOrder.get(a.name.toLowerCase());
    const idxB = defaultOrder.get(b.name.toLowerCase());
    if (idxA !== undefined && idxB !== undefined) return idxA - idxB;
    if (idxA !== undefined) return -1;
    if (idxB !== undefined) return 1;
    return a.createdAt.localeCompare(b.createdAt);
  });
}

