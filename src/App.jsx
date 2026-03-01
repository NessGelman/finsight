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

const DEFAULT_INPUTS = {
  principal: 100000,
  annualRevenue: 500000,
  fixedExpenses: 20000,
  businessAge: 3,
  creditScore: 700,
  loanPurpose: 'any',
  industry: 'general',
};

const INPUTS_STORAGE_KEY = 'finsight:inputs:v1';

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

  return {
    principal: clamp(Number.isFinite(principal) ? principal : DEFAULT_INPUTS.principal, 5000, 2000000),
    annualRevenue: clamp(Number.isFinite(annualRevenue) ? annualRevenue : DEFAULT_INPUTS.annualRevenue, 50000, 10000000),
    fixedExpenses: clamp(Number.isFinite(fixedExpenses) ? fixedExpenses : DEFAULT_INPUTS.fixedExpenses, 0, 500000),
    businessAge: clamp(Number.isFinite(businessAge) ? businessAge : DEFAULT_INPUTS.businessAge, 0, 20),
    creditScore: clamp(Number.isFinite(creditScore) ? creditScore : DEFAULT_INPUTS.creditScore, 300, 850),
    loanPurpose: ['any', 'workingCapital', 'equipment', 'realEstate'].includes(safe.loanPurpose)
      ? safe.loanPurpose
      : DEFAULT_INPUTS.loanPurpose,
    industry: ['general', 'foodBeverage', 'healthcare', 'technology', 'construction', 'cannabis'].includes(safe.industry)
      ? safe.industry
      : DEFAULT_INPUTS.industry,
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
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [activeFilter, setActiveFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('compare');

  const { rates, status: ratesStatus } = useLiveRates();

  const updateInput = useCallback((key, value) => {
    setInputs((prev) => sanitizeInputs({ ...prev, [key]: value }));
  }, []);

  const resetInputs = useCallback(() => {
    setInputs(DEFAULT_INPUTS);
    setSelectedProduct(null);
    setActiveFilter('all');
  }, []);

  const rawResults = useFinancingResults(inputs, rates);

  // Tag results with _matchesFilter for dimming
  const results = useMemo(() => {
    if (!rawResults) return rawResults;
    return rawResults.map((r) => ({
      ...r,
      _matchesFilter: activeFilter === 'all' ? true : matchesFilter(r, activeFilter, rawResults),
    }));
  }, [rawResults, activeFilter]);

  const sectionFallback = (
    <div className="section-loading">Loading module...</div>
  );

  useEffect(() => {
    try {
      window.localStorage.setItem(INPUTS_STORAGE_KEY, JSON.stringify(inputs));
    } catch {
      // Ignore storage failures (private mode/quota).
    }
  }, [inputs]);

  return (
    <AppShell>
      <TopBar
        rates={rates}
        ratesStatus={ratesStatus}
        results={results}
        inputs={inputs}
        onReset={resetInputs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      <InputPanel inputs={inputs} onUpdate={updateInput} />

      <main className="main-content">
        {activeTab === 'compare' && (
          <section id="compare" className="section-block section-block--compare">
            <SummaryBar results={results} selectedProduct={selectedProduct} />
            <div className="compare-data-block">
              <FilterBar activeFilter={activeFilter} onFilterChange={setActiveFilter} results={results} />
              <div className="compare-grid">
                <ComparisonTable
                  results={results}
                  selectedProduct={selectedProduct}
                  onSelectProduct={setSelectedProduct}
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
              <ScenarioAnalysis
                baseInputs={inputs}
                baseResults={results}
                liveRates={rates}
              />
            </Suspense>
            <div className="optimize-bottom-grid">
              <Suspense fallback={sectionFallback}>
                <TradeoffChart
                  results={results}
                  selectedProduct={selectedProduct}
                  onSelectProduct={setSelectedProduct}
                  activeFilters={activeFilter !== 'all' ? [activeFilter] : []}
                />
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
      </main>
    </AppShell>
  );
}
