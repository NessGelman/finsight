import { useMemo } from 'react';
import { calculateAllOptions } from '../engine/financingCalculator';
import { FINANCING_TYPES } from '../data/financingTypes';

export function useFinancingResults(inputs, liveRates = null) {
  const {
    principal,
    annualRevenue,
    fixedExpenses,
    businessAge,
    creditScore,
    loanPurpose,
    industry,
    collateral,
  } = inputs;

  const primeKey = liveRates?.prime?.value ?? null;
  const ccKey = liveRates?.creditCard?.value ?? null;
  const rateSnapshot = useMemo(() => {
    if (primeKey == null && ccKey == null) return null;
    return {
      prime: liveRates?.prime ?? null,
      creditCard: liveRates?.creditCard ?? null,
    };
  }, [liveRates?.prime, liveRates?.creditCard, primeKey, ccKey]);

  return useMemo(() => {
    if (!principal || principal <= 0 || !annualRevenue || annualRevenue <= 0) {
      return [];
    }
    const raw = calculateAllOptions(
      { principal, annualRevenue, fixedExpenses, businessAge, creditScore, loanPurpose, industry, collateral },
      rateSnapshot,
    );
    return raw.map((r) => ({
      ...FINANCING_TYPES[r.id],
      ...r,
    }));
  }, [
    principal,
    annualRevenue,
    fixedExpenses,
    businessAge,
    creditScore,
    loanPurpose,
    industry,
    collateral,
    rateSnapshot,
  ]);
}
