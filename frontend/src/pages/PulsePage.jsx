import { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';

const CATEGORY_LABEL = { music: '🎵 Music', sports: '🏆 Sports', entertainment: '🎬 Movies & TV', awards: '🏅 Awards' };

function StatCard({ label, value, accent }) {
  return (
    <div style={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 16, padding: '20px 22px', flex: '1 1 180px' }}>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 30, fontWeight: 700, color: accent || 'var(--text)' }}>{value}</div>
      <div style={{ color: 'var(--muted)', fontSize: 13, marginTop: 4 }}>{label}</div>
    </div>
  );
}

export default function PulsePage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const d = await api.getPulse();
      setData(d);
      setError('');
    } catch (e) {
      setError(e.message || 'Failed to load');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 30000); // refresh every 30s
    return () => clearInterval(t);
  }, [load]);

  return (
    <div className="max-w-4xl mx-auto p-6 lg:p-8">
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'var(--wordmark)', fontSize: 28, color: 'var(--text)', margin: 0 }}>
          Dobium <span style={{ color: 'var(--gold)' }}>Pulse</span>
        </h1>
        {data && (
          <span style={{ color: 'var(--muted)', fontSize: 12 }}>
            updated {new Date(data.generated_at).toLocaleTimeString()} · auto-refreshes every 30s
          </span>
        )}
      </div>

      {loading && <p style={{ color: 'var(--muted)' }}>Loading…</p>}
      {error && <p style={{ color: 'var(--no)' }}>{error}</p>}

      {data && (
        <>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, marginBottom: 20 }}>
            <StatCard label="Paper volume traded" value={`$${data.paper_volume_traded.toLocaleString('en-US', { maximumFractionDigits: 0 })}`} accent="var(--gold)" />
            <StatCard label="On the real-money waitlist" value={data.waitlist.toLocaleString()} accent="var(--yes)" />
            <StatCard label="Total users" value={data.users.toLocaleString()} />
            <StatCard label="Trades placed" value={data.transactions.toLocaleString()} />
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, marginBottom: 32 }}>
            <StatCard label="Active markets" value={data.markets_active.toLocaleString()} />
            <StatCard label="Total markets ever" value={data.markets_total.toLocaleString()} />
          </div>

          <h2 style={{ color: 'var(--text)', fontSize: 16, fontWeight: 700, marginBottom: 10 }}>Markets by category</h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {Object.entries(data.markets_by_category).map(([cat, count]) => (
              <div key={cat} style={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 12, padding: '10px 16px', fontSize: 14, color: 'var(--text)' }}>
                {CATEGORY_LABEL[cat] || cat} <span style={{ color: 'var(--gold)', fontWeight: 700, marginLeft: 6 }}>{count}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
