import { useState } from 'react';

const CREDIT_MULTIPLIERS = [
  { range: '800+', label: 'Exceptional', mult: '0.70×', color: '#16a34a' },
  { range: '740–799', label: 'Very Good',   mult: '0.85×', color: '#2563EB' },
  { range: '670–739', label: 'Good',        mult: '1.00×', color: '#6b7280' },
  { range: '580–669', label: 'Fair',        mult: '1.25×', color: '#d97706' },
  { range: '< 580',   label: 'Poor',        mult: '1.60×', color: '#dc2626' },
];

export function MethodologyPanel() {
  const [open, setOpen] = useState(false);

  return (
    <div className="methodology-panel">
      <button className="methodology-toggle" onClick={() => setOpen((o) => !o)}>
        <span className="methodology-toggle-label">How We Calculate</span>
        <span className="methodology-toggle-icon">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="methodology-body">
          <div className="methodology-grid">

            <div className="methodology-section">
              <div className="methodology-section-title">SAC Formula</div>
              <p className="methodology-text">
                Standardized Annual Cost (SAC) converts any financing structure into a single annual percentage for apples-to-apples comparison:
              </p>
              <div className="methodology-formula">
                SAC = (Total Interest + Fees) ÷ Principal × (12 ÷ Term Months) × 100
              </div>
              <p className="methodology-text">
                Unlike APR, SAC includes all fees (origination, guarantee, maintenance) and normalizes for term length.
              </p>
            </div>

            <div className="methodology-section">
              <div className="methodology-section-title">Live Rate Sources</div>
              <p className="methodology-text">
                Rates are fetched from the Federal Reserve Economic Data (FRED) API on page load and cached for 24 hours:
              </p>
              <ul className="methodology-list">
                <li><strong>Prime Rate</strong> — FRED series <code>PRIME</code>. Used as base for SBA, LOC, Equipment Financing, and Term Loans with product-specific spreads.</li>
                <li><strong>Credit Card Rate</strong> — FRED series <code>TERMCBCCALLNS</code>. Used directly for business credit card products.</li>
                <li><strong>MCA &amp; Factoring</strong> — Not tracked by federal surveys; use static industry estimates (1.35× factor rate; 2.5% monthly fee rate).</li>
              </ul>
            </div>

            <div className="methodology-section">
              <div className="methodology-section-title">Rate Spreads</div>
              <ul className="methodology-list">
                <li>SBA 7(a): Prime + 2.5%</li>
                <li>Line of Credit: Prime + 4.5%</li>
                <li>Equipment Financing: Prime + 1.5%</li>
                <li>Term Loan: Prime + 7.5%</li>
              </ul>
              <p className="methodology-text" style={{ marginTop: 8 }}>
                Spreads reflect typical market positioning for each product tier.
              </p>
            </div>

            <div className="methodology-section">
              <div className="methodology-section-title">Credit Score Multiplier</div>
              <p className="methodology-text">
                Your credit score adjusts the base APR for eligible products:
              </p>
              <table className="methodology-table">
                <thead>
                  <tr>
                    <th>Score</th>
                    <th>Tier</th>
                    <th>Rate Multiplier</th>
                  </tr>
                </thead>
                <tbody>
                  {CREDIT_MULTIPLIERS.map((row) => (
                    <tr key={row.range}>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>{row.range}</td>
                      <td style={{ color: row.color, fontWeight: 600 }}>{row.label}</td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>{row.mult}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="methodology-section">
              <div className="methodology-section-title">Assumptions</div>
              <ul className="methodology-list">
                <li><strong>Free Cash Flow</strong> — Estimated at 15% of annual revenue per month. Used for FCF% column.</li>
                <li><strong>Invoice Factoring</strong> — Advance rate 85%; 15% haircut permanently kept by the factor. Monthly fee applied to full invoice face value. Total cost includes both the haircut and the monthly fees.</li>
                <li><strong>SBA Guarantee Fee</strong> — 2% for loans ≤$150K, 3% for $150K–$700K, 3.75% for &gt;$700K (on 75% guaranteed portion).</li>
                <li><strong>Term Loan Origination</strong> — 3% origination fee added to total cost.</li>
                <li><strong>Business Age</strong> — If under 2 years, applies a 1.2× rate multiplier reflecting higher lender risk.</li>
              </ul>
            </div>

            <div className="methodology-section">
              <div className="methodology-section-title">Limitations</div>
              <ul className="methodology-list">
                <li>Results are estimates for comparison purposes — actual lender terms will vary.</li>
                <li>Collateral, industry type, and personal guarantees affect real offers.</li>
                <li>Eligibility checks are simplified; consult a lender for definitive qualification.</li>
                <li>MCA and factoring costs modeled as static; actual costs depend on daily revenue and collections.</li>
              </ul>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
