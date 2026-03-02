import { RatesStatus } from '../shared/RatesStatus';
import { ExportControls } from '../export/ExportControls';

const TABS = [
  { id: 'compare', label: 'Compare' },
  { id: 'optimize', label: 'Optimize' },
  { id: 'learn', label: 'Learn' },
  { id: 'assistant', label: 'Assistant' },
];

export function TopBar({ rates, ratesStatus, results, inputs, onReset, activeTab, onTabChange, theme, onToggleTheme }) {
  return (
    <div className="top-bar">
      <div className="top-bar-logo">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 44" width="172" height="38" className="top-bar-logo-mark" aria-hidden="true">
          <defs>
            <linearGradient id="fsLogoGradient" x1="0" y1="1" x2="0" y2="0">
              <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.55" />
              <stop offset="100%" stopColor="#4ade80" />
            </linearGradient>
          </defs>
          <rect x="3" y="30" width="7" height="10" rx="1.5" fill="url(#fsLogoGradient)" opacity="0.5" />
          <rect x="14" y="20" width="7" height="20" rx="1.5" fill="url(#fsLogoGradient)" opacity="0.7" />
          <rect x="25" y="9" width="7" height="31" rx="1.5" fill="url(#fsLogoGradient)" />
          <polyline points="6,28 17,18 28,7" fill="none" stroke="#4ade80" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" opacity="0.75" />
          <polyline points="22,5 28,7 30,13" fill="none" stroke="#4ade80" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
          <text x="44" y="31" fontFamily="system-ui,-apple-system,sans-serif" fontSize="21" fontWeight="700" fill="#4ade80">Finsight</text>
        </svg>
      </div>

      <div className="top-bar-divider" />

      <div className="top-bar-intro">
        <span className="top-bar-name">Normalize financing options into comparable capital costs.</span>
      </div>

      <div className="top-bar-tabs">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            className={`top-bar-tab${activeTab === tab.id ? ' active' : ''}`}
            onClick={() => onTabChange(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="top-bar-spacer" />

      <div className="top-bar-right-cluster" style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'nowrap' }}>
        <div className="top-bar-rates">
          <RatesStatus rates={rates} status={ratesStatus} compact />
        </div>

        <div className="top-bar-actions" style={{ display: 'flex', gap: '6px' }}>
          <button
            className="top-bar-btn"
            onClick={onToggleTheme}
            title={theme === 'dark' ? "Switch to Light Mode" : "Dark Mode"}
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
          <button className="top-bar-btn" onClick={onReset} title="Reset inputs to defaults">
            Reset
          </button>
          <ExportControls results={results} inputs={inputs} compact />
        </div>
      </div>
    </div>
  );
}
