import { useState } from 'react';
import { api } from '../api/client';

// "Secure Early Access" — the referral waitlist card, Dobium's #1 priority element.
// Layout matches the approved mockup: title + copy on the left, email + Submit on the right.
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
      style={{
        position: 'relative',
        overflow: 'hidden',
        borderRadius: 14,
        border: '1px solid var(--line)',
        background: 'linear-gradient(180deg, var(--panel), var(--card))',
        padding: '28px 28px 26px',
      }}
    >
      <div
        style={{
          position: 'absolute', top: 0, left: 28,
          width: 220, height: 3, borderRadius: '0 0 6px 6px',
          background: 'linear-gradient(90deg, var(--gold), transparent)',
        }}
      />

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 22,
        }}
      >
        {/* Left: title + copy */}
        <div style={{ flex: '1 1 340px', minWidth: 260 }}>
          <h2 style={{ fontFamily: 'var(--wordmark)', fontWeight: 700, fontSize: 22, color: 'var(--text)', margin: 0 }}>
            Secure Early Access
          </h2>
          <p style={{ color: 'var(--muted)', fontSize: 13.5, margin: '8px 0 0', lineHeight: 1.55, maxWidth: 480 }}>
            Join the waitlist to receive priority onboarding and exclusive initial allocation
            of paper credits. Refer friends to move up the queue.
          </p>
        </div>

        {/* Right: email + submit, or the joined state */}
        {joined ? (
          <div style={{ flex: '1 1 280px', textAlign: 'left' }}>
            <p style={{ color: 'var(--yes)', fontWeight: 700, fontSize: 15, margin: 0 }}>
              🎉 You&rsquo;re on the list.
            </p>
            <p style={{ color: 'var(--muted)', fontSize: 12.5, margin: '5px 0 0' }}>
              {status === 'already'
                ? 'This email is already on the waitlist — your spot is safe.'
                : "We'll email your invite when real-money trading opens."}
            </p>
          </div>
        ) : (
          <div style={{ flex: '1 1 320px' }}>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && submit()}
                placeholder="Enter your email"
                style={{
                  flex: '1 1 200px',
                  background: 'rgba(10,17,40,.65)', border: '1px solid var(--line)',
                  borderRadius: 8, padding: '12px 14px',
                  color: 'var(--text)', fontSize: 14, outline: 'none',
                }}
              />
              <button
                onClick={submit}
                disabled={status === 'saving'}
                style={{
                  background: 'linear-gradient(180deg, #FFDF9B, var(--gold-2))',
                  color: '#1a1405', fontWeight: 700, fontSize: 14,
                  border: 'none', borderRadius: 8, padding: '12px 24px',
                  cursor: status === 'saving' ? 'wait' : 'pointer',
                  opacity: status === 'saving' ? 0.7 : 1,
                  boxShadow: '0 4px 18px rgba(240,192,74,.22)',
                }}
              >
                {status === 'saving' ? 'Saving…' : 'Submit'}
              </button>
            </div>
            {status === 'error' && (
              <p style={{ color: 'var(--no)', fontSize: 12.5, marginTop: 10, marginBottom: 0 }}>{message}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
