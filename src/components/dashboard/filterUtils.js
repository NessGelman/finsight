import { SPEED } from '../../data/speedData';

export function matchesFilter(result, filterId, results) {
  if (filterId === 'all') return true;

  if (filterId === 'fast') {
    const tier = SPEED[result.id]?.tier;
    return tier === 'fast';
  }

  if (filterId === 'lowCost') {
    const sorted = [...results].sort((a, b) => a.totalCost - b.totalCost);
    const threshold = sorted[Math.min(2, sorted.length - 1)]?.totalCost ?? Infinity;
    return result.totalCost <= threshold;
  }

  if (filterId === 'lowMonthly') {
    const sorted = [...results].sort((a, b) => a.monthlyPayment - b.monthlyPayment);
    const threshold = sorted[Math.min(2, sorted.length - 1)]?.monthlyPayment ?? Infinity;
    return result.monthlyPayment <= threshold;
  }

  if (filterId === 'eligible') {
    return !result.eligibilityWarnings?.some((w) => /requires?/i.test(w));
  }

  return true;
}
