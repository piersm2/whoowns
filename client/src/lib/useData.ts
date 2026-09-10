import { useCallback, useEffect, useState } from 'react';
import { api } from './api';

export function useData<T>(url: string) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const reload = useCallback(() => {
    setLoading(true);
    return api.get<T>(url).then((d) => { setData(d); setError(null); }).catch((e) => setError(e.message)).finally(() => setLoading(false));
  }, [url]);
  useEffect(() => { reload(); }, [reload]);
  return { data, error, loading, reload, setData };
}
