import { useMemo } from 'react';
import { calculateAllOptions } from '../engine/financingCalculator';
import { FINANCING_TYPES } from '../data/financingTypes';

export function useFinancingResults(inputs, liveRates = null) {
  const primeKey = liveRates?.prime?.value ?? null;
  const ccKey = liveRates?.creditCard?.value ?? null;

  return useMemo(() => {
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
    if (!principal || principal <= 0 || !annualRevenue || annualRevenue <= 0) {
      return [];
    }
    const raw = calculateAllOptions(
      { principal, annualRevenue, fixedExpenses, businessAge, creditScore, loanPurpose, industry, collateral },
      liveRates,
    );
    return raw.map((r) => ({
      ...FINANCING_TYPES[r.id],
      ...r,
    }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    inputs.principal,
    inputs.annualRevenue,
    inputs.fixedExpenses,
    inputs.businessAge,
    inputs.creditScore,
    inputs.loanPurpose,
    inputs.industry,
    inputs.collateral,
    primeKey,
    ccKey,
  ]);
}
