import { cents } from './money.js';

export const COMMISSION_NAMES = ['richard', 'anastasia', 'jean_claude'];
export function validateSplit(split) {
  const values = COMMISSION_NAMES.map((name) => Number(split[name]));
  if (values.some((value) => !Number.isFinite(value) || value < 0 || value > 100)) throw new Error('Each commission share must be between 0% and 100%.');
  if (values.reduce((a, b) => a + b, 0) !== 100) throw new Error('Commission shares must total exactly 100%.');
  return Object.fromEntries(COMMISSION_NAMES.map((name) => [name, Number(split[name])]));
}

// All calculations are in integer cents. The residual goes to the greatest share;
// ties follow Richard, Anastasia, Jean-Claude due to the ordered name list.
export function calculateCommissions(amount, split) {
  const saleCents = cents(amount);
  const percentages = validateSplit(split);
  const poolCents = Math.round(saleCents * 0.10);
  const amounts = Object.fromEntries(COMMISSION_NAMES.map((name) => [name, Math.floor(poolCents * percentages[name] / 100)]));
  const remainder = poolCents - Object.values(amounts).reduce((a, b) => a + b, 0);
  const winner = COMMISSION_NAMES.reduce((best, name) => percentages[name] > percentages[best] ? name : best, COMMISSION_NAMES[0]);
  amounts[winner] += remainder;
  return { poolCents, amounts, percentages };
}

export function computeDashboard(transactions) {
  const result = { A: { income: 0, commissions: 0, expenses: 0 }, B: { income: 0, commissions: 0, expenses: 0 }, company: { overhead: 0, awaiting: 0, income: 0, commissions: 0, expenses: 0 }, earned: Object.fromEntries(COMMISSION_NAMES.map(n => [n, 0])) };
  for (const t of transactions) {
    if (t.type === 'sale' && t.status === 'approved') {
      const amount = Number(t.amount_cents); const project = t.project;
      const commission = t.final_commission_amounts || {};
      const commissionTotal = Object.values(commission).reduce((a, b) => a + Number(b), 0);
      result[project].income += amount; result[project].commissions += commissionTotal;
      result.company.income += amount; result.company.commissions += commissionTotal;
      COMMISSION_NAMES.forEach(n => { result.earned[n] += Number(commission[n] || 0); });
    }
    if (t.type === 'expense') {
      const amount = Number(t.amount_cents); result.company.expenses += amount;
      if (t.status === 'awaiting_allocation') result.company.awaiting += amount;
      if (t.final_allocation === 'company_overhead') result.company.overhead += amount;
      if (t.final_allocation === 'A' || t.final_allocation === 'B') result[t.final_allocation].expenses += amount;
    }
  }
  for (const project of ['A', 'B']) result[project].result = result[project].income - result[project].commissions - result[project].expenses;
  result.company.result = result.company.income - result.company.commissions - result.company.expenses;
  return result;
}
