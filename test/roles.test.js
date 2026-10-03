import test from 'node:test';
import assert from 'node:assert/strict';
import { canSubmitExpense, canSubmitSale, isManager } from '../src/lib/roles.js';

test('website form permissions match the database employee roles', () => {
  assert.equal(canSubmitSale('salesperson'), true);
  assert.equal(canSubmitExpense('expense_reporter'), true);
  assert.equal(isManager('manager'), true);
  assert.equal(canSubmitSale('expense_reporter'), false);
  assert.equal(canSubmitExpense('salesperson'), false);
  assert.equal(isManager('salesperson'), false);
});
