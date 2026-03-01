import { useState } from 'react';
import { InputPanel } from '../inputs/InputPanel';

export function WhatIfPanel({ baseInputs, onScenarioChange, onReset }) {
  const [active, setActive] = useState(false);
  const [scenario, setScenario] = useState({ ...baseInputs });

  function activate() {
    const fresh = { ...baseInputs };
    setScenario(fresh);
    setActive(true);
    onScenarioChange(fresh);
  }

  function handleChange(key, val) {
    const updated = { ...scenario, [key]: val };
    setScenario(updated);
    onScenarioChange(updated);
  }

  function reset() {
    setActive(false);
    onReset();
  }

  if (!active) {
    return (
      <div className="whatif-section">
        <button className="btn-whatif" onClick={activate}>
          ⊕ Run What-If Scenario
        </button>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
          Compare a hypothetical scenario — e.g., "What if my credit score were 750 instead of 620?"
        </div>
      </div>
    );
  }

  return (
    <div className="whatif-section active">
      <div className="whatif-header">
        <h3>What-If Scenario</h3>
        <button className="btn-reset" onClick={reset}>
          ✕ Reset
        </button>
      </div>
      <p className="whatif-hint">
        Results above now reflect the scenario inputs below. Click Reset to restore your original inputs.
      </p>
      <div className="whatif-label">Scenario Inputs</div>
      <InputPanel inputs={scenario} onUpdate={handleChange} />
    </div>
  );
}
