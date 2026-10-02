import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client.js';

export function useDocuments(initialFilters = {}) {
  const [filters, setFilters] = useState({
    page: 1,
    limit: 10,
    search: '',
    status: '',
    ...initialFilters,
  });
  const [searchInput, setSearchInput] = useState(filters.search);
  const [data, setData] = useState({ items: [], pagination: null, summary: {}, withRemarks: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setFilters((current) => current.search === searchInput
        ? current
        : { ...current, search: searchInput, page: 1 });
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  const refresh = useCallback(() => setReloadKey((value) => value + 1), []);

  // Applies the list-scoping filters (status / hasRemarks) used by the
  // committee view chips. Returns the same state object when nothing changed
  // so switching views does not trigger a duplicate request.
  const setScope = useCallback((scope) => {
    setFilters((current) => {
      const changed = Object.entries(scope).some(([key, value]) => current[key] !== value);
      return changed ? { ...current, ...scope, page: 1 } : current;
    });
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    api.documents(filters)
      .then((result) => {
        if (active) {
          setData(result);
        }
      })
      .catch((requestError) => {
        if (active) {
          setError(requestError.message);
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [filters, reloadKey]);

  const setStatus = useCallback((status) => {
    setScope({ status });
  }, [setScope]);

  const setPage = useCallback((page) => {
    setFilters((current) => ({ ...current, page }));
  }, []);

  return {
    ...data,
    filters,
    searchInput,
    setSearchInput,
    setStatus,
    setScope,
    setPage,
    loading,
    error,
    refresh,
  };
}
