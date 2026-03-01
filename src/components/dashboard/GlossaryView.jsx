import { FINANCING_TYPES, FINANCING_ORDER } from '../../data/financingTypes';
import { formatCurrency, formatPercent, formatMonths } from '../../utils/formatters';

function PersonalizedNote({ id, result, inputs }) {
  if (!result || !inputs) return null;

  const notes = {
    sba: `For your ${formatCurrency(inputs.principal)} loan, SBA financing costs ${formatCurrency(result.totalCost)} total over ${formatMonths(result.termMonths)} — the lowest rate option if you qualify.`,
    lineOfCredit: `Your ${formatCurrency(inputs.principal)} line would cost ${formatCurrency(result.totalCost)} in interest/fees over ${formatMonths(result.termMonths)}, at ${formatCurrency(result.monthlyPayment)}/mo.`,
    creditCard: `Carrying ${formatCurrency(inputs.principal)} on a business card costs ${formatCurrency(result.totalCost)} total at ${formatPercent(result.sac)} effective annual rate.`,
    mca: `A ${formatCurrency(inputs.principal)} advance repays ${formatCurrency(result.totalCost)} — a ${formatPercent(((result.totalCost / inputs.principal) - 1) * 100)} premium above principal.`,
    invoiceFactoring: `Factoring ${formatCurrency(inputs.principal)} in invoices yields ${formatCurrency(inputs.principal * 0.85)} upfront. True cost is ${formatCurrency(result.totalInterest)} (fees + 15% haircut) — ${formatPercent(result.sac)} effective annual rate.`,
    revenueBased: `For your ${formatCurrency(inputs.principal)} advance, you repay ${formatCurrency(result.totalCost)} total (1.30× cap). Estimated ${formatMonths(result.termMonths)} repayment at 10% of monthly revenue.`,
    equipmentFinancing: `${formatCurrency(inputs.principal)} financed for equipment costs ${formatCurrency(result.totalCost)} total over ${formatMonths(result.termMonths)} at ${formatCurrency(result.monthlyPayment)}/mo.`,
    termLoan: `A ${formatCurrency(inputs.principal)} term loan costs ${formatCurrency(result.totalCost)} total (including 3% origination fee) over ${formatMonths(result.termMonths)}.`,
  };

  const text = notes[id];
  if (!text) return null;

  return (
    <div className="glossary-personalized">
      <span className="glossary-personalized-label">Your numbers</span>
      <p className="glossary-personalized-text">{text}</p>
    </div>
  );
}

export function GlossaryView({ results, inputs }) {
  const resultMap = results
    ? Object.fromEntries(results.map((r) => [r.id, r]))
    : {};

  return (
    <div className="glossary-view">
      <div className="section-header">
        <span className="section-title">Financing Options — Reference Guide</span>
        {inputs && (
          <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
            Personalized for {formatCurrency(inputs.principal)} loan
          </span>
        )}
      </div>
      <div className="glossary-grid">
        {FINANCING_ORDER.map((id) => {
          const ft = FINANCING_TYPES[id];
          return (
            <div className="glossary-card" key={id}>
              <div className="glossary-card-header">
                <span className="glossary-dot" style={{ backgroundColor: ft.color }} />
                <span className="glossary-title">{ft.label}</span>
              </div>
              <p className="glossary-desc">{ft.description}</p>
              <div className="glossary-pros-cons">
                <div>
                  <div className="glossary-list-title pros-title">Pros</div>
                  <ul className="glossary-list pros-list">
                    {ft.pros.map((p, i) => <li key={i}>{p}</li>)}
                  </ul>
                </div>
                <div>
                  <div className="glossary-list-title cons-title">Cons</div>
                  <ul className="glossary-list cons-list">
                    {ft.cons.map((c, i) => <li key={i}>{c}</li>)}
                  </ul>
                </div>
              </div>
              <PersonalizedNote id={id} result={resultMap[id]} inputs={inputs} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
