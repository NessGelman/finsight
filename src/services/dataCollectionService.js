/**
 * FinSight Data Collection Service
 * ------------------------------------
 * Collects anonymized, aggregated SMB financing intent signals.
 * - Zero PII: no names, emails, IPs, or exact figures stored
 * - All values bucketed into ranges before storage
 * - Optional Supabase backend (set VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY)
 * - Falls back gracefully to localStorage-only if no backend configured
 *
 * This dataset becomes FinSight's core B2B data asset:
 *   → Pre-application SMB financing intent, by industry/region/urgency
 */

const STORAGE_KEY = 'finsight-data-v1';
const SESSION_KEY = 'finsight-session-v1';

// ─── Supabase config (optional — set via .env / GitHub Secrets) ──────────────
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || null;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || null;
const SUPABASE_TABLE = 'finsight_sessions';

// ─── Bucketing helpers (no raw values stored) ────────────────────────────────
function bucketRevenue(annualRevenue) {
  if (!annualRevenue) return 'unknown';
  if (annualRevenue < 100000) return '<$100k';
  if (annualRevenue < 250000) return '$100k-$250k';
  if (annualRevenue < 500000) return '$250k-$500k';
  if (annualRevenue < 1000000) return '$500k-$1M';
  if (annualRevenue < 2500000) return '$1M-$2.5M';
  if (annualRevenue < 5000000) return '$2.5M-$5M';
  return '$5M+';
}

function bucketLoanAmount(amount) {
  if (!amount) return 'unknown';
  if (amount < 25000) return '<$25k';
  if (amount < 50000) return '$25k-$50k';
  if (amount < 100000) return '$50k-$100k';
  if (amount < 250000) return '$100k-$250k';
  if (amount < 500000) return '$250k-$500k';
  if (amount < 1000000) return '$500k-$1M';
  return '$1M+';
}

function bucketCreditScore(score) {
  if (!score) return 'unknown';
  if (score < 580) return 'poor (<580)';
  if (score < 670) return 'fair (580-669)';
  if (score < 740) return 'good (670-739)';
  if (score < 800) return 'very-good (740-799)';
  return 'exceptional (800+)';
}

function bucketBusinessAge(years) {
  if (years === undefined || years === null) return 'unknown';
  if (years < 1) return '<1yr';
  if (years < 2) return '1-2yr';
  if (years < 3) return '2-3yr';
  if (years < 5) return '3-5yr';
  if (years < 10) return '5-10yr';
  return '10yr+';
}

// ─── Session management ───────────────────────────────────────────────────────
function getOrCreateSessionId() {
  try {
    let id = sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id = 'sess_' + Math.random().toString(36).slice(2, 11) + Date.now().toString(36);
      sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return 'sess_anonymous';
  }
}

// ─── Local aggregate store ────────────────────────────────────────────────────
function getLocalStore() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : { sessions: [], aggregates: {} };
  } catch {
    return { sessions: [], aggregates: {} };
  }
}

function saveLocalStore(store) {
  try {
    // Keep only last 500 sessions locally to avoid bloat
    if (store.sessions.length > 500) {
      store.sessions = store.sessions.slice(-500);
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // Quota exceeded — silently ignore
  }
}

function updateLocalAggregates(store, sessionData) {
  const agg = store.aggregates;

  // Industry counts
  agg.byIndustry = agg.byIndustry || {};
  if (sessionData.industry) {
    agg.byIndustry[sessionData.industry] = (agg.byIndustry[sessionData.industry] || 0) + 1;
  }

  // Revenue range counts
  agg.byRevenueRange = agg.byRevenueRange || {};
  if (sessionData.revenue_range) {
    agg.byRevenueRange[sessionData.revenue_range] = (agg.byRevenueRange[sessionData.revenue_range] || 0) + 1;
  }

  // Loan purpose counts
  agg.byLoanPurpose = agg.byLoanPurpose || {};
  if (sessionData.loan_purpose) {
    agg.byLoanPurpose[sessionData.loan_purpose] = (agg.byLoanPurpose[sessionData.loan_purpose] || 0) + 1;
  }

  // Urgency counts
  agg.byUrgency = agg.byUrgency || {};
  if (sessionData.urgency) {
    agg.byUrgency[sessionData.urgency] = (agg.byUrgency[sessionData.urgency] || 0) + 1;
  }

  // State/region counts
  agg.byState = agg.byState || {};
  if (sessionData.state_region) {
    agg.byState[sessionData.state_region] = (agg.byState[sessionData.state_region] || 0) + 1;
  }

  // Preferred product
  agg.byPreferredProduct = agg.byPreferredProduct || {};
  if (sessionData.preferred_product) {
    agg.byPreferredProduct[sessionData.preferred_product] = (agg.byPreferredProduct[sessionData.preferred_product] || 0) + 1;
  }

  // Business age
  agg.byBusinessAge = agg.byBusinessAge || {};
  if (sessionData.business_age_range) {
    agg.byBusinessAge[sessionData.business_age_range] = (agg.byBusinessAge[sessionData.business_age_range] || 0) + 1;
  }

  // Loan amount
  agg.byLoanAmount = agg.byLoanAmount || {};
  if (sessionData.loan_amount_range) {
    agg.byLoanAmount[sessionData.loan_amount_range] = (agg.byLoanAmount[sessionData.loan_amount_range] || 0) + 1;
  }

  agg.totalSessions = (agg.totalSessions || 0) + 1;
  agg.lastUpdated = new Date().toISOString();

  store.aggregates = agg;
}

// ─── Supabase uploader ────────────────────────────────────────────────────────
async function uploadToSupabase(sessionData) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return;

  try {
    await fetch(`${SUPABASE_URL}/rest/v1/${SUPABASE_TABLE}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        Prefer: 'return=minimal',
      },
      body: JSON.stringify(sessionData),
    });
  } catch {
    // Network errors are silent — data is already in localStorage
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Record a completed onboarding profile.
 * Called once per user when they complete the onboarding modal.
 */
export async function recordOnboarding({
  industry,
  businessAge,
  employeeRange,
  revenueRange,          // raw bucket string from onboarding form
  loanPurpose,
  urgency,
  stateRegion,
  inputs = {},            // current app inputs for bucketing
}) {
  const sessionId = getOrCreateSessionId();

  const sessionData = {
    session_id: sessionId,
    created_at: new Date().toISOString(),
    event_type: 'onboarding_complete',

    // Business profile (from onboarding form)
    industry: industry || null,
    employee_range: employeeRange || null,
    loan_purpose: loanPurpose || null,
    urgency: urgency || null,
    state_region: stateRegion || null,

    // Bucketed from onboarding or app inputs
    business_age_range: businessAge ? bucketBusinessAge(Number(businessAge)) : null,
    revenue_range: revenueRange || bucketRevenue(inputs.annualRevenue),
    loan_amount_range: bucketLoanAmount(inputs.principal),
    credit_score_range: bucketCreditScore(inputs.creditScore),
  };

  // Save locally
  const store = getLocalStore();
  store.sessions.push(sessionData);
  updateLocalAggregates(store, sessionData);
  saveLocalStore(store);

  // Upload to Supabase (non-blocking)
  uploadToSupabase(sessionData);

  return sessionData;
}

/**
 * Track when a user selects / drills into a product.
 * Builds the "preferred product" signal over time.
 */
export function recordProductSelect(productLabel) {
  try {
    const sessionId = getOrCreateSessionId();
    const store = getLocalStore();

    // Find today's session and update preferred_product
    const todayISO = new Date().toISOString().slice(0, 10);
    const existingSession = store.sessions.find(
      (s) => s.session_id === sessionId && s.created_at?.startsWith(todayISO)
    );
    if (existingSession) {
      existingSession.preferred_product = productLabel;
    }

    // Update aggregates
    store.aggregates.byPreferredProduct = store.aggregates.byPreferredProduct || {};
    store.aggregates.byPreferredProduct[productLabel] =
      (store.aggregates.byPreferredProduct[productLabel] || 0) + 1;

    saveLocalStore(store);

    // Best-effort Supabase event
    if (SUPABASE_URL && SUPABASE_ANON_KEY) {
      uploadToSupabase({
        session_id: sessionId,
        created_at: new Date().toISOString(),
        event_type: 'product_selected',
        preferred_product: productLabel,
      });
    }
  } catch {
    // Silently ignore
  }
}

/**
 * Track AI query events (count only, no content).
 */
export function recordAIQuery(provider = 'unknown') {
  try {
    const store = getLocalStore();
    store.aggregates.totalAIQueries = (store.aggregates.totalAIQueries || 0) + 1;
    store.aggregates.aiQueryByProvider = store.aggregates.aiQueryByProvider || {};
    store.aggregates.aiQueryByProvider[provider] =
      (store.aggregates.aiQueryByProvider[provider] || 0) + 1;
    saveLocalStore(store);
  } catch {
    // Silently ignore
  }
}

/**
 * Get local aggregate insights for the Insights panel.
 */
export function getAggregateInsights() {
  try {
    const store = getLocalStore();
    return store.aggregates || {};
  } catch {
    return {};
  }
}

/**
 * Get the current user's onboarding profile (if completed).
 */
export function getOnboardingProfile() {
  try {
    const raw = localStorage.getItem('finsight-onboarding-v1');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveOnboardingProfile(profile) {
  try {
    localStorage.setItem('finsight-onboarding-v1', JSON.stringify(profile));
  } catch {
    // Silently ignore
  }
}

export function hasCompletedOnboarding() {
  return !!getOnboardingProfile();
}
