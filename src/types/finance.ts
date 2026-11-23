export type TransactionType = 'receita' | 'despesa';

export type ExpenseStatus = 'Aberta' | 'Aguardar' | 'Paga';

export type CategoryScope = 'receita' | 'despesa' | 'ambos';

export type NavTab = 'dashboard' | 'movimentacoes' | 'relatorios' | 'categorias';

export interface Transaction {
  id: string;
  userId: string;
  type: TransactionType;
  description: string;
  amount: number;
  date: string; // ISO YYYY-MM-DD
  category: string;
  origin: string;
  status: ExpenseStatus;
  notes?: string;
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
}

export interface TransactionInput {
  type: TransactionType;
  description: string;
  amount: number | string;
  date: string;
  category: string;
  origin: string;
  status: ExpenseStatus;
  notes?: string;
}

export interface Origin {
  id: string;
  userId: string;
  name: string;
  isDefault: boolean;
  createdAt: string;
}

export interface Category {
  id: string;
  userId: string;
  name: string;
  type: CategoryScope;
  color: string;
  isDefault: boolean;
  createdAt: string;
}

export interface TransactionFilters {
  search: string;
  type: 'all' | TransactionType;
  status: 'all' | ExpenseStatus;
  category: string;
  origin: string;
  dateStart: string;
  dateEnd: string;
}

export interface FinancialSummary {
  totalBalance: number; // Saldo Total (Receitas - Despesas Pagas)
  openExpenses: number; // Despesas Abertas (Aberta + Aguardar)
  paidThisMonth: number; // Despesas Pagas no mês corrente
  availableBalance: number; // Saldo Disponível (totalBalance - openExpenses)
  totalIncome: number; // Total de Receitas
  totalExpenses: number; // Total de Despesas (todas as despesas lançadas)
  totalPaidExpenses: number; // Total de Despesas Pagas
  currentBalance: number; // Saldo Atual (totalIncome - totalPaidExpenses)
  transactionCount: number;
  incomeCount: number;
  expenseCount: number;
  monthIncome: number; // Receitas do mês corrente
  monthExpenses: number; // Despesas do mês corrente
  monthBalance: number; // Saldo líquido do mês (monthIncome - monthExpenses)
  savingsRate: number; // Taxa de economia do mês (%)
  originBalances: Record<string, number>;
  topExpenseCategory: {
    category: string;
    amount: number;
    percentage: number;
  } | null;
}

export interface IncomeVsExpensePoint {
  name: string;
  Receitas: number;
  Despesas: number;
  Saldo: number;
}

export interface CategoryExpensePoint {
  category: string;
  amount: number;
  percentage: number;
  color: string;
  count: number;
}

export interface MonthlyEvolutionPoint {
  monthKey: string;
  label: string;
  receitas: number;
  despesas: number;
  despesasPagas: number;
  saldoMensal: number;
  saldoAcumulado: number;
}

export interface TimelineMovementPoint {
  date: string;
  label: string;
  receitas: number;
  despesas: number;
  fluxoLiquido: number;
  quantidade: number;
}

export interface ValidationResult<T> {
  valid: boolean;
  errors: Record<string, string>;
  data?: T;
}
