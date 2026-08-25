import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';

// ── Waitlist landing page ─────────────────────────────────────────────────
// Minimal centred front door: wordmark, one-line pitch, email capture, and a
// tilted device shot. Replaces the earlier terminal-styled page (NETWORK
// ACTIVITY rail, INFORMATION ALPHA feed, IDENTIFICATION PROTOCOL form) —
// same real waitlist API underneath, far less chrome in front of it.

const GOLD = '#F2CE7E';
const GOLD_BTN = '#FFD98A';
const BODY = '#9FB2CC';
const FIELD = '#16233C';
const FIELD_LINE = '#26374F';

function PhoneShot() {
  // Device mock is drawn rather than shipped as an asset — the repo carries no
  // product capture and this environment can't generate one.
  return (
    <svg viewBox="0 0 420 300" style={{ width: '100%', maxWidth: 430, height: 'auto', display: 'block' }}>
      <defs>
        <linearGradient id="wlScreen" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0B1B33" />
          <stop offset="100%" stopColor="#071427" />
        </linearGradient>
        <filter id="wlShadow" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="14" stdDeviation="16" floodColor="#000000" floodOpacity="0.45" />
        </filter>
      </defs>

      <g transform="translate(210 150) rotate(-24) translate(-95 -95)" filter="url(#wlShadow)">
        {/* body */}
        <rect x="0" y="0" width="190" height="190" rx="22" fill="#F4F6FA" />
        <rect x="7" y="7" width="176" height="176" rx="17" fill="url(#wlScreen)" />

        {/* status strip */}
        <rect x="20" y="20" width="26" height="4" rx="2" fill="#31465F" />
        <rect x="150" y="20" width="14" height="4" rx="2" fill="#31465F" />

        {/* price */}
        <text x="20" y="52" fill="#FFFFFF" fontFamily="var(--mono), monospace" fontSize="19" fontWeight="700">$888.88</text>
        <text x="20" y="66" fill="#4BE176" fontFamily="var(--mono), monospace" fontSize="8">▲ 12.4%</text>

        {/* chart */}
        <path
          d="M18,132 L36,124 L52,128 L68,112 L84,118 L100,96 L116,104 L132,84 L148,90 L166,68"
          fill="none"
          stroke={GOLD}
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="166" cy="68" r="3.2" fill={GOLD} />

        {/* buy / sell */}
        <rect x="18" y="150" width="72" height="22" rx="5" fill="#1D8F4E" />
        <text x="54" y="165" fill="#FFFFFF" fontFamily="var(--mono), monospace" fontSize="8.5" fontWeight="700" textAnchor="middle">BUY</text>
        <rect x="100" y="150" width="72" height="22" rx="5" fill="#22344F" />
        <text x="136" y="165" fill="#9FB2CC" fontFamily="var(--mono), monospace" fontSize="8.5" fontWeight="700" textAnchor="middle">SELL</text>
      </g>
    </svg>
  );
}

export default function WaitlistPage() {
  const navigate = useNavigate();
  const emailRef = useRef(null);
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('idle'); // idle | saving | done | already | error
  const [message, setMessage] = useState('');
  const [position, setPosition] = useState(null);
  const [share, setShare] = useState(null);   // { code, referrals, boost }
  const [copied, setCopied] = useState(false);
  const ref = new URLSearchParams(window.location.search).get('ref') || undefined;

  const submit = async (e) => {
    e?.preventDefault();
    const clean = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) {
      setStatus('error');
      setMessage('Enter a valid email address.');
      emailRef.current?.focus();
      return;
    }
    setStatus('saving');
    setMessage('');
    try {
      const result = await api.joinWaitlist(clean, ref);
      if (typeof result?.position === 'number') setPosition(result.position);
      if (result?.referral_code) {
        setShare({
          code: result.referral_code,
          referrals: result.referrals || 0,
          boost: result.boost_per_referral || 25,
        });
      }
      setStatus(result?.already ? 'already' : 'done');
    } catch (err) {
      setStatus('error');
      setMessage(err?.message || "Couldn't save your spot — try again in a minute.");
    }
  };

  const joined = status === 'done' || status === 'already';

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'radial-gradient(120% 90% at 50% 0%, #16264A 0%, #0B1830 45%, #061021 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '64px 24px 40px',
        textAlign: 'center',
      }}
    >
      <style>{`
        .wl-form { display: flex; gap: 10px; justify-content: center; }
        .wl-input { width: 210px; }
        @media (max-width: 560px) {
          .wl-form { flex-direction: column; align-items: stretch; width: 100%; max-width: 300px; }
          .wl-input { width: 100%; }
        }
      `}</style>

      <button
        onClick={() => navigate('/')}
        style={{
          background: 'none',
          border: 'none',
          padding: 0,
          cursor: 'pointer',
          fontFamily: 'var(--wordmark)',
          fontWeight: 600,
          fontSize: 40,
          letterSpacing: '0.01em',
          color: GOLD,
          lineHeight: 1.1,
        }}
      >
        Dobium
      </button>

      <p
        style={{
          margin: '16px 0 0',
          maxWidth: 360,
          fontSize: 13.5,
          lineHeight: 1.55,
          color: BODY,
        }}
      >
        Predictions made tradeable. Trade information as fast as it moves.
      </p>

      {joined ? (
        <div style={{ marginTop: 26, width: '100%', maxWidth: 400 }}>
          <div style={{ color: '#4BE176', fontSize: 13.5, fontWeight: 600 }}>
            {status === 'already' ? "You're already on the list." : "You're on the list."}
          </div>
          {position != null && (
            <div style={{ marginTop: 8, fontFamily: 'var(--mono)', fontSize: 26, color: GOLD }}>
              #{position.toLocaleString('en-US')}
            </div>
          )}

          {share && (
            <div style={{ marginTop: 18, background: FIELD, border: `1px solid ${FIELD_LINE}`, borderRadius: 6, padding: '14px 14px 16px' }}>
              <div style={{ fontSize: 12.5, color: BODY, lineHeight: 1.55 }}>
                {share.referrals > 0
                  ? `${share.referrals} ${share.referrals === 1 ? 'person has' : 'people have'} joined with your link — that's ${(share.referrals * share.boost).toLocaleString('en-US')} places closer.`
                  : `Every friend who joins with your link moves you up ${share.boost} places.`}
              </div>
              <div
                style={{
                  marginTop: 10, fontFamily: 'var(--mono)', fontSize: 11, color: '#FFFFFF',
                  background: '#0D1A31', border: `1px solid ${FIELD_LINE}`, borderRadius: 4,
                  padding: '8px 10px', wordBreak: 'break-all', textAlign: 'left',
                }}
              >
                {`${window.location.origin}/waitlist?ref=${share.code}`}
              </div>
              <button
                onClick={() => {
                  navigator.clipboard
                    ?.writeText(`${window.location.origin}/waitlist?ref=${share.code}`)
                    .then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); })
                    .catch(() => {});
                }}
                style={{
                  marginTop: 10, width: '100%', background: GOLD_BTN, border: 'none', borderRadius: 4,
                  padding: '9px 16px', cursor: 'pointer', color: '#2A1F00', fontWeight: 700, fontSize: 12.5,
                }}
              >
                {copied ? 'Copied' : 'Copy your link'}
              </button>
            </div>
          )}
        </div>
      ) : (
        <form className="wl-form" onSubmit={submit} style={{ marginTop: 26 }}>
          <input
            ref={emailRef}
            className="wl-input"
            type="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); if (status === 'error') setStatus('idle'); }}
            placeholder="Enter email address"
            aria-label="Email address"
            style={{
              background: FIELD,
              border: `1px solid ${FIELD_LINE}`,
              borderRadius: 4,
              padding: '9px 12px',
              color: '#FFFFFF',
              fontSize: 12.5,
              outline: 'none',
            }}
          />
          <button
            type="submit"
            disabled={status === 'saving'}
            style={{
              background: GOLD_BTN,
              border: 'none',
              borderRadius: 4,
              padding: '9px 16px',
              cursor: status === 'saving' ? 'default' : 'pointer',
              color: '#2A1F00',
              fontWeight: 700,
              fontSize: 12.5,
              whiteSpace: 'nowrap',
              opacity: status === 'saving' ? 0.7 : 1,
            }}
          >
            {status === 'saving' ? 'Saving…' : 'Get Early Access'}
          </button>
        </form>
      )}

      {status === 'error' && (
        <div style={{ marginTop: 10, color: '#FFB4AB', fontSize: 12 }}>{message}</div>
      )}

      <div style={{ marginTop: 48, width: '100%', display: 'flex', justifyContent: 'center' }}>
        <PhoneShot />
      </div>
    </div>
  );
}
