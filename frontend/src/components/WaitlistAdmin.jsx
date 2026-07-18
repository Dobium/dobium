import { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';

// Waitlist admin panel (Radar page) — see everyone who's registered, in order,
// export the whole list as CSV for the real-money launch, and remove entries.
// The database is Postgres: entries persist indefinitely until deleted here.
export default function WaitlistAdmin({ radarKey, compact = false }) {
  const [entries, setEntries] = useState([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    api.adminWaitlist(radarKey)
      .then((r) => { setEntries(r.entries || []); setCount(r.count || 0); setError(''); })
      .catch((e) => setError(e?.message || 'Failed to load waitlist'))
      .finally(() => setLoading(false));
  }, [radarKey]);

  useEffect(() => { load(); }, [load]);

  const remove = async (id, email) => {
    if (!window.confirm(`Remove ${email} from the waitlist? This can't be undone.`)) return;
    try {
      await api.adminDeleteWaitlistEntry(id, radarKey);
      load();
    } catch (e) {
      setError(e?.message || 'Delete failed');
    }
  };

  const exportCsv = () => {
    const rows = [['position', 'email', 'joined_at'], ...entries.map((e) => [e.position, e.email, e.created_at])];
    const csv = rows.map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `dobium-waitlist-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  if (compact) {
    return (
      <div style={{ background: '#001F43', border: '1px solid #2F3A4A', borderRadius: 6, padding: '13px 15px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 10 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#CFC5B5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c.8-3.4 3.4-5 6.5-5s5.7 1.6 6.5 5" /><circle cx="17.5" cy="9" r="2.6" /><path d="M16 15.2c2.7.2 4.8 1.6 5.5 4.3" />
            </svg>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 9.5, fontWeight: 800, letterSpacing: '0.16em', color: '#CFC5B5' }}>WAITLIST</span>
          </span>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', color: '#CFC5B5' }}>Total: {count.toLocaleString('en-US')}</span>
        </div>
        {error && <p style={{ color: '#FFB4AB', fontSize: 11, fontFamily: 'var(--mono)', margin: 0 }}>{error}</p>}
        {loading ? (
          <p style={{ color: '#8E9AB0', fontSize: 10.5, fontFamily: 'var(--mono)', margin: 0 }}>Loading…</p>
        ) : entries.length === 0 ? (
          <p style={{ color: '#8E9AB0', fontSize: 10.5, fontFamily: 'var(--mono)', margin: 0 }}>No signups yet.</p>
        ) : (
          <div style={{ maxHeight: 220, overflowY: 'auto', fontFamily: 'var(--mono)', fontSize: 10 }}>
            {entries.map((e, i) => (
              <div key={e.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '9px 0', borderTop: i === 0 ? '1px solid #1C304F' : '1px solid rgba(28,48,79,.5)' }}>
                <span style={{ color: '#E6EDF9', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.email}</span>
                <button onClick={() => remove(e.id, e.email)}
                  style={{ background: 'none', border: 'none', color: '#FFB4AB', cursor: 'pointer', fontSize: 8.5, fontWeight: 700, letterSpacing: '0.14em', fontFamily: 'var(--mono)', flexShrink: 0 }}>
                  DEL
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ background: '#001F43', border: '1px solid #2F3A4A', borderRadius: 6, padding: '14px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#CFC5B5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c.8-3.4 3.4-5 6.5-5s5.7 1.6 6.5 5" /><circle cx="17.5" cy="9" r="2.6" /><path d="M16 15.2c2.7.2 4.8 1.6 5.5 4.3" />
          </svg>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 800, letterSpacing: '0.16em', color: '#CFC5B5' }}>
            WAITLIST <span style={{ color: '#FFDF9B' }}>({count.toLocaleString('en-US')})</span>
          </span>
        </span>
        <div style={{ display: 'flex', gap: 7 }}>
          <button onClick={load} style={{ fontFamily: 'var(--mono)', fontSize: 9.5, fontWeight: 700, background: '#243550', color: '#D5E3FF', border: 'none', borderRadius: 3, padding: '6px 11px', cursor: 'pointer' }}>
            Refresh
          </button>
          <button onClick={exportCsv} disabled={entries.length === 0}
            style={{ fontFamily: 'var(--mono)', fontSize: 9.5, fontWeight: 800, background: '#FFDF9B', color: '#00132D', border: 'none', borderRadius: 3, padding: '6px 11px', cursor: 'pointer', opacity: entries.length === 0 ? 0.5 : 1 }}>
            Export CSV
          </button>
        </div>
      </div>

      {error && <p style={{ color: '#FFB4AB', fontSize: 12 }}>{error}</p>}
      {loading ? (
        <p style={{ color: '#8E9AB0', fontSize: 12, fontFamily: 'var(--mono)' }}>Loading…</p>
      ) : entries.length === 0 ? (
        <p style={{ color: '#8E9AB0', fontSize: 12, fontFamily: 'var(--mono)' }}>No signups yet.</p>
      ) : (
        <div style={{ maxHeight: 340, overflowY: 'auto', fontFamily: 'var(--mono)', fontSize: 10.5 }}>
          <div style={{ display: 'flex', color: '#8E9AB0', fontSize: 8.5, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', paddingBottom: 9, borderBottom: '1px solid #1C304F', position: 'sticky', top: 0, background: '#001F43' }}>
            <span style={{ width: 26 }}>#</span>
            <span style={{ flex: 2 }}>Email</span>
            <span style={{ flex: 1 }}>Joined</span>
            <span style={{ width: 58, textAlign: 'right' }}>Action</span>
          </div>
          {entries.map((e) => (
            <div key={e.id} style={{ display: 'flex', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid rgba(28,48,79,.5)' }}>
              <span style={{ width: 26, color: '#FFDF9B', fontWeight: 700 }}>{e.position}</span>
              <span style={{ flex: 2, color: '#E6EDF9', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: 6 }}>{e.email}</span>
              <span style={{ flex: 1, color: '#CFC5B5' }}>{new Date(e.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
              <span style={{ width: 58, textAlign: 'right' }}>
                <button onClick={() => remove(e.id, e.email)}
                  style={{ background: 'none', border: 'none', color: '#FFB4AB', cursor: 'pointer', fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', fontFamily: 'var(--mono)' }}>
                  REMOVE
                </button>
              </span>
            </div>
          ))}
        </div>
      )}
      <p style={{ color: '#8E9AB0', fontSize: 10.5, fontStyle: 'italic', marginTop: 12, marginBottom: 0 }}>
        Stored in Postgres — entries persist until removed here.
      </p>
    </div>
  );
}
