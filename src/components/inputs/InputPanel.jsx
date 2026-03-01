import { Tooltip } from '../shared/Tooltip';
import { TOOLTIPS } from '../../data/tooltipContent';
import { formatCurrency, creditScoreLabel } from '../../utils/formatters';

const LOAN_PURPOSE_OPTIONS = [
  { value: 'any',           label: 'Any Purpose' },
  { value: 'workingCapital', label: 'Working Capital' },
  { value: 'equipment',     label: 'Equipment' },
  { value: 'realEstate',    label: 'Real Estate' },
];

const INDUSTRY_OPTIONS = [
  { value: 'general',      label: 'General / Retail' },
  { value: 'foodBeverage', label: 'Food & Beverage' },
  { value: 'healthcare',   label: 'Healthcare' },
  { value: 'technology',   label: 'Technology / SaaS' },
  { value: 'construction', label: 'Construction' },
  { value: 'cannabis',     label: 'Cannabis / CBD' },
];

export function InputPanel({ inputs, onUpdate }) {
  const { principal, annualRevenue, businessAge, creditScore, loanPurpose, industry } = inputs;
  const monthlyRevenue = Math.round(annualRevenue / 12);

  return (
    <div className="input-panel">
      {/* Row 1: sliders */}
      <InputGroup
        data-accent="blue"
        label="Loan Amount"
        tooltip={TOOLTIPS.loanAmount}
        value={formatCurrency(principal)}
      >
        <input
          type="range"
          min={5000}
          max={2000000}
          step={5000}
          value={principal}
          onChange={(e) => onUpdate('principal', Number(e.target.value))}
        />
      </InputGroup>

      <InputGroup
        data-accent="green"
        label="Annual Revenue"
        tooltip={TOOLTIPS.annualRevenue}
        value={formatCurrency(annualRevenue)}
        sub={`${formatCurrency(monthlyRevenue)}/mo`}
      >
        <input
          type="range"
          min={50000}
          max={10000000}
          step={50000}
          value={annualRevenue}
          onChange={(e) => onUpdate('annualRevenue', Number(e.target.value))}
        />
      </InputGroup>

      <InputGroup
        data-accent="purple"
        label="Business Age"
        tooltip={TOOLTIPS.businessAge}
        value={`${businessAge} yr`}
        sub={businessAge < 2 ? 'Startup — higher rates' : null}
      >
        <input
          type="range"
          min={0}
          max={20}
          step={1}
          value={businessAge}
          onChange={(e) => onUpdate('businessAge', Number(e.target.value))}
        />
      </InputGroup>

      <InputGroup
        data-accent="amber"
        label="Credit Score"
        tooltip={TOOLTIPS.creditScore}
        value={creditScore}
        sub={creditScoreLabel(creditScore)}
      >
        <input
          type="range"
          min={300}
          max={850}
          step={10}
          value={creditScore}
          onChange={(e) => onUpdate('creditScore', Number(e.target.value))}
        />
        <div className="credit-score-bar" />
      </InputGroup>

      {/* Row 2: Loan Purpose + Industry */}
      <InputGroup
        data-accent="blue"
        label="Loan Purpose"
        tooltip={TOOLTIPS.loanPurpose}
        value={null}
        row2
      >
        <div className="purpose-toggle">
          {LOAN_PURPOSE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              className={`purpose-btn${loanPurpose === opt.value ? ' active' : ''}`}
              onClick={() => onUpdate('loanPurpose', opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </InputGroup>

      <InputGroup
        data-accent="green"
        label="Industry"
        tooltip={TOOLTIPS.industry}
        value={null}
        row2
      >
        <select
          className="industry-select"
          value={industry}
          onChange={(e) => onUpdate('industry', e.target.value)}
        >
          {INDUSTRY_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </InputGroup>

      {/* Spacer cells to fill row 2 columns 3 and 4 */}
      <div className="input-group input-group--empty" />
      <div className="input-group input-group--empty" />
    </div>
  );
}

function InputGroup({ label, tooltip, value, sub, children, 'data-accent': accent, row2 }) {
  return (
    <div className={`input-group${row2 ? ' input-group--row2' : ''}`} data-accent={accent}>
      <div className="input-label-row">
        <span className="input-label">
          {label}
          {tooltip && <Tooltip content={tooltip} />}
        </span>
        {value != null && <span className="input-value">{value}</span>}
      </div>
      {children}
      {sub && <span className="input-sub">{sub}</span>}
    </div>
  );
}
