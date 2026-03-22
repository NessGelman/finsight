/**
 * Auto FRED rates service.
 * Baked-in free API key means all users get live rates with zero setup.
 * Users can override with their own key via localStorage.fredApiKey.
 * No proxies - direct api.stlouisfed.org calls only.
 */

const CACHE_KEY = 'finsight-v4-rates';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h

// Free FRED API key injected at build time via VITE_FRED_API_KEY in .env
// Get your own at: https://fred.stlouisfed.org/docs/api/api_key.html
const DEFAULT_FRED_KEY = import.meta.env.VITE_FRED_API_KEY ?? '';

export const STATIC_RATES = {
  prime: { value: 6.75, date: '2026-03-01 (static)', live: false },
  creditCard: { value: 20.09, date: 'Q1 2026 (static)', live: false },
  treasurySpread: { value: 0.32, date: '2026-03-01 (static)', live: false },
};

async function getFredKey() {
  try {
    const userKey = localStorage.getItem('fredApiKey');
    if (userKey && userKey.length === 32) {
      return { key: userKey, source: 'user' };
    }
  } catch {
    // localStorage blocked
  }

  if (DEFAULT_FRED_KEY) {
    return { key: DEFAULT_FRED_KEY, source: 'default' };
  }

  return { key: null, source: 'none' };
}

async function fetchFredObservation(seriesId, apiKey) {
  const url =
    `https://api.stlouisfed.org/fred/series/observations` +
    `?series_id=${seriesId}&api_key=${apiKey}&file_type=json&limit=1&sort_order=desc`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  let res;
  try {
    res = await fetch(url, { headers: { Accept: 'application/json' }, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }

  if (!res.ok) {
    throw new Error(`FRED API error: ${res.status}`);
  }

  const { observations } = await res.json();
  const latest = observations[0];

  if (!latest?.value || latest.value === '.') {
    throw new Error('NO_DATA');
  }

  return {
    value: parseFloat(latest.value),
    date: latest.date,
    seriesId,
    live: true,
  };
}

export async function fetchLiveRates({ forceRefresh = false } = {}) {
  // Check cache first
  if (!forceRefresh) {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (raw) {
        const { data, timestamp } = JSON.parse(raw);
        if (Date.now() - timestamp < CACHE_TTL_MS) {
          return { ...data, fromCache: true, cacheAge: Date.now() - timestamp };
        }
      }
    } catch {
      // Ignore cache errors
    }
  }

  const { key: apiKey, source: keySource } = await getFredKey();

  if (!apiKey) {
    console.warn('[FinSight] No FRED API key - using static rates');
    const data = {
      ...STATIC_RATES,
      fetchedAt: new Date().toISOString(),
      live: false,
      keySource: 'none',
    };
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ data, timestamp: Date.now() }));
    } catch {
      // Ignore
    }
    return data;
  }

  try {
    const [prime, creditCard, treasurySpread] = await Promise.all([
      fetchFredObservation('DPRIME', apiKey),
      fetchFredObservation('TERMCBCCALLNS', apiKey),
      fetchFredObservation('T10Y2Y', apiKey),
    ]);

    const data = {
      prime,
      creditCard,
      treasurySpread,
      fetchedAt: new Date().toISOString(),
      live: true,
      keySource,
    };

    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ data, timestamp: Date.now() }));
    } catch {
      // Ignore
    }

    return data;
  } catch (error) {
    console.warn('[FinSight] FRED fetch failed:', error.message);

    const data = {
      ...STATIC_RATES,
      fetchedAt: new Date().toISOString(),
      live: false,
      keySource,
      error: error.message,
    };

    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ data, timestamp: Date.now() }));
    } catch {
      // Ignore
    }

    return data;
  }
}
