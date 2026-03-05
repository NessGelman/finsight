import { useState, useMemo, useCallback } from 'react';

export function useSort(data, defaultKey = 'totalCost', defaultDir = 'asc') {
  const [sortKey, setSortKey] = useState(defaultKey);
  const [sortDir, setSortDir] = useState(defaultDir);

  const onSort = useCallback((key) => {
    setSortKey((prevKey) => {
      if (key === prevKey) {
        setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
        return prevKey;
      }
      setSortDir('asc');
      return key;
    });
  }, []);

  const sorted = useMemo(() => {
    if (!data || data.length === 0) return [];
    return [...data].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      const dir = sortDir === 'asc' ? 1 : -1;
      if (typeof aVal === 'string') return aVal.localeCompare(bVal) * dir;
      const aFinite = Number.isFinite(aVal);
      const bFinite = Number.isFinite(bVal);
      if (aFinite && !bFinite) return -1;
      if (!aFinite && bFinite) return 1;
      if (!aFinite && !bFinite) return 0;
      return (aVal - bVal) * dir;
    });
  }, [data, sortKey, sortDir]);

  return { sorted, sortKey, sortDir, onSort };
}
