import { useState, useEffect } from 'react';
import { apiGet } from '../services/api';

const useFetch = (path) => {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    if (!path) return;
    setLoading(true);
    apiGet(path)
      .then(setData)
      .catch(setError)
      .finally(() => setLoading(false));
  }, [path]);

  return { data, loading, error };
};

export default useFetch;
