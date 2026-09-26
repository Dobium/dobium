import { useState, useRef, useEffect } from 'react';
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

        {/* quote — a contract price, the way the market page shows it. This used
            to be a green "$888.88 ▲ 12.4%", which reads as winnings. */}
        <text x="20" y="40" fill="#62778F" fontFamily="var(--mono), monospace" fontSize="7" letterSpacing="1">YES PRICE</text>
        <text x="20" y="62" fill="#FFFFFF" fontFamily="var(--mono), monospace" fontSize="21" fontWeight="700">62¢</text>
        <text x="64" y="62" fill="#7E91A8" fontFamily="var(--mono), monospace" fontSize="7.5">Bid 61¢ · Ask 62¢</text>

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

        {/* One gold order button, matching the live ticket, instead of a green
            BUY beside a grey SELL. */}
        <rect x="18" y="150" width="154" height="22" rx="5" fill={GOLD} />
        <text x="95" y="165" fill="#00132D" fontFamily="var(--mono), monospace" fontSize="8.5" fontWeight="700" textAnchor="middle">Confirm Order</text>
      </g>
    </svg>
  );
}

// Where people actually share. A copy button asks someone to leave the page,
// open an app and paste; these open the app with the message already written.
const SHARE_MSG = "I just joined the waitlist for Dobium — The world's $0-commission prediction exchange.";

function shareTargets(url) {
  const full = `${SHARE_MSG} ${url}`;
  const u = encodeURIComponent(url);
  return [
    { id: 'x', label: 'X', href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(SHARE_MSG)}&url=${u}` },
    // Instagram has no share-by-link URL: nothing can pre-fill a post or a
    // story from the web. Copy the link, open Instagram, and say so.
    {
      id: 'ig', label: 'Instagram', href: 'https://www.instagram.com/',
      copy: full, note: 'Message copied — paste it into your story or post.',
    },
    { id: 'mail', label: 'Email', href: `mailto:?subject=${encodeURIComponent("Dobium — The world's $0-commission prediction exchange")}&body=${encodeURIComponent(full)}` },
    // LinkedIn's documented share endpoint (share-offsite) accepts a URL only
    // and discards any text, so the message never appeared. The feed composer
    // takes pre-filled text. It isn't officially documented, so the message is
    // also copied: if LinkedIn ever stops honouring the text, it's one paste.
    {
      id: 'li', label: 'LinkedIn',
      href: `https://www.linkedin.com/feed/?shareActive=true&text=${encodeURIComponent(full)}`,
      copy: full, note: 'Message copied — if it isn\'t already in the post, just paste it.',
    },
  ];
}

// A concrete target beats "refer friends". Someone at #412 being told four
// invites puts them in the top 300 has a reason to send four.
function nextTarget(position, boost) {
  const tiers = [100, 50, 25, 10, 1];
  const tier = tiers.find((t) => position > t);
  if (!tier) return null;
  const needed = Math.ceil((position - tier) / boost);
  return { tier, needed };
}

export default function WaitlistPage() {
  const navigate = useNavigate();
  const emailRef = useRef(null);
  // ?email= pre-fills the field so people invited by email don't retype an
  // address they've already given us. It only fills the box — they still
  // choose to press join.
  const [email, setEmail] = useState(
    () => new URLSearchParams(window.location.search).get('email') || '',
  );

  // Strip the address back out of the URL once read, so it doesn't sit in
  // browser history or ride along if someone copies the link to share it.
  // ?ref= is kept, since that's what credits the referrer.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.has('email')) {
      params.delete('email');
      const qs = params.toString();
      window.history.replaceState(null, '', `${window.location.pathname}${qs ? `?${qs}` : ''}`);
    }
  }, []);
  const [status, setStatus] = useState('idle'); // idle | saving | done | already | error
  const [message, setMessage] = useState('');
  const [position, setPosition] = useState(null);
  const [share, setShare] = useState(null);   // { code, referrals, boost }
  const [copied, setCopied] = useState(false);
  const [total, setTotal] = useState(null);
  const [reservedFor, setReservedFor] = useState('');
  const [shareNote, setShareNote] = useState('');

  // "412 already in line" does more work than any amount of copy. Silent on
  // failure — a missing number should never block the form.
  useEffect(() => {
    api.getWaitlistCount()
      .then((r) => { if (typeof r?.count === 'number' && r.count > 0) setTotal(r.count); })
      .catch(() => {});
  }, []);
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
      setReservedFor(clean);
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
          <div style={{ color: '#FFFFFF', fontSize: 15, fontWeight: 600, lineHeight: 1.5 }}>
            {status === 'already'
              ? 'Welcome back. Your email is already in the signup queue.'
              : 'Thank you. We have added your email address to the signup queue.'}
          </div>

          {position != null && (() => {
            const ahead = Math.max(0, position - 1);
            return ahead === 0 ? (
              <div style={{ marginTop: 14, fontFamily: 'var(--mono)', fontSize: 26, color: GOLD }}>You're first in line</div>
            ) : (
              <div style={{ marginTop: 14 }}>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 34, color: GOLD, lineHeight: 1.1 }}>
                  {ahead.toLocaleString('en-US')}
                </div>
                <div style={{ marginTop: 4, fontSize: 13, color: BODY }}>
                  {ahead === 1 ? 'person ahead of you' : 'people ahead of you'}
                </div>
              </div>
            );
          })()}

          {reservedFor && (
            <div style={{ marginTop: 12, fontSize: 12.5, color: '#7C8CA6' }}>
              This reservation is held for <span style={{ color: '#FFFFFF' }}>{reservedFor}</span>
            </div>
          )}

          {share && (() => {
            const link = `${window.location.origin}/waitlist?ref=${share.code}`;
            const goal = position != null ? nextTarget(position, share.boost) : null;
            return (
              <div style={{ marginTop: 18, background: FIELD, border: `1px solid ${FIELD_LINE}`, borderRadius: 6, padding: '14px 14px 16px' }}>
                <div style={{ fontSize: 12.5, color: BODY, lineHeight: 1.55 }}>
                  {share.referrals > 0
                    ? `${share.referrals} ${share.referrals === 1 ? 'person has' : 'people have'} joined with your link — that's ${(share.referrals * share.boost).toLocaleString('en-US')} places closer.`
                    : `Every friend who joins with your link moves you up ${share.boost} places.`}
                </div>

                {goal && (
                  <div style={{ marginTop: 8, fontSize: 12.5, color: GOLD, lineHeight: 1.55 }}>
                    {goal.needed === 1
                      ? `One more invite puts you in the top ${goal.tier.toLocaleString('en-US')}.`
                      : `${goal.needed} invites puts you in the top ${goal.tier.toLocaleString('en-US')}.`}
                  </div>
                )}

                <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
                  {shareTargets(link).map((t) => (
                    <a
                      key={t.id}
                      href={t.href}
                      target="_blank"
                      rel="noreferrer"
                      onClick={() => {
                        if (t.copy) {
                          navigator.clipboard?.writeText(t.copy).then(() => {
                            setShareNote(t.note);
                            setTimeout(() => setShareNote(''), 5000);
                          }).catch(() => {});
                        }
                      }}
                      style={{
                        display: 'block', textAlign: 'center', textDecoration: 'none',
                        background: '#0D1A31', border: `1px solid ${FIELD_LINE}`, borderRadius: 4,
                        padding: '9px 4px', color: '#FFFFFF', fontSize: 11.5, fontWeight: 600,
                      }}
                    >
                      {t.label}
                    </a>
                  ))}
                </div>

                {shareNote && (
                  <div style={{ marginTop: 8, fontSize: 11.5, color: GOLD }}>{shareNote}</div>
                )}

                {/* On a phone this is the one that matters — it opens the OS
                    share sheet, so their own most-used app is one tap away. */}
                {typeof navigator !== 'undefined' && navigator.share && (
                  <button
                    onClick={() => navigator.share({ title: 'Dobium', text: SHARE_MSG, url: link }).catch(() => {})}
                    style={{
                      marginTop: 6, width: '100%', background: GOLD_BTN, border: 'none', borderRadius: 4,
                      padding: '9px 16px', cursor: 'pointer', color: '#2A1F00', fontWeight: 700, fontSize: 12.5,
                    }}
                  >
                    Share your link
                  </button>
                )}

                <div
                  style={{
                    marginTop: 10, fontFamily: 'var(--mono)', fontSize: 11, color: '#FFFFFF',
                    background: '#0D1A31', border: `1px solid ${FIELD_LINE}`, borderRadius: 4,
                    padding: '8px 10px', wordBreak: 'break-all', textAlign: 'left',
                  }}
                >
                  {link}
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard
                      ?.writeText(`${SHARE_MSG} ${link}`)
                      .then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); })
                      .catch(() => {});
                  }}
                  style={{
                    marginTop: 8, width: '100%', background: 'none', border: `1px solid ${FIELD_LINE}`,
                    borderRadius: 4, padding: '9px 16px', cursor: 'pointer', color: BODY,
                    fontWeight: 600, fontSize: 12.5,
                  }}
                >
                  {copied ? 'Copied' : 'Copy message & link'}
                </button>
              </div>
            );
          })()}

          <p style={{ margin: '16px auto 0', maxWidth: 330, fontSize: 11.5, lineHeight: 1.6, color: '#7C8CA6' }}>
            We'll email you when early access opens. Nothing to pay, and no trading until we're ready.
          </p>
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

      {/* Say what the queue does before they hand over an email, not after. */}
      {!joined && (
        <p style={{ margin: '14px auto 0', maxWidth: 330, fontSize: 11.5, lineHeight: 1.6, color: '#7C8CA6' }}>
          You'll get your place in line and a link to share — every friend who joins with it moves you up 25 places.
          {ref ? ' You were invited, so you already have a head start.' : ''}
        </p>
      )}

      {!joined && total != null && (
        <p style={{ margin: '10px auto 0', fontFamily: 'var(--mono)', fontSize: 11.5, color: GOLD }}>
          {total.toLocaleString('en-US')} already in line
        </p>
      )}

      <div style={{ marginTop: 48, width: '100%', display: 'flex', justifyContent: 'center' }}>
        <PhoneShot />
      </div>
    </div>
  );
}
