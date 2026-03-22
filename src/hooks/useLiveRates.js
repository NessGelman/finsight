import { useState, useEffect } from 'react';
import { fetchLiveRates, STATIC_RATES } from '../data/autoFredService';

/**
 * Fetches live rate data from FRED on mount.
 * Returns { rates, status } where status is one of:
 *   'loading'  — initial fetch in flight
 *   'live'     — freshly fetched from FRED
 *   'cached'   — served from localStorage cache (still fresh)
 *   'fallback' — all fetches failed; using static estimates
 */
export function useLiveRates() {
  const [rates, setRates] = useState(null);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const fetchAndUpdate = async () => {
      setError(null);
      try {
        const data = await fetchLiveRates();
        if (cancelled) return;
        setRates(data);
        setStatus(data.fromCache ? 'cached' : 'live');
      } catch (err) {
        if (cancelled) return;
        setError(err?.message || 'Unable to reach FRED');
        setRates({
          prime: STATIC_RATES.prime,
          creditCard: STATIC_RATES.creditCard,
          live: false,
        });
        setStatus('fallback');
      }
    };

    fetchAndUpdate();

    const handleRefresh = () => fetchAndUpdate();

    window.addEventListener('refreshRates', handleRefresh);

    return () => {
      cancelled = true;
      window.removeEventListener('refreshRates', handleRefresh);
    };
  }, []);

  const refresh = () => window.dispatchEvent(new Event('refreshRates'));

  return { rates, status, error, refresh };
}
