// ─── Amortization helper ─────────────────────────────────────────────────────
function amortize(principal, apr, termMonths) {
  const monthlyRate = apr / 100 / 12;
  if (monthlyRate === 0) return principal / termMonths;
  return (
    principal *
    ((monthlyRate * Math.pow(1 + monthlyRate, termMonths)) /
      (Math.pow(1 + monthlyRate, termMonths) - 1))
  );
}

/**
 * Reverse amortization: given a target monthly payment, APR, and term,
 * returns the maximum principal that can be borrowed.
 * P = pmt × [(1 − (1 + r)^−n) / r]
 */
export function reverseAmortize(monthlyPayment, apr, termMonths) {
  const monthlyRate = apr / 100 / 12;
  if (monthlyRate === 0) return monthlyPayment * termMonths;
  return monthlyPayment * ((1 - Math.pow(1 + monthlyRate, -termMonths)) / monthlyRate);
}

// ─── Per-product calculation functions ───────────────────────────────────────

function annualizedCostMetrics(principal, totalCost, termMonths) {
  if (principal <= 0 || termMonths <= 0 || totalCost <= 0) {
    return { sac: 0, eac: 0 };
  }
  const totalBorrowingCost = Math.max(0, totalCost - principal);
  const sac = (totalBorrowingCost / principal) * (12 / termMonths) * 100;
  const growthMultiple = totalCost / principal;
  const eac = (Math.pow(growthMultiple, 12 / termMonths) - 1) * 100;
  return { sac, eac };
}

function calcCreditCard(principal, apr, termMonths) {
  const monthlyPayment = amortize(principal, apr, termMonths);
  const totalCost = monthlyPayment * termMonths;
  const interestAmount = totalCost - principal;
  const feeAmount = 0;
  const totalInterest = interestAmount + feeAmount;
  const { sac, eac } = annualizedCostMetrics(principal, totalCost, termMonths);
  return { totalCost, totalInterest, interestAmount, feeAmount, monthlyPayment, sac, eac, termMonths };
}

function calcSBA(principal, apr, termMonths) {
  // SBA guarantee fee based on loan amount
  const guaranteedPortion = principal * 0.75;
  let guaranteeFeeRate = 0.02;
  if (principal > 700000) guaranteeFeeRate = 0.0375;
  else if (principal > 150000) guaranteeFeeRate = 0.03;
  const guaranteeFee = guaranteedPortion * guaranteeFeeRate;

  const contractualMonthlyPayment = amortize(principal, apr, termMonths);
  const interestAmount = contractualMonthlyPayment * termMonths - principal;
  const feeAmount = guaranteeFee;
  const totalInterest = interestAmount + feeAmount;
  const totalCost = principal + totalInterest;
  const monthlyPayment = totalCost / termMonths;
  const { sac, eac } = annualizedCostMetrics(principal, totalCost, termMonths);
  return {
    totalCost,
    totalInterest,
    interestAmount,
    feeAmount,
    monthlyPayment,
    scheduleMonthlyPayment: contractualMonthlyPayment,
    sac,
    eac,
    termMonths,
  };
}

function calcLineOfCredit(principal, apr, termMonths) {
  // Interest-only monthly, principal repaid at end. Annual maintenance fee 0.75%.
  const monthlyRate = apr / 100 / 12;
  const monthlyInterest = principal * monthlyRate;
  const annualFee = principal * 0.0075;
  const feeAmount = annualFee * (termMonths / 12);
  const interestAmount = monthlyInterest * termMonths;
  const totalInterest = interestAmount + feeAmount;
  const totalCost = principal + totalInterest;
  const { sac, eac } = annualizedCostMetrics(principal, totalCost, termMonths);
  return {
    totalCost,
    totalInterest,
    interestAmount,
    feeAmount,
    monthlyPayment: totalCost / termMonths,
    sac,
    eac,
    termMonths,
  };
}

function calcMCA(principal, factorRate, termMonths) {
  const payback = principal * factorRate;
  const interestAmount = 0; // MCA doesn't charge "interest" — it's a factor fee
  const feeAmount = payback - principal;
  const totalInterest = feeAmount;
  const monthlyPayment = payback / termMonths;
  const { sac, eac } = annualizedCostMetrics(principal, payback, termMonths);
  return { totalCost: payback, totalInterest, interestAmount, feeAmount, monthlyPayment, sac, eac, termMonths };
}

function calcInvoiceFactoring(principal, monthlyFeeRate, termMonths) {
  // `principal` is cash needed now. With an 85% advance rate, the invoice face
  // value is larger than the advance. Fees and haircut are applied to that face.
  const invoiceFace = principal / 0.85;
  const monthlyFees = invoiceFace * (monthlyFeeRate / 100) * termMonths;
  const haircut = invoiceFace * 0.15; // 15% discount — never returned to borrower
  const feeAmount = monthlyFees + haircut;
  const interestAmount = 0;
  const totalInterest = feeAmount;
  const totalCost = principal + totalInterest; // comparable to other products' total payback
  const monthlyPayment = totalCost / termMonths;
  const { sac, eac } = annualizedCostMetrics(principal, totalCost, termMonths);
  return {
    totalCost,
    totalInterest,
    interestAmount,
    feeAmount,
    monthlyPayment,
    sac,
    eac,
    termMonths,
  };
}

function calcRBF(principal, capRate, annualRevenue) {
  // Repayment cap model: borrow $X, pay back $X × capRate total.
  // Start with 10% of monthly revenue as target share, then cap modeled term to 48 months.
  // If the cap binds, payment is normalized so payment × term = total cost.
  const totalCost = principal * capRate;
  const feeAmount = totalCost - principal;
  const monthlyRevenue = annualRevenue / 12;
  const targetRevenueSharePayment = monthlyRevenue * 0.10;
  const unconstrainedTerm = targetRevenueSharePayment > 0
    ? Math.ceil(totalCost / targetRevenueSharePayment)
    : 48;
  const estimatedTerm = Math.min(Math.max(6, unconstrainedTerm), 48);
  // Keep payment/term/total mathematically coherent when term is capped.
  const monthlyPayment = totalCost / estimatedTerm;
  const interestAmount = 0;
  const totalInterest = feeAmount;
  const { sac, eac } = annualizedCostMetrics(principal, totalCost, estimatedTerm);
  return { totalCost, totalInterest, interestAmount, feeAmount, monthlyPayment, sac, eac, termMonths: estimatedTerm };
}

function calcEquipmentFinancing(principal, apr, termMonths) {
  const monthlyPayment = amortize(principal, apr, termMonths);
  const totalCost = monthlyPayment * termMonths;
  const interestAmount = totalCost - principal;
  const feeAmount = 0;
  const totalInterest = interestAmount + feeAmount;
  const { sac, eac } = annualizedCostMetrics(principal, totalCost, termMonths);
  return { totalCost, totalInterest, interestAmount, feeAmount, monthlyPayment, sac, eac, termMonths };
}

function calcTermLoan(principal, apr, termMonths) {
  // 3% origination fee
  const originationFee = principal * 0.03;
  const contractualMonthlyPayment = amortize(principal, apr, termMonths);
  const interestAmount = contractualMonthlyPayment * termMonths - principal;
  const feeAmount = originationFee;
  const totalInterest = interestAmount + feeAmount;
  const totalCost = principal + totalInterest;
  const monthlyPayment = totalCost / termMonths;
  const { sac, eac } = annualizedCostMetrics(principal, totalCost, termMonths);
  return {
    totalCost,
    totalInterest,
    interestAmount,
    feeAmount,
    monthlyPayment,
    scheduleMonthlyPayment: contractualMonthlyPayment,
    sac,
    eac,
    termMonths,
  };
}

// ─── Credit score & age → rate adjustment ────────────────────────────────────

function creditMultiplier(creditScore) {
  if (creditScore >= 800) return 0.7;
  if (creditScore >= 740) return 0.85;
  if (creditScore >= 670) return 1.0;
  if (creditScore >= 580) return 1.25;
  return 1.6;
}

function collateralRateMultiplier(id, collateral = 'none') {
  const collateralSensitive = new Set(['sba', 'lineOfCredit', 'equipmentFinancing', 'termLoan']);
  if (!collateralSensitive.has(id)) return 1.0;
  if (collateral === 'full') return 0.88;
  if (collateral === 'partial') return 0.94;
  return 1.0;
}

/**
 * Build base rate parameters anchored to live Federal Reserve data when available.
 *
 * Prime-linked products (SBA, LOC, equipment, term loan) use the Fed Prime Rate
 * plus a product-specific spread that reflects typical market positioning:
 *   SBA 7(a):           Prime + 2.5%  (SBA max spread for loans >$50K, >7yr)
 *   Line of Credit:     Prime + 4.5%  (typical business LOC spread)
 *   Equipment:          Prime + 1.5%  (asset-backed, lower spread)
 *   Term Loan:          Prime + 7.5%  (unsecured, higher risk premium)
 *
 * Credit card rate is sourced directly from the Fed's quarterly survey
 * (TERMCBCCALLNS) when available, reflecting the current market average.
 *
 * MCA factor rates and invoice factoring fees are not tracked by federal
 * surveys; they use static industry estimates.
 */
export function buildBaseParams(liveRates) {
  const prime = liveRates?.prime?.value ?? 7.5;
  const ccRate = liveRates?.creditCard?.value ?? 21.5;

  return {
    creditCard: { apr: ccRate, termMonths: 18 },
    sba: { apr: prime + 2.5, termMonths: 84 },
    lineOfCredit: { apr: prime + 4.5, termMonths: 12 },
    mca: { factorRate: 1.35, termMonths: 9 },
    invoiceFactoring: { monthlyFeeRate: 2.5, termMonths: 4 },
    equipmentFinancing: { apr: prime + 1.5, termMonths: 48 },
    termLoan: { apr: prime + 7.5, termMonths: 36 },
    revenueBased: { capRate: 1.30 },
  };
}

function getParams(id, creditScore, businessAge, collateral, liveRates) {
  const base = { ...buildBaseParams(liveRates)[id] };
  const cm = creditMultiplier(creditScore);
  const ageMult = businessAge < 2 ? 1.2 : 1.0;
  const collateralMult = collateralRateMultiplier(id, collateral);
  if (base.apr !== undefined) {
    base.apr = Math.min(base.apr * cm * ageMult * collateralMult, 99);
  }
  return base;
}

// ─── Eligibility hints ───────────────────────────────────────────────────────

function getEligibility(id, { creditScore, businessAge, annualRevenue, principal, loanPurpose, industry, collateral = 'none' }) {
  const warnings = [];
  if (id === 'sba') {
    if (businessAge < 2) warnings.push('SBA typically requires 2+ years in business');
    if (creditScore < 640) warnings.push('SBA usually requires 640+ credit score');
    if (principal > 5000000) warnings.push('SBA max loan is $5M');
    if (industry === 'cannabis') warnings.push('SBA loans not available for cannabis/CBD businesses');
  }
  if (id === 'mca') {
    if (annualRevenue < principal * 2) warnings.push('MCA lenders typically require 2× annual revenue vs advance');
    warnings.push('Very high effective APR — last resort financing');
  }
  if (id === 'invoiceFactoring') {
    if (annualRevenue < 50000) warnings.push('Factoring best for businesses with regular B2B invoices');
    if (loanPurpose === 'equipment' || loanPurpose === 'realEstate') {
      warnings.push('Invoice factoring is for converting existing receivables, not new purchases');
    }
  }
  if (id === 'lineOfCredit' && creditScore < 600) {
    warnings.push('Low credit score may limit line of credit approval');
  }
  if (id === 'equipmentFinancing' && loanPurpose !== 'equipment' && loanPurpose !== 'any') {
    warnings.push('Equipment financing requires an equipment purchase purpose');
  }
  if ((id === 'sba' || id === 'lineOfCredit' || id === 'termLoan') && collateral === 'none') {
    warnings.push('No collateral may reduce approval odds and increase lender pricing');
  }
  if (id === 'revenueBased') {
    if (annualRevenue < 200000) warnings.push('RBF lenders typically require $200K+ annual revenue');
    if (creditScore < 550) warnings.push('Most RBF providers require 550+ credit score');
    if (industry !== 'technology' && industry !== 'general') {
      warnings.push('RBF works best for subscription or SaaS revenue models');
    }
  }
  return warnings;
}

// ─── Approval Odds Logic ──────────────────────────────────────────────────
function getApprovalOdds(id, { creditScore, businessAge, annualRevenue, principal, industry, collateral = 'none' }) {
  let score = 100;

  // Global modifiers
  if (creditScore < 550) score -= 40;
  if (creditScore < 600) score -= 20;
  if (creditScore > 740) score += 10;
  if (businessAge < 1) score -= 30;
  if (businessAge > 5) score += 15;
  if (collateral === 'partial') score += 8;
  if (collateral === 'full') score += 16;

  // Product specific logic
  switch (id) {
    case 'sba':
      if (creditScore < 640) score -= 50;
      if (businessAge < 2) score -= 40;
      if (industry === 'cannabis') score = 0;
      break;
    case 'mca':
      score += 20; // MCA is easy to get
      if (annualRevenue < principal) score -= 50;
      break;
    case 'lineOfCredit':
      if (creditScore < 680) score -= 30;
      break;
    case 'revenueBased':
      if (annualRevenue < 150000) score -= 30;
      if (industry === 'technology') score += 10;
      break;
    default:
      break;
  }

  return Math.min(100, Math.max(0, score));
}

// ─── Schedule generator ─────────────────────────────────────────────────────
function generateAmortizedSchedule(principal, monthlyPayment, termMonths, apr, upfrontFee = 0) {
  const schedule = [];
  let remaining = principal;
  const monthlyRate = apr / 100 / 12;

  for (let m = 1; m <= termMonths; m++) {
    const interest = remaining * monthlyRate;
    let principalPaid = monthlyPayment - interest;
    if (principalPaid > remaining) principalPaid = remaining;
    remaining = Math.max(0, remaining - principalPaid);
    const feePortion = m === 1 ? upfrontFee : 0;

    schedule.push({
      month: m,
      payment: monthlyPayment + feePortion,
      interest: interest + feePortion,
      principal: principalPaid,
      remaining
    });

    if (remaining <= 0 && m >= termMonths) break;
  }
  return schedule;
}

function generateBalloonSchedule(principal, termMonths, totalInterestAndFees) {
  const schedule = [];
  const baseInterest = termMonths > 0 ? totalInterestAndFees / termMonths : 0;
  let remaining = principal;

  for (let m = 1; m <= termMonths; m++) {
    const isLast = m === termMonths;
    const principalPaid = isLast ? remaining : 0;
    const payment = baseInterest + principalPaid;
    remaining = Math.max(0, remaining - principalPaid);
    schedule.push({
      month: m,
      payment,
      interest: baseInterest,
      principal: principalPaid,
      remaining,
    });
  }
  return schedule;
}

function generateFixedPaybackSchedule(principal, totalCost, termMonths) {
  const schedule = [];
  let remaining = principal;
  const payment = termMonths > 0 ? totalCost / termMonths : 0;
  const principalRatio = totalCost > 0 ? principal / totalCost : 0;

  for (let m = 1; m <= termMonths; m++) {
    const isLast = m === termMonths;
    let principalPaid = isLast ? remaining : payment * principalRatio;
    if (principalPaid > remaining) principalPaid = remaining;
    const feePortion = payment - principalPaid;
    remaining = Math.max(0, remaining - principalPaid);
    schedule.push({
      month: m,
      payment,
      interest: feePortion,
      principal: principalPaid,
      remaining,
    });
  }
  return schedule;
}

function generateScheduleByProduct(id, calc, params, principal) {
  const scheduleMonthly = calc.scheduleMonthlyPayment ?? calc.monthlyPayment;
  switch (id) {
    case 'creditCard':
    case 'equipmentFinancing':
      return generateAmortizedSchedule(principal, scheduleMonthly, calc.termMonths, params.apr || 0, 0);
    case 'sba':
    case 'termLoan':
      return generateAmortizedSchedule(principal, scheduleMonthly, calc.termMonths, params.apr || 0, calc.feeAmount || 0);
    case 'lineOfCredit':
      return generateBalloonSchedule(principal, calc.termMonths, calc.totalInterest);
    case 'mca':
    case 'invoiceFactoring':
    case 'revenueBased':
      return generateFixedPaybackSchedule(principal, calc.totalCost, calc.termMonths);
    default:
      return [];
  }
}

// ─── Master orchestrator ─────────────────────────────────────────────────────

const SPEED_MAP = {
  'creditCard': 1, // 1-2 days
  'mca': 2,        // 3-7 days
  'lineOfCredit': 1, // 1-2 days
  'invoiceFactoring': 2,
  'revenueBased': 2,
  'sba': 4,        // 4-8 weeks
  'equipmentFinancing': 3, // 1-2 weeks
  'termLoan': 3,
};

export function calculateAllOptions(
  {
    principal,
    annualRevenue,
    businessAge,
    creditScore,
    loanPurpose = 'any',
    industry = 'general',
    collateral = 'none',
  },
  liveRates = null
) {
  const monthlyFreeCashflow = (annualRevenue * 0.15) / 12;

  const products = [
    'creditCard',
    'sba',
    'lineOfCredit',
    'mca',
    'invoiceFactoring',
    'equipmentFinancing',
    'termLoan',
    'revenueBased',
  ];

  const results = products.map((id) => {
    const params = getParams(id, creditScore, businessAge, collateral, liveRates);
    let calc;
    switch (id) {
      case 'creditCard':
        calc = calcCreditCard(principal, params.apr, params.termMonths);
        break;
      case 'sba':
        calc = calcSBA(principal, params.apr, params.termMonths);
        break;
      case 'lineOfCredit':
        calc = calcLineOfCredit(principal, params.apr, params.termMonths);
        break;
      case 'mca':
        calc = calcMCA(principal, params.factorRate, params.termMonths);
        break;
      case 'invoiceFactoring':
        calc = calcInvoiceFactoring(principal, params.monthlyFeeRate, params.termMonths);
        break;
      case 'equipmentFinancing':
        calc = calcEquipmentFinancing(principal, params.apr, params.termMonths);
        break;
      case 'termLoan':
        calc = calcTermLoan(principal, params.apr, params.termMonths);
        break;
      case 'revenueBased':
        calc = calcRBF(principal, params.capRate, annualRevenue);
        break;
      default:
        calc = { totalCost: 0, totalInterest: 0, interestAmount: 0, feeAmount: 0, monthlyPayment: 0, sac: 0, eac: 0, termMonths: 12 };
    }

    const likelihood = getApprovalOdds(id, { creditScore, businessAge, annualRevenue, principal, industry, collateral });

    const schedule = generateScheduleByProduct(id, calc, params, principal);

    return {
      id,
      ...calc,
      principal,
      params,
      likelihood,
      schedule,
      speedOrder: SPEED_MAP[id] || 99,
      freeCashflowPct: monthlyFreeCashflow > 0 ? (calc.monthlyPayment / monthlyFreeCashflow) * 100 : 0,
      eligibilityWarnings: getEligibility(id, {
        creditScore,
        businessAge,
        annualRevenue,
        principal,
        loanPurpose,
        industry,
        collateral,
      }),
    };
  });

  const cheapestCost = Math.min(...results.map((r) => r.totalCost));

  return results.map((r) => ({
    ...r,
    vsCheapest: r.totalCost - cheapestCost,
    isCheapest: Math.abs(r.totalCost - cheapestCost) < 0.01,
  }));
}
