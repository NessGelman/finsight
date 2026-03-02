import { useState, useCallback } from 'react';
import { Tooltip } from '../shared/Tooltip';
import { TOOLTIPS } from '../../data/tooltipContent';
import { formatCurrency, creditScoreLabel } from '../../utils/formatters';

const LOAN_PURPOSE_OPTIONS = [
  { value: 'any', label: 'Any Purpose' },
  { value: 'workingCapital', label: 'Working Capital' },
  { value: 'equipment', label: 'Equipment' },
  { value: 'realEstate', label: 'Real Estate' },
];

const INDUSTRY_OPTIONS = [
  { value: 'general', label: 'General / Retail' },
  { value: 'foodBeverage', label: 'Food & Beverage' },
  { value: 'healthcare', label: 'Healthcare' },
  { value: 'technology', label: 'Technology / SaaS' },
  { value: 'construction', label: 'Construction' },
  { value: 'cannabis', label: 'Cannabis / CBD' },
];

const COLLATERAL_OPTIONS = [
  { value: 'none', label: 'None' },
  { value: 'partial', label: 'Partial' },
  { value: 'full', label: 'Full' },
];

/**
 * A slider + inline-editable text number input pair.
 * `rawValue` is the parsed number. `displayValue` is the formatted string shown in the text input.
 */
function SliderWithText({
  min,
  max,
  step,
  value,
  onChange,
  formatDisplay,
  parseInput,
  inputPrefix = '',
  inputSuffix = '',
}) {
  const [localText, setLocalText] = useState(null); // null = not editing

  const displayStr = localText !== null ? localText : formatDisplay(value);

  const commitText = useCallback(
    (raw) => {
      const parsed = parseInput(raw);
      if (parsed != null && !isNaN(parsed)) {
        onChange(parsed);
      }
      setLocalText(null);
    },
    [onChange, parseInput],
  );

  return (
    <div className="slider-text-pair">
      <div className="slider-text-input-wrap">
        {inputPrefix && <span className="slider-text-prefix">{inputPrefix}</span>}
        <input
          type="text"
          className="slider-text-input"
          value={displayStr}
          onChange={(e) => setLocalText(e.target.value)}
          onBlur={(e) => commitText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.target.blur();
            if (e.key === 'ArrowUp') {
              e.preventDefault();
              onChange(Math.min(max, value + step));
              setLocalText(null);
            }
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              onChange(Math.max(min, value - step));
              setLocalText(null);
            }
          }}
          inputMode="numeric"
        />
        {inputSuffix && <span className="slider-text-suffix">{inputSuffix}</span>}
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => {
          onChange(Number(e.target.value));
          setLocalText(null);
        }}
      />
    </div>
  );
}

export function InputPanel({ inputs, onUpdate, onReset }) {
  const {
    principal,
    annualRevenue,
    fixedExpenses,
    businessAge,
    creditScore,
    loanPurpose,
    industry,
    collateral = 'none',
    employeeCount = 10,
    preferredTermMonths = 36,
    desiredMonthlyPayment = 3000,
  } = inputs;

  const monthlyRevenue = Math.round(annualRevenue / 12);

  // Raw-number parsers — strip currency symbols, commas
  const parseCurrency = (s) => {
    const n = Number(String(s).replace(/[^0-9.]/g, ''));
    return isNaN(n) ? null : n;
  };
  const parseInteger = (s) => {
    const n = parseInt(String(s).replace(/[^0-9]/g, ''), 10);
    return isNaN(n) ? null : n;
  };

  return (
    <div className="input-panel">
      {/* Sidebar header */}
      <div className="sidebar-header">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 44" width="140" height="32" aria-hidden="true">
          <defs>
            <linearGradient id="fsLogoGradient2" x1="0" y1="1" x2="0" y2="0">
              <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.55" />
              <stop offset="100%" stopColor="#4ade80" />
            </linearGradient>
          </defs>
          <rect x="3" y="30" width="7" height="10" rx="1.5" fill="url(#fsLogoGradient2)" opacity="0.5" />
          <rect x="14" y="20" width="7" height="20" rx="1.5" fill="url(#fsLogoGradient2)" opacity="0.7" />
          <rect x="25" y="9" width="7" height="31" rx="1.5" fill="url(#fsLogoGradient2)" />
          <polyline points="6,28 17,18 28,7" fill="none" stroke="#4ade80" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" opacity="0.75" />
          <polyline points="22,5 28,7 30,13" fill="none" stroke="#4ade80" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
          <text x="44" y="31" fontFamily="system-ui,-apple-system,sans-serif" fontSize="21" fontWeight="700" fill="#4ade80">Finsight</text>
        </svg>
        {onReset && (
          <button className="sidebar-reset-btn" onClick={onReset} title="Reset to defaults">
            Reset
          </button>
        )}
      </div>

      <div className="sidebar-section-label">Financials</div>

      <InputGroup data-accent="blue" label="Loan Amount" tooltip={TOOLTIPS.loanAmount}>
        <SliderWithText
          min={5000} max={2000000} step={5000} value={principal}
          onChange={(v) => onUpdate('principal', v)}
          formatDisplay={(v) => formatCurrency(v).replace('$', '')}
          parseInput={parseCurrency} inputPrefix="$"
        />
      </InputGroup>

      <InputGroup data-accent="green" label="Annual Revenue" tooltip={TOOLTIPS.annualRevenue} sub={`${formatCurrency(monthlyRevenue)}/mo`}>
        <SliderWithText
          min={50000} max={10000000} step={50000} value={annualRevenue}
          onChange={(v) => onUpdate('annualRevenue', v)}
          formatDisplay={(v) => formatCurrency(v).replace('$', '')}
          parseInput={parseCurrency} inputPrefix="$"
        />
      </InputGroup>

      <InputGroup data-accent="amber" label="Monthly Fixed Costs" tooltip={TOOLTIPS.fixedExpenses || 'Estimated total fixed expenses per month'}>
        <SliderWithText
          min={0} max={500000} step={1000} value={fixedExpenses}
          onChange={(v) => onUpdate('fixedExpenses', v)}
          formatDisplay={(v) => formatCurrency(v).replace('$', '')}
          parseInput={parseCurrency} inputPrefix="$"
        />
      </InputGroup>

      <InputGroup data-accent="blue" label="Desired Monthly Payment" tooltip={TOOLTIPS.desiredMonthlyPayment || 'Your target maximum monthly payment.'}>
        <SliderWithText
          min={500} max={50000} step={500} value={desiredMonthlyPayment}
          onChange={(v) => onUpdate('desiredMonthlyPayment', v)}
          formatDisplay={(v) => formatCurrency(v).replace('$', '')}
          parseInput={parseCurrency} inputPrefix="$"
        />
      </InputGroup>

      <div className="sidebar-section-label">Profile</div>

      <InputGroup data-accent="purple" label="Business Age" tooltip={TOOLTIPS.businessAge} sub={businessAge < 2 ? 'Startup — higher rates' : null}>
        <SliderWithText
          min={0} max={20} step={1} value={businessAge}
          onChange={(v) => onUpdate('businessAge', v)}
          formatDisplay={(v) => String(v)} parseInput={parseInteger} inputSuffix="yr"
        />
      </InputGroup>

      <InputGroup data-accent="amber" label="Credit Score" tooltip={TOOLTIPS.creditScore} sub={creditScoreLabel(creditScore)}>
        <SliderWithText
          min={300} max={850} step={10} value={creditScore}
          onChange={(v) => onUpdate('creditScore', v)}
          formatDisplay={(v) => String(v)} parseInput={parseInteger}
        />
        <div className="credit-score-bar" />
      </InputGroup>

      <InputGroup data-accent="green" label="Preferred Term" tooltip={TOOLTIPS.preferredTermMonths || 'Preferred repayment period in months.'}>
        <SliderWithText
          min={3} max={120} step={3} value={preferredTermMonths}
          onChange={(v) => onUpdate('preferredTermMonths', v)}
          formatDisplay={(v) => String(v)} parseInput={parseInteger} inputSuffix="mo"
        />
      </InputGroup>

      <InputGroup data-accent="purple" label="Employees" tooltip={TOOLTIPS.employeeCount || 'Number of full-time employees.'}>
        <SliderWithText
          min={1} max={500} step={1} value={employeeCount}
          onChange={(v) => onUpdate('employeeCount', v)}
          formatDisplay={(v) => String(v)} parseInput={parseInteger}
        />
      </InputGroup>

      <div className="sidebar-section-label">Details</div>

      <InputGroup data-accent="blue" label="Loan Purpose" tooltip={TOOLTIPS.loanPurpose}>
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

      <InputGroup data-accent="green" label="Industry" tooltip={TOOLTIPS.industry}>
        <select className="industry-select" value={industry} onChange={(e) => onUpdate('industry', e.target.value)}>
          {INDUSTRY_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </InputGroup>

      <InputGroup data-accent="amber" label="Collateral" tooltip={TOOLTIPS.collateral || 'Collateral available to secure the loan.'}>
        <div className="purpose-toggle">
          {COLLATERAL_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              className={`purpose-btn${collateral === opt.value ? ' active' : ''}`}
              onClick={() => onUpdate('collateral', opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </InputGroup>
    </div>
  );
}

function InputGroup({ label, tooltip, value, sub, children, 'data-accent': accent }) {
  return (
    <div className="input-group" data-accent={accent}>
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
