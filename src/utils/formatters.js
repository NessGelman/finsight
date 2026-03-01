const currencyFmt = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

const currencyFmt2 = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const numberFmt = new Intl.NumberFormat('en-US');

export function formatCurrency(val) {
  return currencyFmt.format(val);
}

export function formatCurrencyExact(val) {
  return currencyFmt2.format(val);
}

export function formatPercent(val, digits = 1) {
  return `${val.toFixed(digits)}%`;
}

export function formatNumber(val) {
  return numberFmt.format(val);
}

export function formatMonths(months) {
  if (months < 12) return `${months} mo`;
  const years = months / 12;
  return years === Math.floor(years) ? `${years} yr` : `${years.toFixed(1)} yr`;
}

export function creditScoreLabel(score) {
  if (score >= 800) return 'Exceptional';
  if (score >= 740) return 'Very Good';
  if (score >= 670) return 'Good';
  if (score >= 580) return 'Fair';
  return 'Poor';
}
