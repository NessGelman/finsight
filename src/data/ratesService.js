/**
 * Live rate fetching from Federal Reserve FRED database.
 *
 * Sources:
 *   PRIME          — Bank Prime Loan Rate (weekly)
 *                    https://fred.stlouisfed.org/series/PRIME
 *   TERMCBCCALLNS  — Credit Card Interest Rates, All Accounts (quarterly)
 *                    https://fred.stlouisfed.org/series/TERMCBCCALLNS
 *
 * FRED CSV endpoints are publicly accessible without an API key.
 * We route through CORS proxies since browsers block cross-origin fetches.
 * Falls back to static estimates if all proxies are unavailable.
 */

const CACHE_KEY = 'finsight_live_rates_v2';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// Static fallback rates (approximate recent values)
export const FALLBACK_RATES = {
  prime: { value: 7.5, date: 'estimated', live: false },
  creditCard: { value: 21.5, date: 'estimated', live: false },
};

const FRED_CSV_BASE = 'https://fred.stlouisfed.org/graph/fredgraph.csv?id=';

// CORS proxy factories — tried in order until one succeeds
const PROXY_FACTORIES = [
  (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  (url) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
];

async function fetchFredCsv(seriesId) {
  const csvUrl = `${FRED_CSV_BASE}${seriesId}`;

  for (const makeProxy of PROXY_FACTORIES) {
    try {
      const res = await fetch(makeProxy(csvUrl), {
        signal: AbortSignal.timeout(7000),
        headers: { Accept: 'text/plain,text/csv,*/*' },
      });
      if (!res.ok) continue;
      const text = await res.text();
      if (!text || text.length < 20) continue;
      return parseFredCsv(text, seriesId);
    } catch {
      // try next proxy
    }
  }
  throw new Error(`All proxies failed for FRED series ${seriesId}`);
}

function parseFredCsv(csvText, seriesId) {
  const lines = csvText.trim().split('\n');
  // Walk backwards; FRED uses "." for missing observations
  for (let i = lines.length - 1; i >= 1; i--) {
    const parts = lines[i].split(',');
    if (parts.length < 2) continue;
    const date = parts[0].trim();
    const num = parseFloat(parts[1]);
    if (!isNaN(num) && num > 0) {
      return { value: num, date, seriesId };
    }
  }
  throw new Error(`No valid observations in FRED CSV for ${seriesId}`);
}

export async function fetchLiveRates() {
  // Return cached data if still fresh
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (raw) {
      const { data, timestamp } = JSON.parse(raw);
      if (Date.now() - timestamp < CACHE_TTL_MS) {
        return { ...data, fromCache: true };
      }
    }
  } catch {
    // corrupt cache — ignore and re-fetch
  }

  // Fetch both series concurrently
  const [prime, creditCard] = await Promise.all([
    fetchFredCsv('PRIME'),
    fetchFredCsv('TERMCBCCALLNS'),
  ]);

  const data = {
    prime: { ...prime, live: true },
    creditCard: { ...creditCard, live: true },
    fetchedAt: new Date().toISOString(),
    live: true,
  };

  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ data, timestamp: Date.now() }));
  } catch {
    // storage quota — non-fatal
  }

  return data;
}
