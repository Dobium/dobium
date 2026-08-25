import { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';
import { SourceRail, GOLD } from '../components/TerminalChrome';

// Waitlist signups, in join order. Replaces having to open
// /api/admin/waitlist?key=… by hand and read raw JSON.
//
// The list endpoint is radar-key gated, so the key is asked for once and kept
// in localStorage. The count shown in the rail comes from the public count
// route and needs no key.

const KEY_STORE = 'dobium_radar_key';
const BG = '#00132D';
const PANEL = '#0C203A';
const LINE = '#1D3350';
const BODY = '#9FB2CC';

function fmt(ts) {
  if (!ts) return '—';
  const d = new Date(ts);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    + ' · ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

export default function WaitlistAdminPage() {
  const [key, setKey] = useState(() => localStorage.getItem(KEY_STORE) || '');
  const [draftKey, setDraftKey] = useState('');
  const [entries, setEntries] = useState([]);
  const [count, setCount] = useState(null);
  const [status, setStatus] = useState('idle'); // idle | loading | ok | denied | error
  const [message, setMessage] = useState('');

  const load = useCallback(async (k) => {
    if (!k) return;
    setStatus('loading');
    try {
      const data = await api.adminWaitlist(k);
      setEntries(Array.isArray(data?.entries) ? data.entries : []);
      setCount(typeof data?.count === 'number' ? data.count : null);
      setStatus('ok');
    } catch (err) {
      const denied = /403|radar key/i.test(err?.message || '');
      setStatus(denied ? 'denied' : 'error');
      setMessage(denied ? 'That key was rejected.' : (err?.message || 'Could not load the list.'));
      if (denied) localStorage.removeItem(KEY_STORE);
    }
  }, []);

  useEffect(() => { if (key) load(key); }, [key, load]);

  const saveKey = () => {
    const k = draftKey.trim();
    if (!k) return;
    localStorage.setItem(KEY_STORE, k);
    setKey(k);
  };

  // Referral counts, derived from the list itself.
  const referralCounts = entries.reduce((acc, e) => {
    if (e.referred_by) acc[e.referred_by] = (acc[e.referred_by] || 0) + 1;
    return acc;
  }, {});
  const invited = entries.filter((e) => e.referred_by).length;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: BG }}>
      <SourceRail active="Waitlist Signups" />

      <main style={{ flex: 1, padding: '28px 32px', overflowX: 'auto' }}>
        <h1 style={{ color: '#FFFFFF', fontSize: 22, fontWeight: 800, margin: 0 }}>Waitlist Signups</h1>

        {status === 'ok' && (
          <div style={{ display: 'flex', gap: 28, marginTop: 16, flexWrap: 'wrap' }}>
            {[
              ['TOTAL', count ?? entries.length],
              ['VIA REFERRAL', invited],
              ['ORGANIC', (count ?? entries.length) - invited],
            ].map(([label, value]) => (
              <div key={label}>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.1em', color: BODY }}>{label}</div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 24, color: label === 'TOTAL' ? GOLD : '#FFFFFF', marginTop: 4 }}>
                  {Number(value).toLocaleString('en-US')}
                </div>
              </div>
            ))}
          </div>
        )}

        {!key || status === 'denied' ? (
          <div style={{ marginTop: 22, background: PANEL, border: `1px solid ${LINE}`, borderRadius: 6, padding: 16, maxWidth: 380 }}>
            <div style={{ color: BODY, fontSize: 12.5, lineHeight: 1.6 }}>
              Enter your admin key once — it's kept in this browser.
            </div>
            <input
              type="password"
              value={draftKey}
              onChange={(e) => setDraftKey(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') saveKey(); }}
              placeholder="Admin key"
              style={{
                marginTop: 10, width: '100%', background: '#0D1A31', border: `1px solid ${LINE}`,
                borderRadius: 4, padding: '9px 11px', color: '#FFFFFF', fontSize: 12.5, outline: 'none',
              }}
            />
            {status === 'denied' && (
              <div style={{ marginTop: 8, color: '#FFB4AB', fontSize: 12 }}>{message}</div>
            )}
            <button
              onClick={saveKey}
              style={{
                marginTop: 10, background: GOLD, border: 'none', borderRadius: 4, padding: '8px 16px',
                cursor: 'pointer', color: '#2A1F00', fontWeight: 700, fontSize: 12.5,
              }}
            >
              Unlock
            </button>
          </div>
        ) : status === 'loading' ? (
          <div style={{ marginTop: 22, color: BODY, fontSize: 13 }}>Loading…</div>
        ) : status === 'error' ? (
          <div style={{ marginTop: 22, color: '#FFB4AB', fontSize: 13 }}>{message}</div>
        ) : entries.length === 0 ? (
          <div style={{ marginTop: 22, color: BODY, fontSize: 13 }}>Nobody has joined yet.</div>
        ) : (
          <div style={{ marginTop: 22, background: PANEL, border: `1px solid ${LINE}`, borderRadius: 6, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
              <thead>
                <tr style={{ background: '#0D1A31' }}>
                  {['#', 'EMAIL', 'JOINED', 'CODE', 'INVITED BY', 'REFERRED'].map((h) => (
                    <th key={h} style={{
                      textAlign: 'left', padding: '9px 12px', color: BODY,
                      fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.1em', fontWeight: 500,
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {entries.map((e, i) => (
                  <tr key={e.id || e.email} style={{ borderTop: `1px solid ${LINE}` }}>
                    <td style={{ padding: '9px 12px', color: BODY, fontFamily: 'var(--mono)' }}>{i + 1}</td>
                    <td style={{ padding: '9px 12px', color: '#FFFFFF' }}>{e.email}</td>
                    <td style={{ padding: '9px 12px', color: BODY }}>{fmt(e.created_at)}</td>
                    <td style={{ padding: '9px 12px', color: BODY, fontFamily: 'var(--mono)', fontSize: 11 }}>{e.referral_code || '—'}</td>
                    <td style={{ padding: '9px 12px', color: BODY, fontFamily: 'var(--mono)', fontSize: 11 }}>{e.referred_by || '—'}</td>
                    <td style={{ padding: '9px 12px', color: e.referral_code && referralCounts[e.referral_code] ? GOLD : BODY, fontFamily: 'var(--mono)' }}>
                      {e.referral_code ? (referralCounts[e.referral_code] || 0) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
