/**
 * Secure FRED rates service.
 * Static fallback + optional official API (free key required).
 * No proxies - direct api.stlouisfed.org calls only.
 */

const CACHE_KEY = 'finsight-v1-rates';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h

export const STATIC_RATES = {
  prime: { value: 7.5, date: '2024-Oct (static)', live: false },
  creditCard: { value: 21.47, date: 'Q3 2024 (static)', live: false },
};

async function getFredKey() {
  try {
    // Check localStorage first (user sets: localStorage.fredApiKey = 'yourkey')
    const key = localStorage.getItem('fredApiKey');
    if (key) return key;
    
    // Fallback .env (dev only)
    if (typeof process !== 'undefined' && process.env.FRED_API_KEY) {
      return process.env.FRED_API_KEY;
    }
  } catch {}
  return null;
}

async function fetchFredObservation(seriesId) {
  const apiKey = await getFredKey();
  if (!apiKey) {
    throw new Error('FRED API key required for live data. Set localStorage.fredApiKey or .env FRED_API_KEY');
  }

  const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&api_key=${apiKey}&file_type=json&limit=1&sort_order=desc`;
  
  const res = await fetch(url, {
    headers: { Accept: 'application/json' },
  });

  if (!res.ok) {
    throw new Error(`FRED API error: ${res.status}`);
  }

  const { observations } = await res.json();
  const latest = observations[0];
  if (!latest?.value || latest.value === '.') {
    throw new Error('No recent data available');
  }

  return {
    value: parseFloat(latest.value),
    date: latest.date,
    seriesId,
    live: true,
  };
}

export async function fetchLiveRates({ forceRefresh = false } = {}) {
  // Cache check
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (raw && !forceRefresh) {
      const { data, timestamp } = JSON.parse(raw);
      if (Date.now() - timestamp < CACHE_TTL_MS) {
        return { ...data, fromCache: true };
      }
    }
  } catch {}

  try {
    // Try live API
    const [prime, creditCard] = await Promise.all([
      fetchFredObservation('PRIME'),
      fetchFredObservation('TERMCBCCALLNS'),
    ]);

    const data = {
      prime,
      creditCard,
      fetchedAt: new Date().toISOString(),
      live: true,
    };

    localStorage.setItem(CACHE_KEY, JSON.stringify({ data, timestamp: Date.now() }));
    return data;
  } catch (error) {
    console.warn('Live FRED fetch failed:', error.message);
    // Fallback static
    const data = STATIC_RATES;
    localStorage.setItem(CACHE_KEY, JSON.stringify({ data, timestamp: Date.now() }));
    return data;
  }
}

