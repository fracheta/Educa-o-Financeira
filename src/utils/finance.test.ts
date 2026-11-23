import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildExpensesByCategoryData,
  buildIncomeVsExpenseData,
  buildMonthlyEvolutionData,
  buildTimelineMovementsData,
  calculateFinancialSummary,
  createDefaultFilters,
  filterTransactions,
  formatBRL,
  formatDateBR,
  parsePositiveAmount,
  validateOriginName,
  validateTransactionInput,
} from './finance';
import { Category, Origin, Transaction } from '../types/finance';

const sampleOrigins: Origin[] = [
  { id: '1', userId: 'u1', name: 'Itaú', isDefault: true, createdAt: '2026-11-01T00:00:00Z' },
  { id: '2', userId: 'u1', name: 'Nubank', isDefault: true, createdAt: '2026-11-01T00:00:00Z' },
];

const sampleCategories: Category[] = [
  { id: 'c1', userId: 'u1', name: 'Moradia', type: 'despesa', color: '#0f172a', isDefault: true, createdAt: '2026-11-01T00:00:00Z' },
  { id: 'c2', userId: 'u1', name: 'Alimentação', type: 'despesa', color: '#ea580c', isDefault: true, createdAt: '2026-11-01T00:00:00Z' },
  { id: 'c3', userId: 'u1', name: 'Salário', type: 'receita', color: '#059669', isDefault: true, createdAt: '2026-11-01T00:00:00Z' },
];

const sampleTransactions: Transaction[] = [
  {
    id: 't1',
    userId: 'u1',
    type: 'receita',
    description: 'Salário Mensal',
    amount: 5000,
    date: '2026-11-05',
    category: 'Salário',
    origin: 'Itaú',
    status: 'Paga',
    createdAt: '2026-11-05T10:00:00Z',
    updatedAt: '2026-11-05T10:00:00Z',
  },
  {
    id: 't2',
    userId: 'u1',
    type: 'despesa',
    description: 'Aluguel',
    amount: 1500,
    date: '2026-11-10',
    category: 'Moradia',
    origin: 'Itaú',
    status: 'Aberta',
    createdAt: '2026-11-10T10:00:00Z',
    updatedAt: '2026-11-10T10:00:00Z',
  },
  {
    id: 't3',
    userId: 'u1',
    type: 'despesa',
    description: 'Supermercado',
    amount: 600,
    date: '2026-11-15',
    category: 'Alimentação',
    origin: 'Nubank',
    status: 'Paga',
    createdAt: '2026-11-15T10:00:00Z',
    updatedAt: '2026-11-15T10:00:00Z',
  },
  {
    id: 't4',
    userId: 'u1',
    type: 'despesa',
    description: 'Internet',
    amount: 120,
    date: '2026-10-20',
    category: 'Moradia',
    origin: 'Nubank',
    status: 'Paga',
    createdAt: '2026-10-20T10:00:00Z',
    updatedAt: '2026-10-20T10:00:00Z',
  },
];

test('formatDateBR formats ISO dates to DD/MM/YYYY', () => {
  assert.equal(formatDateBR('2026-11-23'), '23/11/2026');
});

test('formatBRL formats currency in Brazilian Reais', () => {
  const formatted = formatBRL(1234.5);
  assert.match(formatted, /R\$\s?1\.234,50/);
});

test('parsePositiveAmount handles dot and comma decimals', () => {
  assert.equal(parsePositiveAmount('1500.50'), 1500.5);
  assert.equal(parsePositiveAmount('1.500,75'), 1500.75);
  assert.equal(parsePositiveAmount('0'), 0);
  assert.ok(Number.isNaN(parsePositiveAmount('abc')));
});

test('validateTransactionInput rejects empty, zero/negative, or invalid date', () => {
  const invalid = validateTransactionInput({
    type: 'despesa',
    description: ' ',
    amount: -10,
    date: '2026-02-31',
    category: '',
    origin: 'Itaú',
    status: 'Aberta',
  });
  assert.equal(invalid.valid, false);
  assert.ok(invalid.errors.description);
  assert.ok(invalid.errors.amount);
  assert.ok(invalid.errors.date);
  assert.ok(invalid.errors.category);
});

test('validateTransactionInput normalizes valid receita to status Paga', () => {
  const valid = validateTransactionInput({
    type: 'receita',
    description: '  Freela Design  ',
    amount: '2500,50',
    date: '2026-11-23',
    category: 'Freelance',
    origin: 'Itaú',
    status: 'Aberta',
  });
  assert.equal(valid.valid, true);
  assert.equal(valid.data?.description, 'Freela Design');
  assert.equal(valid.data?.amount, 2500.5);
  assert.equal(valid.data?.status, 'Paga');
});

test('validateOriginName rejects duplicates case-insensitively', () => {
  const dup = validateOriginName('itaú', sampleOrigins);
  assert.equal(dup.valid, false);
  const ok = validateOriginName('Banco Inter', sampleOrigins);
  assert.equal(ok.valid, true);
});

test('calculateFinancialSummary computes accurate balances and indicators', () => {
  const refDate = new Date('2026-11-23T12:00:00Z');
  const summary = calculateFinancialSummary(sampleTransactions, sampleOrigins, refDate);

  // Total income = 5000; Paid expenses = 600 + 120 = 720 -> totalBalance = 4280
  assert.equal(summary.totalIncome, 5000);
  assert.equal(summary.totalPaidExpenses, 720);
  assert.equal(summary.totalBalance, 4280);
  assert.equal(summary.openExpenses, 1500);
  assert.equal(summary.availableBalance, 2780);
  assert.equal(summary.paidThisMonth, 600);
  assert.equal(summary.monthIncome, 5000);
  assert.equal(summary.monthExpenses, 2100);
  assert.equal(summary.totalExpenses, 2220);
  assert.equal(summary.transactionCount, 4);
  assert.equal(summary.originBalances['Itaú'], 5000);
  assert.equal(summary.originBalances['Nubank'], -720);
  assert.equal(summary.topExpenseCategory?.category, 'Moradia');
  assert.equal(summary.topExpenseCategory?.amount, 1620);
});

test('filterTransactions filters by search, category, type, status, and date range', () => {
  const base = createDefaultFilters();
  assert.equal(filterTransactions(sampleTransactions, base).length, 4);

  const bySearch = filterTransactions(sampleTransactions, { ...base, search: 'mercado' });
  assert.equal(bySearch.length, 1);
  assert.equal(bySearch[0].id, 't3');

  const byStatus = filterTransactions(sampleTransactions, { ...base, status: 'Aberta' });
  assert.equal(byStatus.length, 1);
  assert.equal(byStatus[0].id, 't2');

  const byPeriod = filterTransactions(sampleTransactions, {
    ...base,
    dateStart: '2026-11-01',
    dateEnd: '2026-11-30',
  });
  assert.equal(byPeriod.length, 3);
});

test('chart builders produce accurate aggregations', () => {
  const ivse = buildIncomeVsExpenseData(sampleTransactions);
  assert.equal(ivse[0].Receitas, 5000);
  assert.equal(ivse[0].Despesas, 2220);

  const byCat = buildExpensesByCategoryData(sampleTransactions, sampleCategories);
  assert.equal(byCat[0].category, 'Moradia');
  assert.equal(byCat[0].amount, 1620);

  const monthly = buildMonthlyEvolutionData(sampleTransactions);
  assert.equal(monthly.length, 2);
  assert.equal(monthly[0].monthKey, '2026-10');
  assert.equal(monthly[1].monthKey, '2026-11');

  const timeline = buildTimelineMovementsData(sampleTransactions);
  assert.equal(timeline.length, 4);
});
