import { lazy, Suspense, useState, useCallback, useMemo, useEffect } from 'react';
import { AppShell } from './components/layout/AppShell';
import { TopBar } from './components/layout/TopBar';
import { InputPanel } from './components/inputs/InputPanel';
import { SummaryBar } from './components/dashboard/SummaryBar';
import { FilterBar } from './components/dashboard/FilterBar';
import { matchesFilter } from './components/dashboard/filterUtils';
import { TradeoffChart } from './components/dashboard/TradeoffChart';
import { ComparisonTable } from './components/dashboard/ComparisonTable';
import { useFinancingResults } from './hooks/useFinancingResults';
import { useLiveRates } from './hooks/useLiveRates';
import { parseShareParams } from './utils/exportHelpers';
import { calculateAllOptions } from './engine/financingCalculator';
import { AmortizationModal } from './components/dashboard/AmortizationModal';
import { preloadAdvisorModel } from './components/assistant/aiModelService';

const CostBreakdown = lazy(() =>
  import('./components/dashboard/CostBreakdown').then((m) => ({ default: m.CostBreakdown })),
);
const AffordabilityTool = lazy(() =>
  import('./components/dashboard/AffordabilityTool').then((m) => ({ default: m.AffordabilityTool })),
);
const ScenarioAnalysis = lazy(() =>
  import('./components/dashboard/ScenarioAnalysis').then((m) => ({ default: m.ScenarioAnalysis })),
);
const SensitivityChart = lazy(() =>
  import('./components/dashboard/SensitivityChart').then((m) => ({ default: m.SensitivityChart })),
);
const FundingTimeline = lazy(() =>
  import('./components/dashboard/FundingTimeline').then((m) => ({ default: m.FundingTimeline })),
);
const GlossaryView = lazy(() =>
  import('./components/dashboard/GlossaryView').then((m) => ({ default: m.GlossaryView })),
);
const MethodologyPanel = lazy(() =>
  import('./components/dashboard/MethodologyPanel').then((m) => ({ default: m.MethodologyPanel })),
);
const LearningAssistant = lazy(() =>
  import('./components/assistant/LearningAssistant').then((m) => ({ default: m.LearningAssistant })),
);
const AIAdvisorChat = lazy(() =>
  import('./components/assistant/AIAdvisorChat').then((m) => ({ default: m.AIAdvisorChat })),
);

const DEFAULT_INPUTS = {
  principal: 100000,
  annualRevenue: 500000,
  fixedExpenses: 20000,
  businessAge: 3,
  creditScore: 700,
  loanPurpose: 'any',
  industry: 'general',
  collateral: 'none',
  employeeCount: 10,
  preferredTermMonths: 36,
  desiredMonthlyPayment: 3000,
};

const INPUTS_STORAGE_KEY = 'finsight:inputs:v2';

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function sanitizeInputs(raw) {
  const safe = { ...DEFAULT_INPUTS, ...(raw ?? {}) };
  const principal = Number(safe.principal);
  const annualRevenue = Number(safe.annualRevenue);
  const fixedExpenses = Number(safe.fixedExpenses);
  const businessAge = Number(safe.businessAge);
  const creditScore = Number(safe.creditScore);
  const employeeCount = Number(safe.employeeCount);
  const preferredTermMonths = Number(safe.preferredTermMonths);
  const desiredMonthlyPayment = Number(safe.desiredMonthlyPayment);

  return {
    principal: clamp(Number.isFinite(principal) ? principal : DEFAULT_INPUTS.principal, 5000, 2000000),
    annualRevenue: clamp(Number.isFinite(annualRevenue) ? annualRevenue : DEFAULT_INPUTS.annualRevenue, 50000, 10000000),
    fixedExpenses: clamp(Number.isFinite(fixedExpenses) ? fixedExpenses : DEFAULT_INPUTS.fixedExpenses, 0, 500000),
    businessAge: clamp(Number.isFinite(businessAge) ? businessAge : DEFAULT_INPUTS.businessAge, 0, 20),
    creditScore: clamp(Number.isFinite(creditScore) ? creditScore : DEFAULT_INPUTS.creditScore, 300, 850),
    employeeCount: clamp(Number.isFinite(employeeCount) ? employeeCount : DEFAULT_INPUTS.employeeCount, 1, 500),
    preferredTermMonths: clamp(Number.isFinite(preferredTermMonths) ? preferredTermMonths : DEFAULT_INPUTS.preferredTermMonths, 3, 120),
    desiredMonthlyPayment: clamp(Number.isFinite(desiredMonthlyPayment) ? desiredMonthlyPayment : DEFAULT_INPUTS.desiredMonthlyPayment, 500, 50000),
    loanPurpose: ['any', 'workingCapital', 'equipment', 'realEstate'].includes(safe.loanPurpose)
      ? safe.loanPurpose
      : DEFAULT_INPUTS.loanPurpose,
    industry: ['general', 'foodBeverage', 'healthcare', 'technology', 'construction', 'cannabis'].includes(safe.industry)
      ? safe.industry
      : DEFAULT_INPUTS.industry,
    collateral: ['none', 'partial', 'full'].includes(safe.collateral)
      ? safe.collateral
      : DEFAULT_INPUTS.collateral,
  };
}

function getInitialInputs() {
  const shared = parseShareParams();
  if (shared) return sanitizeInputs(shared);

  try {
    const persisted = window.localStorage.getItem(INPUTS_STORAGE_KEY);
    if (!persisted) return DEFAULT_INPUTS;
    return sanitizeInputs(JSON.parse(persisted));
  } catch {
    return DEFAULT_INPUTS;
  }
}

export default function App() {
  const [inputs, setInputs] = useState(getInitialInputs);
  const [savedScenario, setSavedScenario] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [activeFilter, setActiveFilter] = useState('all');
  const [strategy, setStrategy] = useState('none');
  const [activeTab, setActiveTab] = useState('compare');
  const [scheduleRow, setScheduleRow] = useState(null);

  const { rates, status: ratesStatus } = useLiveRates();

  const updateInput = useCallback((key, value) => {
    setInputs((prev) => sanitizeInputs({ ...prev, [key]: value }));
  }, []);

  const resetInputs = useCallback(() => {
    setInputs(DEFAULT_INPUTS);
    setSelectedProduct(null);
    setActiveFilter('all');
    setStrategy('none');
  }, []);

  const saveScenario = useCallback(() => {
    setSavedScenario({
      inputs: { ...inputs },
      results: calculateAllOptions(inputs, rates),
      timestamp: new Date().toLocaleTimeString()
    });
  }, [inputs, rates]);

  const rawResults = useFinancingResults(inputs, rates);

  // Apply Strategy Logic
  const processedResults = useMemo(() => {
    if (!rawResults) return [];
    let list = [...rawResults];

    if (strategy === 'speed') {
      list.sort((a, b) => (a.speedOrder || 99) - (b.speedOrder || 99));
    } else if (strategy === 'cost') {
      list.sort((a, b) => a.totalCost - b.totalCost);
    } else if (strategy === 'cashflow') {
      list.sort((a, b) => a.monthlyPayment - b.monthlyPayment);
    }

    return list;
  }, [rawResults, strategy]);

  const results = useMemo(() => {
    return processedResults.map((r) => ({
      ...r,
      _matchesFilter: activeFilter === 'all' ? true : matchesFilter(r, activeFilter, processedResults),
    }));
  }, [processedResults, activeFilter]);

  const sectionFallback = (
    <div className="section-loading">Loading module...</div>
  );

  const aiAdvisorContext = useMemo(() => ({
    inputs,
    results,
    rates,
    ratesStatus,
    savedScenario,
    viewState: {
      activeTab,
      activeFilter,
      strategy,
      selectedProduct,
    },
  }), [inputs, results, rates, ratesStatus, savedScenario, activeTab, activeFilter, strategy, selectedProduct]);

  useEffect(() => {
    try {
      window.localStorage.setItem(INPUTS_STORAGE_KEY, JSON.stringify(inputs));
    } catch {
      // Ignore storage failures (private mode/quota).
    }
  }, [inputs]);

  useEffect(() => {
    let timeoutId = null;
    let idleId = null;
    const startPreload = () => {
      preloadAdvisorModel().catch(() => {
        // Silent failure; user can still trigger explicit load in AI tab.
      });
    };

    if (typeof window !== 'undefined' && typeof window.requestIdleCallback === 'function') {
      idleId = window.requestIdleCallback(startPreload, { timeout: 4000 });
    } else {
      timeoutId = window.setTimeout(startPreload, 1200);
    }

    return () => {
      if (timeoutId != null) window.clearTimeout(timeoutId);
      if (idleId != null && typeof window !== 'undefined' && typeof window.cancelIdleCallback === 'function') {
        window.cancelIdleCallback(idleId);
      }
    };
  }, []);

  return (
    <AppShell sidebar={<InputPanel inputs={inputs} onUpdate={updateInput} onReset={resetInputs} />}>
      <TopBar
        rates={rates}
        ratesStatus={ratesStatus}
        results={results}
        inputs={inputs}
        onReset={resetInputs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      <main className="main-content">
        {activeTab === 'compare' && (
          <section id="compare" className="section-block section-block--compare">
            <SummaryBar results={results} selectedProduct={selectedProduct} strategy={strategy} />

            <div className="strategy-row">
              <span className="strategy-label">Optimization Strategy:</span>
              <div className="strategy-pills">
                <button
                  type="button"
                  className={`strategy-pill ${strategy === 'none' ? 'active' : ''}`}
                  onClick={() => setStrategy('none')}
                  aria-pressed={strategy === 'none'}
                >
                  Standard
                </button>
                <button
                  type="button"
                  className={`strategy-pill ${strategy === 'speed' ? 'active' : ''}`}
                  onClick={() => setStrategy('speed')}
                  aria-pressed={strategy === 'speed'}
                >
                  Max Speed
                </button>
                <button
                  type="button"
                  className={`strategy-pill ${strategy === 'cost' ? 'active' : ''}`}
                  onClick={() => setStrategy('cost')}
                  aria-pressed={strategy === 'cost'}
                >
                  Lowest Cost
                </button>
                <button
                  type="button"
                  className={`strategy-pill ${strategy === 'cashflow' ? 'active' : ''}`}
                  onClick={() => setStrategy('cashflow')}
                  aria-pressed={strategy === 'cashflow'}
                >
                  Cashflow First
                </button>
              </div>

              <button
                type="button"
                className="top-bar-btn"
                style={{ marginLeft: 'auto', fontSize: '10px' }}
                onClick={saveScenario}
              >
                {savedScenario ? '↑ Update Stored Scenario' : '💾 Store for Comparison'}
              </button>
            </div>

            <div className="compare-data-block">
              <FilterBar activeFilter={activeFilter} onFilterChange={setActiveFilter} results={results} />

              {savedScenario && (
                <div className="scenario-info-bar" style={{ padding: '6px 20px', background: 'var(--accent-dim)', fontSize: '11px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between' }}>
                  <span>Comparing against stored scenario from {savedScenario.timestamp} (${(savedScenario.inputs.principal / 1000).toFixed(0)}k @ {savedScenario.inputs.creditScore} CS)</span>
                  <button type="button" onClick={() => setSavedScenario(null)} style={{ background: 'none', border: 'none', color: 'var(--accent-red)', cursor: 'pointer', fontWeight: 'bold' }}>✕ Clear</button>
                </div>
              )}

              <div className="compare-grid">
                <ComparisonTable
                  results={results}
                  savedResults={savedScenario?.results}
                  selectedProduct={selectedProduct}
                  onSelectProduct={setSelectedProduct}
                  strategy={strategy}
                  onShowSchedule={setScheduleRow}
                />
              </div>
              <div className="compare-bottom-grid">
                <Suspense fallback={sectionFallback}>
                  <CostBreakdown results={results} />
                </Suspense>
              </div>
            </div>
          </section>
        )}

        {activeTab === 'optimize' && (
          <section id="optimize" className="section-block">
            <Suspense fallback={sectionFallback}>
              <ScenarioAnalysis baseInputs={inputs} baseResults={results} liveRates={rates} />
            </Suspense>
            <div className="optimize-bottom-grid">
              <Suspense fallback={sectionFallback}>
                <TradeoffChart results={results} selectedProduct={selectedProduct} onSelectProduct={setSelectedProduct} activeFilters={activeFilter !== 'all' ? [activeFilter] : []} />
                <SensitivityChart inputs={inputs} liveRates={rates} />
                <FundingTimeline results={results} />
              </Suspense>
            </div>
          </section>
        )}

        {activeTab === 'learn' && (
          <section id="learn" className="section-block">
            <Suspense fallback={sectionFallback}>
              <GlossaryView results={results} inputs={inputs} />
              <MethodologyPanel />
            </Suspense>
          </section>
        )}

        {activeTab === 'assistant' && (
          <section id="assistant" className="section-block">
            <Suspense fallback={sectionFallback}>
              <LearningAssistant results={results} inputs={inputs} />
            </Suspense>
          </section>
        )}

        {activeTab === 'aiAdvisor' && (
          <section id="ai-advisor" className="section-block">
            <Suspense fallback={sectionFallback}>
              <AIAdvisorChat contextData={aiAdvisorContext} />
            </Suspense>
          </section>
        )}
      </main>

      {scheduleRow && (
        <AmortizationModal
          product={scheduleRow}
          onClose={() => setScheduleRow(null)}
        />
      )}
    </AppShell>
  );
}
