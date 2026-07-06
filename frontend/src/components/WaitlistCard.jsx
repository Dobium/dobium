import { useState } from 'react';
import { api } from '../api/client';

// The referral waitlist card — Dobium's #1 priority element.
// "Secure Early Access" horizontal panel per the screenshot design.
// Saves through the backend's own database (reliable — no Supabase table/RLS dependency).
export default function WaitlistCard() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('idle'); // idle | saving | done | already | error
  const [message, setMessage] = useState('');

  const submit = async () => {
    const clean = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) {
      setStatus('error');
      setMessage('Enter a valid email address.');
      return;
    }
    setStatus('saving');
    setMessage('');
    try {
      const result = await api.joinWaitlist(clean);
      setStatus(result?.already ? 'already' : 'done');
    } catch (err) {
      setStatus('error');
      setMessage(err?.message || "Couldn't save your spot — please try again in a minute.");
    }
  };

  const joined = status === 'done' || status === 'already';

  return (
    <div
      id="waitlist"
      className="dbm-panel"
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 20, padding: '26px 28px', scrollMarginTop: 80,
      }}
    >
      {/* Left: title + copy */}
      <div style={{ flex: '1 1 320px', minWidth: 260 }}>
        <h2 style={{ fontFamily: 'var(--wordmark)', fontWeight: 400, fontSize: 22, color: 'var(--text)', margin: 0 }}>
          Secure Early Access
        </h2>
        <p style={{ color: 'var(--muted)', fontSize: 13, maxWidth: 440, margin: '8px 0 0', lineHeight: 1.55 }}>
          Join the waitlist to receive priority onboarding and exclusive initial allocation of
          paper credits. Refer friends to move up the queue.
        </p>
      </div>

      {/* Right: input + submit / joined state */}
      {joined ? (
        <div style={{ flex: '0 1 340px', textAlign: 'right' }}>
          <p style={{ color: 'var(--yes)', fontWeight: 700, fontSize: 15, margin: 0 }}>
            🎉 You&rsquo;re on the list.
          </p>
          <p style={{ color: 'var(--muted)', fontSize: 12.5, margin: '6px 0 0' }}>
            {status === 'already'
              ? 'This email is already on the waitlist — your spot is safe.'
              : "We'll email your invite when real-money trading opens."}
          </p>
        </div>
      ) : (
        <div style={{ flex: '0 1 400px', minWidth: 280 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submit()}
              placeholder="Enter your email"
              style={{
                flex: 1,
                background: 'var(--bg)', border: '1px solid var(--line)',
                borderRadius: 6, padding: '11px 14px',
                color: 'var(--text)', fontSize: 13.5, outline: 'none',
              }}
            />
            <button
              onClick={submit}
              disabled={status === 'saving'}
              style={{
                background: 'var(--card-hover)', border: '1px solid var(--line)',
                color: 'var(--text)', fontWeight: 600, fontSize: 13,
                borderRadius: 6, padding: '11px 18px',
                cursor: status === 'saving' ? 'wait' : 'pointer',
                opacity: status === 'saving' ? 0.7 : 1,
                transition: 'all .15s ease',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--gold)'; e.currentTarget.style.color = '#1a1405'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'var(--card-hover)'; e.currentTarget.style.color = 'var(--text)'; }}
            >
              {status === 'saving' ? 'Saving…' : 'Submit'}
            </button>
          </div>
          {status === 'error' && (
            <p style={{ color: 'var(--no)', fontSize: 12.5, marginTop: 8, marginBottom: 0 }}>{message}</p>
          )}
        </div>
      )}
    </div>
  );
}
