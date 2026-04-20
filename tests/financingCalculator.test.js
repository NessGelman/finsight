import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateAllOptions } from '../src/engine/financingCalculator.js';

function findProduct(results, id) {
  return results.find((r) => r.id === id);
}

test('approval odds credit bands do not double-penalize subprime scores', () => {
  const baseInputs = {
    principal: 100000,
    annualRevenue: 500000,
    fixedExpenses: 0,
    businessAge: 3,
    creditScore: 540,
    loanPurpose: 'any',
    industry: 'general',
    collateral: 'none',
  };

  const lowScore = findProduct(calculateAllOptions(baseInputs, null, { skipSchedules: true }), 'termLoan').likelihood;
  const midScore = findProduct(calculateAllOptions({ ...baseInputs, creditScore: 590 }, null, { skipSchedules: true }), 'termLoan').likelihood;

  assert.equal(midScore - lowScore, 20);
  assert.ok(lowScore > 0 && midScore > lowScore);
});

test('free cashflow percentage is null when cashflow is negative', () => {
  const results = calculateAllOptions({
    principal: 50000,
    annualRevenue: 24000,
    fixedExpenses: 40000,
    businessAge: 2,
    creditScore: 700,
    loanPurpose: 'any',
    industry: 'general',
    collateral: 'none',
  }, null, { skipSchedules: true });

  const mca = findProduct(results, 'mca');
  assert.equal(mca.freeCashflowPct, null);
});

test('line of credit scales cost and payment with utilization', () => {
  const principal = 100000;
  const utilization = 0.35;
  const results = calculateAllOptions({
    principal,
    annualRevenue: 600000,
    fixedExpenses: 0,
    businessAge: 3,
    creditScore: 700,
    loanPurpose: 'any',
    industry: 'general',
    collateral: 'none',
  }, null, { skipSchedules: true, locUtilizationPct: utilization });

  const loc = findProduct(results, 'lineOfCredit');
  const expectedMonthly = principal * (0.12 / 12) * utilization; // Prime (7.5) + 4.5 = 12%
  const expectedTotal = principal + (expectedMonthly * 12) + (principal * 0.0075 * utilization);

  assert.ok(Math.abs(loc.monthlyPayment - expectedMonthly) < 1e-6);
  assert.ok(Math.abs(loc.totalCost - expectedTotal) < 0.01);
});

test('revenue-based financing exposes expected and capped terms', () => {
  const results = calculateAllOptions({
    principal: 50000,
    annualRevenue: 120000,
    fixedExpenses: 0,
    businessAge: 3,
    creditScore: 700,
    loanPurpose: 'any',
    industry: 'technology',
    collateral: 'none',
  }, null, { skipSchedules: true });

  const rbf = findProduct(results, 'revenueBased');
  assert.equal(rbf.expectedTermMonths, 109); // updated for 6% revenue share (was 65 at 10%)
  assert.equal(rbf.termMonths, 48); // capped
  assert.ok(Math.abs(rbf.monthlyPayment - (rbf.totalCost / 48)) < 0.01);
});
