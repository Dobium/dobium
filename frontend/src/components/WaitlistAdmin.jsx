import { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';

// Waitlist admin panel (Radar page) — see everyone who's registered, in order,
// export the whole list as CSV for the real-money launch, and remove entries.
// The database is Postgres: entries persist indefinitely until deleted here.
export default function WaitlistAdmin({ radarKey }) {
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

  return (
    <div className="rounded-md p-5" style={{ background: '#181E36', border: '1px solid #33312E' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
        <h2 style={{ color: '#DCE1FF', fontWeight: 700, fontSize: 17, margin: 0 }}>
          Waitlist <span style={{ fontFamily: 'var(--mono)', color: '#FFDF9B', fontSize: 15 }}>({count.toLocaleString('en-US')})</span>
        </h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={load} style={{ fontFamily: 'var(--mono)', fontSize: 12, background: '#2D344C', color: '#D2C5AF', border: 'none', borderRadius: 4, padding: '7px 13px', cursor: 'pointer' }}>
            Refresh
          </button>
          <button onClick={exportCsv} disabled={entries.length === 0}
            style={{ fontFamily: 'var(--mono)', fontSize: 12, background: '#F0C04A', color: '#4A3600', fontWeight: 700, border: 'none', borderRadius: 4, padding: '7px 13px', cursor: 'pointer', opacity: entries.length === 0 ? 0.5 : 1 }}>
            Export CSV
          </button>
        </div>
      </div>

      {error && <p style={{ color: '#FFB4AB', fontSize: 12.5 }}>{error}</p>}
      {loading ? (
        <p style={{ color: '#948D87', fontSize: 13 }}>Loading…</p>
      ) : entries.length === 0 ? (
        <p style={{ color: '#948D87', fontSize: 13 }}>No signups yet.</p>
      ) : (
        <div style={{ maxHeight: 340, overflowY: 'auto', fontFamily: 'var(--mono)', fontSize: 12 }}>
          <div style={{ display: 'flex', color: '#948D87', fontSize: 10.5, textTransform: 'uppercase', paddingBottom: 8, borderBottom: '1px solid rgba(45,52,76,.7)', position: 'sticky', top: 0, background: '#181E36' }}>
            <span style={{ width: 44 }}>#</span>
            <span style={{ flex: 2 }}>Email</span>
            <span style={{ flex: 1 }}>Joined</span>
            <span style={{ width: 60, textAlign: 'right' }}>Action</span>
          </div>
          {entries.map((e) => (
            <div key={e.id} style={{ display: 'flex', alignItems: 'center', padding: '9px 0', borderBottom: '1px solid rgba(45,52,76,.35)' }}>
              <span style={{ width: 44, color: '#FFDF9B' }}>{e.position}</span>
              <span style={{ flex: 2, color: '#DCE1FF', overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.email}</span>
              <span style={{ flex: 1, color: '#948D87' }}>{new Date(e.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
              <span style={{ width: 60, textAlign: 'right' }}>
                <button onClick={() => remove(e.id, e.email)}
                  style={{ background: 'none', border: 'none', color: '#CF9290', cursor: 'pointer', fontSize: 11, fontFamily: 'var(--mono)' }}>
                  remove
                </button>
              </span>
            </div>
          ))}
        </div>
      )}
      <p style={{ color: '#948D87', fontSize: 11, marginTop: 12, marginBottom: 0 }}>
        Stored in Postgres — entries persist until removed here.
      </p>
    </div>
  );
}
