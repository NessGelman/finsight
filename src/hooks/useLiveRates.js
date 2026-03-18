import { useState, useEffect } from 'react';
import { fetchLiveRates, FALLBACK_RATES } from '../data/ratesService';

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

  useEffect(() => {
    let cancelled = false;

    const fetchAndUpdate = () => {
      fetchLiveRates()
        .then((data) => {
          if (cancelled) return;
          setRates(data);
          setStatus(data.fromCache ? 'cached' : 'live');
        })
        .catch(() => {
          if (cancelled) return;
          setRates({
            prime: FALLBACK_RATES.prime,
            creditCard: FALLBACK_RATES.creditCard,
            live: false,
          });
          setStatus('fallback');
        });
    };

    fetchAndUpdate();

    const handleRefresh = () => fetchAndUpdate();

    window.addEventListener('refreshRates', handleRefresh);

    return () => {
      cancelled = true;
      window.removeEventListener('refreshRates', handleRefresh);
    };
  }, []);

  return { rates, status };
}
