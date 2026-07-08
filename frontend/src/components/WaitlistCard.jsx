import { useState } from 'react';
import { api } from '../api/client';

// "Secure Early Access" — the referral waitlist card, Dobium's #1 priority element.
// Pixel-matched to the approved mockup: flat panel, light title, warm-gray copy,
// dark input with warm border, slate Submit button (NOT gold).
// Saves through the backend's own database.
export default function WaitlistCard() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('idle'); // idle | saving | done | already | error
  const [message, setMessage] = useState('');
  const [position, setPosition] = useState(null);

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
      if (typeof result?.position === 'number') setPosition(result.position);
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
        background: '#181E36',
        borderRadius: 6,
        padding: '26px 30px',
      }}
    >
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
          <h2 style={{ fontFamily: 'var(--wordmark)', fontWeight: 600, fontSize: 24, color: '#DCE1FF', margin: 0 }}>
            Secure Early Access
          </h2>
          <p style={{ color: '#D2C5AF', fontSize: 13, margin: '9px 0 0', lineHeight: 1.6, maxWidth: 470 }}>
            Join the waitlist to receive priority onboarding and exclusive initial allocation of
            paper credits. Refer friends to move up the queue.
          </p>
        </div>

        {/* Right: email + submit, or the joined state */}
        {joined ? (
          <div style={{ flex: '1 1 280px' }}>
            <p style={{ color: '#64EB87', fontWeight: 700, fontSize: 15, margin: 0 }}>
              🎉 You&rsquo;re {position ? <>#<span style={{ fontFamily: 'var(--mono)' }}>{position.toLocaleString('en-US')}</span></> : ''} on the waitlist.
            </p>
            <p style={{ color: '#D2C5AF', fontSize: 12.5, margin: '5px 0 0' }}>
              {status === 'already'
                ? 'This email is already on the waitlist — your spot is safe.'
                : 'Check your inbox for a confirmation. We\u2019ll email your invite when real-money trading opens.'}
            </p>
          </div>
        ) : (
          <div style={{ flex: '1 1 340px' }}>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && submit()}
                placeholder="Enter your email"
                style={{
                  flex: '1 1 220px',
                  background: '#0B1229', border: '1px solid #464034',
                  borderRadius: 6, padding: '13px 15px',
                  color: '#DCE1FF', fontSize: 14, outline: 'none',
                }}
              />
              <button
                onClick={submit}
                disabled={status === 'saving'}
                style={{
                  background: '#323851',
                  color: '#DCE1FF',
                  fontFamily: 'var(--mono)',
                  fontWeight: 500, fontSize: 13.5,
                  border: 'none', borderRadius: 6, padding: '13px 24px',
                  cursor: status === 'saving' ? 'wait' : 'pointer',
                  opacity: status === 'saving' ? 0.7 : 1,
                }}
              >
                {status === 'saving' ? 'Saving…' : 'Submit'}
              </button>
            </div>
            {status === 'error' && (
              <p style={{ color: '#FFB4AB', fontSize: 12.5, marginTop: 10, marginBottom: 0 }}>{message}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
