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
  // A phone lying flat, drawn in local coordinates (300 x 560, speaker at the
  // top) and projected onto an isometric plane with one matrix, so the screen
  // content tilts with the device. Outline strokes don't scale with the
  // projection (vector-effect), which keeps the line weight even all round.
  const LINE = '#E6EDF7';
  const iso = 'matrix(0.866 0.5 -0.866 0.5 500 18)';
  const ns = { vectorEffect: 'non-scaling-stroke' };
  return (
    <svg viewBox="0 0 780 470" style={{ width: '100%', maxWidth: 680, height: 'auto', display: 'block' }} aria-hidden="true">
      <g transform={iso}>
        {/* body edge, offset to give the slab some depth */}
        <rect x="-10" y="10" width="300" height="560" rx="46" fill="none" stroke={LINE} strokeWidth="2.5" style={ns} opacity="0.55" />
        {/* body */}
        <rect x="0" y="0" width="300" height="560" rx="46" fill="#0A1A33" stroke={LINE} strokeWidth="2.5" style={ns} />
        {/* speaker + camera */}
        <rect x="118" y="32" width="64" height="9" rx="4.5" fill="none" stroke={LINE} strokeWidth="2" style={ns} />
        <circle cx="96" cy="36" r="5" fill="none" stroke={LINE} strokeWidth="2" style={ns} />
        {/* home button */}
        <circle cx="150" cy="522" r="20" fill="none" stroke={LINE} strokeWidth="2" style={ns} />

        {/* screen */}
        <rect x="22" y="66" width="256" height="424" rx="6" fill="#0F2547" stroke={LINE} strokeWidth="1.5" style={ns} />

        {/* Screen content runs along the phone's length, so text reads up and
            to the right and a rising chart actually looks like it's rising.
            Content frame is 424 x 256, origin at the screen's bottom-left. */}
        <g transform="translate(22 490) rotate(-90)">
          <text x="26" y="40" fill="#7E91A8" fontFamily="var(--mono), monospace" fontSize="12" letterSpacing="1.5">YES PRICE</text>
          <text x="24" y="92" fill="#FFFFFF" fontFamily="var(--mono), monospace" fontSize="48" fontWeight="700">62¢</text>
          <text x="26" y="118" fill="#7E91A8" fontFamily="var(--mono), monospace" fontSize="13">Bid 61¢ · Ask 62¢</text>

          {[140, 162, 184].map((y) => (
            <line key={y} x1="26" x2="398" y1={y} y2={y} stroke="#1E3A63" strokeWidth="1" style={ns} />
          ))}
          <polyline
            points="26,186 66,180 98,183 134,170 168,173 204,160 240,164 276,150 316,154 356,142 398,134"
            fill="none" stroke={GOLD} strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" style={ns}
          />
          <circle cx="398" cy="134" r="5" fill={GOLD} />

          <rect x="26" y="204" width="372" height="34" rx="7" fill={GOLD} />
          <text x="212" y="226" fill="#00132D" fontFamily="var(--mono), monospace" fontSize="14" fontWeight="700" textAnchor="middle">Confirm Order</text>
        </g>
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
    { id: 'reddit', label: 'Reddit', href: `https://www.reddit.com/submit?url=${u}&title=${encodeURIComponent(SHARE_MSG)}` },
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
  const [reservedFor, setReservedFor] = useState('');
  const [shareNote, setShareNote] = useState('');

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
        .wl-form { display: flex; justify-content: center; width: 100%; max-width: 560px; }
        .wl-headline { text-wrap: balance; }
        .wl-input { flex: 1; min-width: 0; border-radius: 6px 0 0 6px !important; border-right: none !important; }
        .wl-btn { border-radius: 0 6px 6px 0 !important; }
        @media (max-width: 560px) {
          .wl-form { flex-direction: column; gap: 10px; max-width: 340px; }
          .wl-input { flex: none; border-radius: 6px !important; border-right: 1px solid #26374F !important; }
          .wl-btn { border-radius: 6px !important; }
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
          fontSize: 'clamp(48px, 8vw, 78px)',
          letterSpacing: '0.005em',
          color: GOLD,
          lineHeight: 1.1,
        }}
      >
        Dobium
      </button>

      <h1
        className="wl-headline"
        style={{
          margin: '22px 0 0',
          maxWidth: 820,
          fontSize: 'clamp(20px, 3vw, 30px)',
          fontWeight: 500,
          lineHeight: 1.35,
          color: '#E6EDF7',
          letterSpacing: '-0.01em',
        }}
      >
        The world's $0-commission prediction exchange.
        <br />
        Trade predictions. Pay $0 in commissions.
      </h1>

      {joined ? (
        <div style={{ marginTop: 30, width: '100%', maxWidth: 480 }}>
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
                    {(() => {
                      const where = goal.tier === 1 ? 'at #1' : `in the top ${goal.tier.toLocaleString('en-US')}`;
                      return goal.needed === 1
                        ? `One more invite puts you ${where}.`
                        : `${goal.needed} invites put you ${where}.`;
                    })()}
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
        <form className="wl-form" onSubmit={submit} style={{ marginTop: 34 }}>
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
              borderRadius: 6,
              padding: '0 18px',
              height: 54,
              color: '#FFFFFF',
              fontSize: 15.5,
              outline: 'none',
            }}
          />
          <button
            type="submit"
            className="wl-btn"
            disabled={status === 'saving'}
            style={{
              background: GOLD_BTN,
              border: 'none',
              borderRadius: 6,
              padding: '0 26px',
              height: 54,
              cursor: status === 'saving' ? 'default' : 'pointer',
              color: '#2A1F00',
              fontWeight: 700,
              fontSize: 15.5,
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
        <p style={{ margin: '16px auto 0', maxWidth: 480, fontSize: 13.5, lineHeight: 1.6, color: '#7C8CA6' }}>
          You'll get your place in line and a link to share — every friend who joins with it moves you up 25 places.
          {ref ? ' You were invited, so you already have a head start.' : ''}
        </p>
      )}


      <div style={{ marginTop: 40, width: '100%', display: 'flex', justifyContent: 'center' }}>
        <PhoneShot />
      </div>
    </div>
  );
}
