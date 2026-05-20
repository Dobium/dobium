import { useState, useEffect } from 'react';
import { api } from '../api/client';

export function useMarkets() {
  const [markets, setMarkets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadMarkets() {
      try {
        setLoading(true);
        const data = await api.getMarkets();
        setMarkets(Array.isArray(data) ? data : []);
        setError(null);
      } catch (err) {
        console.error('Error loading markets from API:', err);
        setError(err.message);
        setMarkets([]);
      } finally {
        setLoading(false);
      }
    }
    loadMarkets();
  }, []);

  return { markets, loading, error };
}

export function useMarket(id) {
  const [market, setMarket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!id) return;

    const load = () =>
      api.getMarket(id)
        .then(data => { setMarket(data); setError(null); })
        .catch(e => setError(e.message))
        .finally(() => setLoading(false));

    setLoading(true);
    load();

    // Poll every 30s so price chart and probabilities stay live
    const interval = setInterval(load, 30_000);
    return () => clearInterval(interval);
  }, [id]);

  return { market, loading, error };
}
