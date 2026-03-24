import { useState } from 'react';
import { recordOnboarding, saveOnboardingProfile } from '../../services/dataCollectionService';

const INDUSTRIES = [
  'Restaurant / Food & Beverage',
  'Retail',
  'Healthcare / Medical',
  'Construction / Contracting',
  'Professional Services',
  'Technology / SaaS',
  'Manufacturing',
  'Transportation / Logistics',
  'Real Estate',
  'Beauty / Personal Services',
  'Auto Services',
  'Fitness / Wellness',
  'E-commerce',
  'Other',
];

const LOAN_PURPOSES = [
  'Working capital / cash flow',
  'Equipment purchase',
  'Business expansion',
  'Inventory',
  'Hire staff',
  'Marketing / growth',
  'Refinance existing debt',
  'Real estate / lease',
];

const URGENCY_OPTIONS = [
  { value: '0-30days', label: 'ASAP (within 30 days)' },
  { value: '1-3months', label: 'Soon (1–3 months)' },
  { value: '3-6months', label: 'Planning ahead (3–6 months)' },
  { value: 'exploring', label: 'Just exploring' },
];

const EMPLOYEE_RANGES = ['Solo / 1', '2–5', '6–15', '16–50', '51–200', '200+'];

const REVENUE_RANGES = [
  '<$100k',
  '$100k–$250k',
  '$250k–$500k',
  '$500k–$1M',
  '$1M–$2.5M',
  '$2.5M–$5M',
  '$5M+',
];

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA',
  'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT',
  'VA','WA','WV','WI','WY','DC','Other',
];

const TOTAL_STEPS = 3;

export function OnboardingModal({ onComplete, onSkip, inputs }) {
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    industry: '',
    employeeRange: '',
    businessAge: '',
    revenueRange: '',
    loanPurpose: '',
    urgency: '',
    stateRegion: '',
  });

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function canAdvance() {
    if (step === 1) return form.industry && form.employeeRange && form.businessAge;
    if (step === 2) return form.revenueRange && form.loanPurpose && form.urgency;
    if (step === 3) return form.stateRegion;
    return true;
  }

  async function handleFinish() {
    setSaving(true);
    try {
      const profile = { ...form, completedAt: new Date().toISOString() };
      saveOnboardingProfile(profile);
      await recordOnboarding({
        industry: form.industry,
        businessAge: form.businessAge,
        employeeRange: form.employeeRange,
        revenueRange: form.revenueRange,
        loanPurpose: form.loanPurpose,
        urgency: form.urgency,
        stateRegion: form.stateRegion,
        inputs,
      });
      onComplete(profile);
    } catch {
      onComplete(form);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="onboarding-overlay" role="dialog" aria-modal="true" aria-label="Business profile setup">
      <div className="onboarding-modal">

        {/* Header */}
        <div className="onboarding-header">
          <div className="onboarding-logo">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 36" width="28" height="28" aria-hidden="true">
              <rect x="2" y="24" width="6" height="10" rx="1.5" fill="#4ade80" opacity="0.5" />
              <rect x="12" y="16" width="6" height="18" rx="1.5" fill="#4ade80" opacity="0.75" />
              <rect x="22" y="7" width="6" height="27" rx="1.5" fill="#4ade80" />
              <polyline points="5,22 15,14 25,5" fill="none" stroke="#4ade80" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" opacity="0.8" />
            </svg>
            <span className="onboarding-brand">FinSight</span>
          </div>
          <button
            type="button"
            className="onboarding-skip"
            onClick={onSkip}
            aria-label="Skip setup"
          >
            Skip for now
          </button>
        </div>

        {/* Progress bar */}
        <div className="onboarding-progress" aria-label={`Step ${step} of ${TOTAL_STEPS}`}>
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <div
              key={i}
              className={`onboarding-progress-dot ${i + 1 < step ? 'done' : ''} ${i + 1 === step ? 'active' : ''}`}
            />
          ))}
          <div
            className="onboarding-progress-bar"
            style={{ width: `${((step - 1) / (TOTAL_STEPS - 1)) * 100}%` }}
          />
        </div>

        {/* Step content */}
        <div className="onboarding-body">

          {step === 1 && (
            <div className="onboarding-step" key="step1">
              <h2 className="onboarding-title">Tell us about your business</h2>
              <p className="onboarding-subtitle">
                This helps us tailor your financing comparison and powers market insights for lenders and researchers.
              </p>

              <div className="onboarding-field">
                <label className="onboarding-label">Industry</label>
                <div className="onboarding-chip-grid">
                  {INDUSTRIES.map((ind) => (
                    <button
                      key={ind}
                      type="button"
                      className={`onboarding-chip ${form.industry === ind ? 'selected' : ''}`}
                      onClick={() => update('industry', ind)}
                    >
                      {ind}
                    </button>
                  ))}
                </div>
              </div>

              <div className="onboarding-row">
                <div className="onboarding-field">
                  <label className="onboarding-label">Team size</label>
                  <div className="onboarding-chip-grid onboarding-chip-grid--sm">
                    {EMPLOYEE_RANGES.map((r) => (
                      <button
                        key={r}
                        type="button"
                        className={`onboarding-chip ${form.employeeRange === r ? 'selected' : ''}`}
                        onClick={() => update('employeeRange', r)}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="onboarding-field">
                  <label className="onboarding-label">Years in business</label>
                  <input
                    type="number"
                    className="onboarding-input"
                    min="0"
                    max="100"
                    placeholder="e.g. 3"
                    value={form.businessAge}
                    onChange={(e) => update('businessAge', e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="onboarding-step" key="step2">
              <h2 className="onboarding-title">Your financing context</h2>
              <p className="onboarding-subtitle">
                These signals help us show you the most relevant options and contribute to SMB market research.
              </p>

              <div className="onboarding-field">
                <label className="onboarding-label">Annual revenue range</label>
                <div className="onboarding-chip-grid onboarding-chip-grid--sm">
                  {REVENUE_RANGES.map((r) => (
                    <button
                      key={r}
                      type="button"
                      className={`onboarding-chip ${form.revenueRange === r ? 'selected' : ''}`}
                      onClick={() => update('revenueRange', r)}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              <div className="onboarding-field">
                <label className="onboarding-label">Primary use of funds</label>
                <div className="onboarding-chip-grid onboarding-chip-grid--sm">
                  {LOAN_PURPOSES.map((p) => (
                    <button
                      key={p}
                      type="button"
                      className={`onboarding-chip ${form.loanPurpose === p ? 'selected' : ''}`}
                      onClick={() => update('loanPurpose', p)}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <div className="onboarding-field">
                <label className="onboarding-label">How soon do you need funding?</label>
                <div className="onboarding-chip-grid onboarding-chip-grid--sm">
                  {URGENCY_OPTIONS.map((u) => (
                    <button
                      key={u.value}
                      type="button"
                      className={`onboarding-chip ${form.urgency === u.value ? 'selected' : ''}`}
                      onClick={() => update('urgency', u.value)}
                    >
                      {u.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="onboarding-step" key="step3">
              <h2 className="onboarding-title">Almost done</h2>
              <p className="onboarding-subtitle">
                State-level data helps identify regional financing gaps and trends.
              </p>

              <div className="onboarding-field">
                <label className="onboarding-label">State / Region</label>
                <div className="onboarding-state-grid">
                  {US_STATES.map((s) => (
                    <button
                      key={s}
                      type="button"
                      className={`onboarding-state-btn ${form.stateRegion === s ? 'selected' : ''}`}
                      onClick={() => update('stateRegion', s)}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div className="onboarding-privacy-note">
                <span className="onboarding-privacy-icon">🔒</span>
                <p>
                  <strong>Your data stays anonymous.</strong> We only store bucketed ranges — never exact figures, names, or contact info. This data helps build market insights for lenders and economic researchers.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer / navigation */}
        <div className="onboarding-footer">
          {step > 1 && (
            <button
              type="button"
              className="onboarding-btn onboarding-btn--secondary"
              onClick={() => setStep((s) => s - 1)}
            >
              ← Back
            </button>
          )}
          <span className="onboarding-step-label">Step {step} of {TOTAL_STEPS}</span>
          {step < TOTAL_STEPS ? (
            <button
              type="button"
              className="onboarding-btn onboarding-btn--primary"
              disabled={!canAdvance()}
              onClick={() => setStep((s) => s + 1)}
            >
              Continue →
            </button>
          ) : (
            <button
              type="button"
              className="onboarding-btn onboarding-btn--primary"
              disabled={!canAdvance() || saving}
              onClick={handleFinish}
            >
              {saving ? 'Saving…' : 'Get Started →'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
