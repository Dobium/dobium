import { useState } from 'react';
import { api } from '../api/client';

// The referral waitlist card — Dobium's #1 priority element.
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
        maxWidth: 660,
        margin: '0 auto',
        textAlign: 'center',
        padding: '38px 28px 34px',
        borderRadius: 18,
        border: '1px solid var(--line)',
        background: 'linear-gradient(180deg, var(--panel), var(--card))',
      }}
    >
      <div
        style={{
          position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
          width: '58%', height: 3, borderRadius: '0 0 6px 6px',
          background: 'linear-gradient(90deg, transparent, var(--gold), transparent)',
        }}
      />
      <div
        style={{
          position: 'absolute', top: -70, left: '50%', transform: 'translateX(-50%)',
          width: 420, height: 180, pointerEvents: 'none',
          background: 'radial-gradient(ellipse at center, rgba(240,192,74,.08), transparent 65%)',
        }}
      />

      <h2 style={{ fontFamily: 'var(--wordmark)', fontWeight: 700, fontSize: 26, color: 'var(--text)', margin: 0 }}>
        Real money is coming.
      </h2>
      <p style={{ color: 'var(--muted)', fontSize: 14, maxWidth: 480, margin: '10px auto 0', lineHeight: 1.55 }}>
        Join the waitlist now — referring friends moves you up the line. Early spots get first
        access at launch.
      </p>

      {joined ? (
        <div style={{ marginTop: 24 }}>
          <p style={{ color: 'var(--yes)', fontWeight: 700, fontSize: 16, margin: 0 }}>
            🎉 You&rsquo;re on the list.
          </p>
          <p style={{ color: 'var(--muted)', fontSize: 13, margin: '6px 0 0' }}>
            {status === 'already'
              ? 'This email is already on the waitlist — your spot is safe.'
              : "We'll email your invite when real-money trading opens."}
          </p>
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap', marginTop: 22 }}>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submit()}
              placeholder="you@email.com"
              style={{
                flex: '1 1 240px', maxWidth: 300,
                background: 'rgba(10,17,40,.65)', border: '1px solid var(--line)',
                borderRadius: 10, padding: '12px 14px',
                color: 'var(--text)', fontSize: 14, outline: 'none',
              }}
            />
            <button
              onClick={submit}
              disabled={status === 'saving'}
              style={{
                background: 'linear-gradient(180deg, #FFDF9B, var(--gold-2))',
                color: '#1a1405', fontWeight: 700, fontSize: 14,
                border: 'none', borderRadius: 10, padding: '12px 22px',
                cursor: status === 'saving' ? 'wait' : 'pointer',
                opacity: status === 'saving' ? 0.7 : 1,
                boxShadow: '0 4px 18px rgba(240,192,74,.22)',
              }}
            >
              {status === 'saving' ? 'Saving…' : 'Claim my spot'}
            </button>
          </div>
          {status === 'error' && (
            <p style={{ color: 'var(--no)', fontSize: 13, marginTop: 12, marginBottom: 0 }}>{message}</p>
          )}
        </>
      )}
    </div>
  );
}
