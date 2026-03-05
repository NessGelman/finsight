import { SPEED } from '../data/speedData';

const LOAN_PURPOSES = new Set(['any', 'workingCapital', 'equipment', 'realEstate']);
const INDUSTRIES = new Set(['general', 'foodBeverage', 'healthcare', 'technology', 'construction', 'cannabis']);

function escapeCsv(val) {
  const str = String(val ?? '');
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function exportToCSV(results, inputs) {
  const meta = [
    ['Finsight — Financing Comparison Export'],
    [`Generated: ${new Date().toLocaleString()}`],
    [],
    ['--- Inputs ---'],
    ['Loan Amount', inputs.principal],
    ['Annual Revenue', inputs.annualRevenue],
    ['Business Age (yr)', inputs.businessAge],
    ['Credit Score', inputs.creditScore],
    [],
    ['--- Results ---'],
  ];

  const headers = [
    'Option',
    'Total Cost',
    'Interest',
    'Fees',
    'SAC (%)',
    'EAC (%)',
    'VS Cheapest ($)',
    'Cashflow % of Monthly FCF',
    'Avg Monthly Payment',
    'Term (months)',
    'Funding Speed',
    'Eligibility',
    'Best Deal?',
  ];

  const rows = results.map((r) => [
    r.label,
    r.totalCost.toFixed(2),
    (r.interestAmount ?? 0).toFixed(2),
    (r.feeAmount ?? 0).toFixed(2),
    r.sac.toFixed(2),
    (r.eac ?? r.sac).toFixed(2),
    r.vsCheapest.toFixed(2),
    r.freeCashflowPct.toFixed(2),
    r.monthlyPayment.toFixed(2),
    r.termMonths,
    SPEED[r.id]?.label ?? '',
    r.eligibilityWarnings?.length ? `⚠ ${r.eligibilityWarnings.join('; ')}` : '✓ Eligible',
    r.isCheapest ? 'YES' : '',
  ]);

  const csvLines = [
    ...meta.map((row) => row.map(escapeCsv).join(',')),
    headers.map(escapeCsv).join(','),
    ...rows.map((row) => row.map(escapeCsv).join(',')),
  ];

  const csvContent = csvLines.join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `finsight-${Date.now()}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Encode current inputs into a share URL and copy to clipboard.
 * Params: p=principal, r=annualRevenue, a=businessAge, c=creditScore
 */
export function copyShareLink(inputs) {
  const base = window.location.origin + window.location.pathname;
  const params = new URLSearchParams({
    p: inputs.principal,
    r: inputs.annualRevenue,
    a: inputs.businessAge,
    c: inputs.creditScore,
    lp: inputs.loanPurpose,
    ind: inputs.industry,
  });
  const url = `${base}?${params.toString()}`;
  if (navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(url).then(() => url);
  }

  // Fallback for environments where Clipboard API is unavailable.
  const temp = document.createElement('textarea');
  temp.value = url;
  temp.setAttribute('readonly', '');
  temp.style.position = 'absolute';
  temp.style.left = '-9999px';
  document.body.appendChild(temp);
  temp.select();
  document.execCommand('copy');
  document.body.removeChild(temp);
  return Promise.resolve(url);
}

/**
 * Parse inputs from URL query params on load. Returns null if no params present.
 */
export function parseShareParams() {
  const params = new URLSearchParams(window.location.search);
  if (!params.has('p')) return null;

  const parsedPurpose = params.get('lp');
  const parsedIndustry = params.get('ind');

  return {
    principal: Number(params.get('p')) || 100000,
    annualRevenue: Number(params.get('r')) || 500000,
    businessAge: Number(params.get('a')) || 3,
    creditScore: Number(params.get('c')) || 700,
    loanPurpose: LOAN_PURPOSES.has(parsedPurpose) ? parsedPurpose : 'any',
    industry: INDUSTRIES.has(parsedIndustry) ? parsedIndustry : 'general',
  };
}
