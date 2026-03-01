import { useState } from 'react';
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

function SidebarSection({ title, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="sidebar-card">
      <button className="sidebar-section-header" onClick={() => setOpen(o => !o)} aria-expanded={open}>
        <span className="sidebar-section-title">{title}</span>
        <span className="sidebar-section-icon">{open ? '−' : '+'}</span>
      </button>
      {open && <div className="sidebar-section-body">{children}</div>}
    </div>
  );
}

function SliderField({ label, tooltip, value, displayValue, sub, min, max, step, onChange }) {
  return (
    <div className="sidebar-field">
      <div className="sidebar-field-label-row">
        <span className="sidebar-field-label">
          {label}
          {tooltip && <Tooltip content={tooltip} />}
        </span>
        <span className="sidebar-field-value">{displayValue}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(Number(e.target.value))} />
      {sub && <span className="sidebar-field-sub">{sub}</span>}
    </div>
  );
}

export function InputPanel({ inputs, onUpdate }) {
  const { principal, annualRevenue, fixedExpenses, businessAge, creditScore, loanPurpose, industry } = inputs;
  const monthlyRevenue = Math.round(annualRevenue / 12);

  return (
    <div className="input-panel-sidebar">

      <SidebarSection title="Financing">
        <SliderField
          label="Loan Amount"
          tooltip={TOOLTIPS.loanAmount}
          value={principal}
          displayValue={formatCurrency(principal)}
          min={5000} max={2000000} step={5000}
          onChange={v => onUpdate('principal', v)}
        />
        <div className="sidebar-field">
          <span className="sidebar-field-label">Purpose</span>
          <div className="purpose-toggle-vert">
            {LOAN_PURPOSE_OPTIONS.map(opt => (
              <button
                key={opt.value}
                className={`purpose-btn-vert${loanPurpose === opt.value ? ' active' : ''}`}
                onClick={() => onUpdate('loanPurpose', opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </SidebarSection>

      <SidebarSection title="Business">
        <SliderField
          label="Annual Revenue"
          tooltip={TOOLTIPS.annualRevenue}
          value={annualRevenue}
          displayValue={formatCurrency(annualRevenue)}
          sub={`${formatCurrency(monthlyRevenue)}/mo`}
          min={50000} max={10000000} step={50000}
          onChange={v => onUpdate('annualRevenue', v)}
        />
        <SliderField
          label="Business Age"
          tooltip={TOOLTIPS.businessAge}
          value={businessAge}
          displayValue={`${businessAge} yr`}
          sub={businessAge < 2 ? 'Startup — higher rates' : null}
          min={0} max={20} step={1}
          onChange={v => onUpdate('businessAge', v)}
        />
        <div className="sidebar-field">
          <span className="sidebar-field-label">Industry</span>
          <select
            className="sidebar-select"
            value={industry}
            onChange={e => onUpdate('industry', e.target.value)}
          >
            {INDUSTRY_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </SidebarSection>

      <SidebarSection title="Risk">
        <SliderField
          label="Credit Score"
          tooltip={TOOLTIPS.creditScore}
          value={creditScore}
          displayValue={creditScore}
          sub={creditScoreLabel(creditScore)}
          min={300} max={850} step={10}
          onChange={v => onUpdate('creditScore', v)}
        />
        <SliderField
          label="Monthly Fixed Costs"
          tooltip={TOOLTIPS.fixedExpenses || 'Estimated total fixed expenses per month'}
          value={fixedExpenses}
          displayValue={formatCurrency(fixedExpenses)}
          min={0} max={500000} step={1000}
          onChange={v => onUpdate('fixedExpenses', v)}
        />
      </SidebarSection>

    </div>
  );
}
