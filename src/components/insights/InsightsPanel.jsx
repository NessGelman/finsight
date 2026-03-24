import { useState, useEffect, useMemo } from 'react';
import { getAggregateInsights, getOnboardingProfile } from '../../services/dataCollectionService';

// Simple bar chart using plain divs — no extra dependencies
function MiniBar({ label, value, max, color = '#5A95FF' }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="insights-bar-row">
      <span className="insights-bar-label">{label}</span>
      <div className="insights-bar-track">
        <div
          className="insights-bar-fill"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      <span className="insights-bar-count">{value}</span>
    </div>
  );
}

function InsightCard({ title, children, badge }) {
  return (
    <div className="insights-card">
      <div className="insights-card-header">
        <h3 className="insights-card-title">{title}</h3>
        {badge && <span className="insights-badge">{badge}</span>}
      </div>
      <div className="insights-card-body">{children}</div>
    </div>
  );
}

function EmptyState({ message }) {
  return (
    <div className="insights-empty">
      <span className="insights-empty-icon">📊</span>
      <p>{message}</p>
    </div>
  );
}

function TopItems({ data, colorMap, maxItems = 6 }) {
  if (!data || Object.keys(data).length === 0) return null;
  const sorted = Object.entries(data)
    .sort(([, a], [, b]) => b - a)
    .slice(0, maxItems);
  const max = sorted[0]?.[1] || 1;
  const colors = ['#5A95FF', '#30df84', '#f4b34f', '#7ba6ff', '#ff6b6b', '#a78bfa'];
  return (
    <div className="insights-bars">
      {sorted.map(([label, count], i) => (
        <MiniBar
          key={label}
          label={label}
          value={count}
          max={max}
          color={colorMap?.[label] || colors[i % colors.length]}
        />
      ))}
    </div>
  );
}

const URGENCY_LABELS = {
  '0-30days': 'ASAP (<30 days)',
  '1-3months': '1–3 months',
  '3-6months': '3–6 months',
  'exploring': 'Just exploring',
};

export function InsightsPanel({ results, inputs }) {
  const [agg, setAgg] = useState({});
  const [profile, setProfile] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(Date.now());

  useEffect(() => {
    setAgg(getAggregateInsights());
    setProfile(getOnboardingProfile());
  }, [lastRefresh]);

  const totalSessions = agg.totalSessions || 0;
  const hasData = totalSessions > 0;

  // Remap urgency keys to readable labels
  const urgencyData = useMemo(() => {
    if (!agg.byUrgency) return {};
    return Object.fromEntries(
      Object.entries(agg.byUrgency).map(([k, v]) => [URGENCY_LABELS[k] || k, v])
    );
  }, [agg.byUrgency]);

  // Top preferred product
  const topProduct = useMemo(() => {
    if (!agg.byPreferredProduct) return null;
    const sorted = Object.entries(agg.byPreferredProduct).sort(([, a], [, b]) => b - a);
    return sorted[0]?.[0] || null;
  }, [agg.byPreferredProduct]);

  // "Similar to you" profile comparison
  const profileSummary = useMemo(() => {
    if (!profile) return null;
    return [
      profile.industry && `${profile.industry}`,
      profile.revenueRange && `${profile.revenueRange} revenue`,
      profile.employeeRange && `${profile.employeeRange} employees`,
      profile.urgency && URGENCY_LABELS[profile.urgency],
    ].filter(Boolean);
  }, [profile]);

  return (
    <div className="insights-panel">
      {/* Header */}
      <div className="insights-header">
        <div>
          <h2 className="insights-title">Market Insights</h2>
          <p className="insights-subtitle">
            Anonymized, aggregated SMB financing intent — collected from FinSight users.
          </p>
        </div>
        <div className="insights-header-meta">
          <div className="insights-stat">
            <span className="insights-stat-value">{totalSessions.toLocaleString()}</span>
            <span className="insights-stat-label">Sessions tracked</span>
          </div>
          <button
            type="button"
            className="top-bar-btn"
            onClick={() => setLastRefresh(Date.now())}
            title="Refresh data"
          >
            ↻ Refresh
          </button>
        </div>
      </div>

      {/* Your profile banner */}
      {profile && (
        <div className="insights-profile-banner">
          <span className="insights-profile-icon">👤</span>
          <div>
            <strong>Your profile:</strong>{' '}
            {profileSummary.join(' · ')}
          </div>
          {topProduct && (
            <div className="insights-profile-product">
              Most popular for businesses like yours: <strong>{topProduct}</strong>
            </div>
          )}
        </div>
      )}

      {!hasData ? (
        <div className="insights-onboarding-prompt">
          <div className="insights-empty-big">
            <span style={{ fontSize: '3rem' }}>📊</span>
            <h3>Data builds as users engage</h3>
            <p>
              Every time a business owner completes the profile setup, their anonymized
              financing intent is captured here. At scale, this becomes a real-time
              dataset of SMB capital demand — segmented by industry, region, urgency,
              and loan purpose.
            </p>
            <div className="insights-b2b-box">
              <strong>B2B Data Value:</strong> Lenders, hedge funds, and economic researchers
              pay for pre-application SMB intent data — the signal that exists before a
              credit pull or loan application.
            </div>
          </div>
        </div>
      ) : (
        <div className="insights-grid">

          <InsightCard title="Top Industries" badge={`${Object.keys(agg.byIndustry || {}).length} sectors`}>
            {agg.byIndustry && Object.keys(agg.byIndustry).length > 0 ? (
              <TopItems data={agg.byIndustry} />
            ) : (
              <EmptyState message="No industry data yet" />
            )}
          </InsightCard>

          <InsightCard title="Funding Urgency" badge="Demand signals">
            {Object.keys(urgencyData).length > 0 ? (
              <TopItems data={urgencyData} colorMap={{
                'ASAP (<30 days)': '#ff6b6b',
                '1–3 months': '#f4b34f',
                '3–6 months': '#5A95FF',
                'Just exploring': '#8892B0',
              }} />
            ) : (
              <EmptyState message="No urgency data yet" />
            )}
          </InsightCard>

          <InsightCard title="Loan Purpose" badge="Intent signals">
            {agg.byLoanPurpose && Object.keys(agg.byLoanPurpose).length > 0 ? (
              <TopItems data={agg.byLoanPurpose} />
            ) : (
              <EmptyState message="No loan purpose data yet" />
            )}
          </InsightCard>

          <InsightCard title="Revenue Distribution" badge="Segments">
            {agg.byRevenueRange && Object.keys(agg.byRevenueRange).length > 0 ? (
              <TopItems data={agg.byRevenueRange} />
            ) : (
              <EmptyState message="No revenue data yet" />
            )}
          </InsightCard>

          <InsightCard title="Preferred Products" badge="Conversion signals">
            {agg.byPreferredProduct && Object.keys(agg.byPreferredProduct).length > 0 ? (
              <TopItems data={agg.byPreferredProduct} colorMap={{
                'SBA Loan': '#30df84',
                'Term Loan': '#5A95FF',
                'Line of Credit': '#7ba6ff',
                'Merchant Cash Advance': '#ff6b6b',
              }} />
            ) : (
              <EmptyState message="No product preference data yet — appears when users click through to products" />
            )}
          </InsightCard>

          <InsightCard title="Geographic Distribution" badge="Regional demand">
            {agg.byState && Object.keys(agg.byState).length > 0 ? (
              <TopItems data={agg.byState} maxItems={10} />
            ) : (
              <EmptyState message="No geographic data yet" />
            )}
          </InsightCard>

          <InsightCard title="Business Age" badge="Maturity signals">
            {agg.byBusinessAge && Object.keys(agg.byBusinessAge).length > 0 ? (
              <TopItems data={agg.byBusinessAge} />
            ) : (
              <EmptyState message="No business age data yet" />
            )}
          </InsightCard>

          <InsightCard title="Loan Amount Range" badge="Capital demand">
            {agg.byLoanAmount && Object.keys(agg.byLoanAmount).length > 0 ? (
              <TopItems data={agg.byLoanAmount} />
            ) : (
              <EmptyState message="No loan amount data yet" />
            )}
          </InsightCard>

        </div>
      )}

      {/* B2B data product teaser */}
      <div className="insights-b2b-section">
        <h3 className="insights-b2b-title">
          <span className="insights-b2b-icon">🏢</span>
          B2B Data Products
        </h3>
        <div className="insights-b2b-grid">
          <div className="insights-b2b-card">
            <strong>Lender Intelligence Feed</strong>
            <p>Real-time SMB financing demand by industry, region, and loan type — before a credit pull is ever made. Helps lenders target pre-qualified prospects.</p>
            <span className="insights-b2b-tag">$500–$2,000/month per lender</span>
          </div>
          <div className="insights-b2b-card">
            <strong>Market Research Export</strong>
            <p>Quarterly aggregated reports on SMB capital demand trends — urgency signals, product preferences, and geographic distribution for hedge funds and researchers.</p>
            <span className="insights-b2b-tag">$5,000–$25,000/report</span>
          </div>
          <div className="insights-b2b-card">
            <strong>Economic Indicator API</strong>
            <p>A leading indicator of SMB health: are businesses urgently seeking capital? This dataset predicts credit cycles before traditional indicators move.</p>
            <span className="insights-b2b-tag">Enterprise pricing</span>
          </div>
        </div>
        <p className="insights-b2b-note">
          Interested in data access?{' '}
          <a href="mailto:hello@getfinsight.com" className="insights-b2b-link">
            Contact us →
          </a>
        </p>
      </div>
    </div>
  );
}
