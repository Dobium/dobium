import { useState, useEffect } from 'react';
import { api } from '../api/client';
import { useMarkets } from '../hooks/useMarkets';

// Price Sync panel (Radar page) — link a binary Dobium market to its real-money
// twin on Kalshi (ticker) or Polymarket (slug). A Vercel cron then pulls the
// real price every 30 minutes so paper prices move as real events unfold.
export default function PriceSyncPanel({ radarKey }) {
  const { markets } = useMarkets();
  const [drafts, setDrafts] = useState({}); // marketId -> { provider, ref }
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  const binaryMarkets = markets.filter((m) => {
    const o = m.outcomes || [];
    return m.status === 'active' && o.length === 2 &&
      o.some((x) => (x.title || '').toLowerCase().startsWith('yes'));
  });

  useEffect(() => {
    const init = {};
    binaryMarkets.forEach((m) => {
      let provider = ''; let ref = '';
      if (m.price_source) {
        try {
          const src = JSON.parse(m.price_source);
          provider = src.provider || '';
          ref = src.ticker || src.slug || '';
        } catch { /* ignore */ }
      }
      init[m.id] = { provider, ref };
    });
    setDrafts(init);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [markets.length]);

  const save = async (m) => {
    const d = drafts[m.id] || {};
    setBusy(true); setMsg('');
    try {
      if (!d.provider || !d.ref) {
        await api.setPriceSource(m.id, {}, radarKey);
        setMsg(`Cleared price source for "${m.title}".`);
      } else {
        const body = d.provider === 'kalshi'
          ? { provider: 'kalshi', ticker: d.ref.trim() }
          : { provider: 'polymarket', slug: d.ref.trim() };
        await api.setPriceSource(m.id, body, radarKey);
        setMsg(`Linked "${m.title}" to ${d.provider}. Prices sync every 30 minutes.`);
      }
    } catch (e) {
      setMsg(e?.message || 'Save failed');
    } finally {
      setBusy(false);
    }
  };

  const syncNow = async () => {
    setBusy(true); setMsg('Syncing prices from real markets…');
    try {
      const r = await api.runPriceSync(radarKey);
      setMsg(`Synced ${r.synced} market${r.synced === 1 ? '' : 's'} from real-money prices.`);
    } catch (e) {
      setMsg(e?.message || 'Sync failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-md p-6 mb-8" style={{ background: '#181E36', border: '1px solid #33312E' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 6 }}>
        <h2 style={{ color: '#DCE1FF', fontWeight: 700, fontSize: 17, margin: 0 }}>Price Sync</h2>
        <button onClick={syncNow} disabled={busy}
          style={{ fontFamily: 'var(--mono)', fontSize: 12, background: '#F0C04A', color: '#4A3600', fontWeight: 700, border: 'none', borderRadius: 4, padding: '7px 13px', cursor: 'pointer', opacity: busy ? 0.6 : 1 }}>
          Sync Now
        </button>
      </div>
      <p style={{ color: '#948D87', fontSize: 12, marginBottom: 16, lineHeight: 1.55 }}>
        Link a Yes/No market to its real-money twin and paper prices will track reality automatically
        (every 30 min via cron). Kalshi: paste the market <strong style={{ color: '#D2C5AF' }}>ticker</strong> (e.g. KXOSCARPIC-26).
        Polymarket: paste the URL <strong style={{ color: '#D2C5AF' }}>slug</strong> (the part after /event/).
      </p>
      {msg && <p style={{ color: '#FFDF9B', fontSize: 12.5, fontFamily: 'var(--mono)' }}>{msg}</p>}

      {binaryMarkets.length === 0 ? (
        <p style={{ color: '#948D87', fontSize: 13 }}>No active Yes/No markets to link.</p>
      ) : binaryMarkets.map((m) => {
        const d = drafts[m.id] || { provider: '', ref: '' };
        return (
          <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', padding: '11px 0', borderBottom: '1px solid rgba(45,52,76,.35)' }}>
            <span style={{ flex: '2 1 240px', color: '#DCE1FF', fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.title}</span>
            <select
              value={d.provider}
              onChange={(e) => setDrafts((prev) => ({ ...prev, [m.id]: { ...d, provider: e.target.value } }))}
              style={{ background: '#0B1229', border: '1px solid #33312E', borderRadius: 4, color: '#D2C5AF', fontFamily: 'var(--mono)', fontSize: 12, padding: '7px 9px' }}
            >
              <option value="">no sync</option>
              <option value="kalshi">Kalshi</option>
              <option value="polymarket">Polymarket</option>
            </select>
            <input
              value={d.ref}
              onChange={(e) => setDrafts((prev) => ({ ...prev, [m.id]: { ...d, ref: e.target.value } }))}
              placeholder={d.provider === 'polymarket' ? 'event slug' : 'ticker'}
              style={{ flex: '1 1 160px', background: '#0B1229', border: '1px solid #33312E', borderRadius: 4, color: '#DCE1FF', fontFamily: 'var(--mono)', fontSize: 12, padding: '7px 10px' }}
            />
            <button onClick={() => save(m)} disabled={busy}
              style={{ fontFamily: 'var(--mono)', fontSize: 12, background: '#2D344C', color: '#FFDF9B', border: 'none', borderRadius: 4, padding: '7px 13px', cursor: 'pointer' }}>
              Save
            </button>
          </div>
        );
      })}
    </div>
  );
}
