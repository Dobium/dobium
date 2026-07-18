import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { DEMO_WAITLIST, WAITLIST_ALERTS } from '../lib/demoContent';

// ── Waitlist landing page — matched to the reference mock ────────────────
// Standalone chrome (Layout steps aside on /waitlist): terminal-styled
// header with BETA chip, gold hero, IDENTIFICATION PROTOCOL email capture
// (wired to the real waitlist API), queue/early-bird cards, and a rail with
// NETWORK ACTIVITY, the INFORMATION ALPHA feed, and a terminal preview.

const GOLD = '#F3C74F';
const GOLD_BTN = '#F6D77E';
const PANEL = '#0E1730';
const BORDER = '#26304C';
const INK = '#C3CBDE';
const DIM = '#5E668A';

function MiniTerminalPreview() {
  // Faux terminal screenshot: waveform + price line + skeleton side column.
  const bars = [8, 18, 12, 26, 34, 22, 40, 30, 46, 36, 24, 42, 28, 16, 32, 20, 38, 26, 14, 22];
  const line = 'M4,86 L26,80 L48,84 L70,70 L92,74 L114,58 L136,64 L158,44 L180,52 L202,34 L216,40';
  return (
    <div style={{ background: '#0B1222', border: '1px solid #1E2A44', borderRadius: 4, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px', borderBottom: '1px solid #1E2A44' }}>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 8, letterSpacing: '0.08em', color: DIM }}>DOBIUM — Terminal · Dark Mode</span>
        <span style={{ display: 'inline-flex', gap: 4 }}>
          {[0, 1, 2].map((i) => <span key={i} style={{ width: 5, height: 5, borderRadius: 999, background: '#26304C' }} />)}
        </span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 84px', gap: 10, padding: 10 }}>
        <svg viewBox="0 0 220 100" style={{ width: '100%', height: 'auto', display: 'block' }}>
          {bars.map((h, i) => (
            <rect key={i} x={6 + i * 10.6} y={38 - h / 2} width={4} height={h} rx={2} fill="#6F7BD9" opacity="0.85" />
          ))}
          <path d={line} fill="none" stroke="#3DDC84" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 7.5, fontWeight: 700, letterSpacing: '0.1em', color: GOLD, marginBottom: 7 }}>TRADING HUB</div>
          {[52, 66, 40, 58].map((w, i) => (
            <div key={i} style={{ height: 6, width: `${w}px`, maxWidth: '100%', background: '#1A2440', borderRadius: 3, marginBottom: 6 }} />
          ))}
          <div style={{ fontFamily: 'var(--mono)', fontSize: 7, letterSpacing: '0.08em', color: DIM, margin: '8px 0 6px' }}>RECENT TXNS</div>
          {[60, 44, 68].map((w, i) => (
            <div key={i} style={{ height: 6, width: `${w}px`, maxWidth: '100%', background: '#1A2440', borderRadius: 3, marginBottom: 6 }} />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function WaitlistPage() {
  const navigate = useNavigate();
  const emailRef = useRef(null);
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('idle'); // idle | saving | done | already | error
  const [message, setMessage] = useState('');
  const [position, setPosition] = useState(null);

  const focusEmail = () => emailRef.current?.focus();

  const submit = async (e) => {
    e?.preventDefault();
    const clean = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) {
      setStatus('error');
      setMessage('ENTER A VALID EMAIL ADDRESS.');
      focusEmail();
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
      setMessage((err?.message || "COULDN'T SAVE YOUR SPOT — TRY AGAIN IN A MINUTE.").toUpperCase());
    }
  };

  const joined = status === 'done' || status === 'already';

  const navLinks = [
    { label: 'Markets', to: '/' },
    { label: 'Signals', to: '/explore' },
    { label: 'Intelligence', to: '/radar' },
    { label: 'Portfolio', to: '/portfolio' },
  ];

  return (
    <div style={{ background: '#00132D', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <style>{`
        .wl-container { max-width: 1160px; margin: 0 auto; width: 100%; }
        .wl-grid { display: grid; grid-template-columns: minmax(0, 1fr) 340px; gap: 22px; }
        .wl-cards { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .wl-form { display: flex; gap: 12px; }
        .wl-links { display: flex; gap: 26px; }
        @media (max-width: 1023px) {
          .wl-grid { grid-template-columns: 1fr; }
          .wl-cards { grid-template-columns: 1fr; }
          .wl-form { flex-direction: column; }
          .wl-links { display: none; }
        }
        .wl-blink { animation: wlblink 1.1s steps(1) infinite; }
        @keyframes wlblink { 50% { opacity: 0; } }
      `}</style>

      {/* ── Header: Dobium + BETA · centered links · gold Join Waitlist ── */}
      <header style={{ borderBottom: '1px solid #17203A' }}>
        <div className="wl-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 18, padding: '12px 24px' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer' }} onClick={() => navigate('/')}>
            <span style={{ fontFamily: 'var(--wordmark)', fontWeight: 800, fontSize: 15.5, color: '#F2F5FF' }}>Dobium</span>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 8.5, fontWeight: 700, letterSpacing: '0.12em', color: '#C9CFE0', border: '1px solid #4A5578', borderRadius: 3, padding: '2px 6px' }}>BETA</span>
          </span>
          <nav className="wl-links">
            {navLinks.map((l) => (
              <button key={l.label} onClick={() => navigate(l.to)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#9AA3BC', fontSize: 12.5, fontWeight: 500 }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#F2F5FF')}
                onMouseLeave={(e) => (e.currentTarget.style.color = '#9AA3BC')}>
                {l.label}
              </button>
            ))}
          </nav>
          <button onClick={focusEmail}
            style={{ background: GOLD_BTN, border: 'none', borderRadius: 4, padding: '8px 16px', cursor: 'pointer', color: '#2A1F00', fontWeight: 700, fontSize: 12.5, fontFamily: 'var(--wordmark)' }}>
            Join Waitlist
          </button>
        </div>
      </header>

      <main className="wl-container" style={{ flex: 1, padding: '34px 24px 8px' }}>
        <div className="wl-grid">
          {/* ── Left: hero + identification protocol + feature cards ── */}
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 9 }}>
              <span style={{ width: 18, height: 18, border: `1px solid ${GOLD}`, borderRadius: 3, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 12, color: GOLD }}>terminal</span>
              </span>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 700, letterSpacing: '0.16em', color: GOLD }}>PRIORITY TERMINAL ACCESS</span>
            </div>

            <h1 style={{ fontFamily: 'var(--wordmark)', fontWeight: 700, fontSize: 40, lineHeight: 1.18, margin: '16px 0 16px' }}>
              <span style={{ color: '#C9D4F2' }}>Secure Priority Access</span><br />
              <span style={{ color: GOLD }}>to Dobium Terminal &amp; Real</span><br />
              <span style={{ color: GOLD }}>Money When it Drops</span>
            </h1>

            <p style={{ color: INK, fontSize: 13.5, lineHeight: 1.65, margin: 0, maxWidth: 470 }}>
              Join the next generation of cultural prediction. Watching information move markets is
              addictive. Our terminal provides the data edge you've been waiting for.
            </p>

            {/* Identification protocol — the real waitlist capture */}
            <div style={{ background: '#10182E', border: `1px solid ${BORDER}`, borderRadius: 6, padding: '16px 18px 14px', position: 'relative', marginTop: 28 }}>
              <span className="material-symbols-outlined" style={{ position: 'absolute', top: 12, right: 14, fontSize: 16, color: DIM }}>shield</span>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 9.5, fontWeight: 700, letterSpacing: '0.16em', color: '#C9CFE0', marginBottom: 12 }}>
                IDENTIFICATION PROTOCOL
              </div>

              {joined ? (
                <div style={{ background: '#0A101F', border: `1.5px solid ${GOLD}`, borderRadius: 4, padding: '14px 14px' }}>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 700, color: GOLD, letterSpacing: '0.06em' }}>
                    &gt; {status === 'already' ? 'USER_ID ALREADY REGISTERED — POSITION HELD' : 'ACCESS_REQUEST CONFIRMED'}
                    {position != null ? ` — QUEUE POSITION #${position}` : ''}
                  </span>
                </div>
              ) : (
                <form className="wl-form" onSubmit={submit}>
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, background: '#0A101F', border: `1.5px solid ${GOLD}`, borderRadius: 4, padding: '12px 14px' }}>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 700, color: GOLD, flexShrink: 0 }}>USER_ID:</span>
                    <input
                      ref={emailRef}
                      type="email"
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); if (status === 'error') setStatus('idle'); }}
                      placeholder="ENTER_EMAIL_ADDRESS"
                      style={{ flex: 1, minWidth: 0, background: 'transparent', border: 'none', outline: 'none', fontFamily: 'var(--mono)', fontSize: 12, color: '#DCE1FF', letterSpacing: '0.04em' }}
                    />
                    <span className="wl-blink" style={{ color: GOLD, fontFamily: 'var(--mono)', fontSize: 13, flexShrink: 0 }}>▌</span>
                  </div>
                  <button type="submit" disabled={status === 'saving'}
                    style={{ background: GOLD_BTN, border: 'none', borderRadius: 4, padding: '0 22px', minHeight: 44, cursor: status === 'saving' ? 'wait' : 'pointer', fontFamily: 'var(--mono)', fontWeight: 800, fontSize: 11.5, letterSpacing: '0.08em', color: '#2A1F00', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: status === 'saving' ? 0.75 : 1 }}>
                    {status === 'saving' ? 'TRANSMITTING…' : 'SECURE MY SPOT'}
                    {status !== 'saving' && <span className="material-symbols-outlined" style={{ fontSize: 14 }}>arrow_forward</span>}
                  </button>
                </form>
              )}

              {status === 'error' && (
                <div style={{ fontFamily: 'var(--mono)', fontSize: 9.5, fontWeight: 700, letterSpacing: '0.08em', color: '#F0655B', marginTop: 10 }}>
                  &gt; {message}
                </div>
              )}
              <div style={{ fontFamily: 'var(--mono)', fontSize: 9.5, letterSpacing: '0.08em', color: DIM, marginTop: 10 }}>
                By submitting, you agree to the terminal access protocols and privacy encryption.
              </div>
            </div>

            {/* Feature cards */}
            <div className="wl-cards" style={{ marginTop: 18 }}>
              <div style={{ border: `1px solid ${BORDER}`, borderRadius: 6, padding: '14px 16px', background: 'rgba(16,24,46,.5)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 16, color: GOLD }}>person_add</span>
                  <span style={{ fontFamily: 'var(--wordmark)', fontWeight: 700, fontSize: 13.5, color: '#F2F5FF' }}>Move up the Queue</span>
                </div>
                <p style={{ margin: 0, fontSize: 11.8, lineHeight: 1.6, color: '#A9B2C9' }}>
                  Share your unique link with fellow traders. Every successful
                  verification moves you <span style={{ color: GOLD, fontWeight: 700 }}>50 slots forward</span> in the priority
                  sequence.
                </p>
              </div>
              <div style={{ border: `1px solid ${BORDER}`, borderRadius: 6, padding: '14px 16px', background: 'rgba(16,24,46,.5)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 16, color: GOLD }}>star</span>
                  <span style={{ fontFamily: 'var(--wordmark)', fontWeight: 700, fontSize: 13.5, color: '#F2F5FF' }}>Early Bird Assets</span>
                </div>
                <p style={{ margin: 0, fontSize: 11.8, lineHeight: 1.6, color: '#A9B2C9' }}>
                  Top 100 participants gain permanent "Architect" status with
                  zero-fee trading for the first 12 months and exclusive token
                  airdrops.
                </p>
              </div>
            </div>
          </div>

          {/* ── Right rail ── */}
          <aside style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Network activity */}
            <div style={{ background: PANEL, border: `1px solid ${BORDER}`, borderRadius: 6, padding: 16 }}>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 700, letterSpacing: '0.16em', color: '#C9CFE0', paddingBottom: 10, borderBottom: `1px solid ${BORDER}`, marginBottom: 14 }}>
                NETWORK ACTIVITY
              </div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', color: '#7E88A6', marginBottom: 5 }}>TOTAL WAITLIST SIZE</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 26, fontWeight: 800, color: GOLD }}>{DEMO_WAITLIST.total}</span>
                <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#3DDC84' }}>trending_up</span>
              </div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', color: '#7E88A6', margin: '16px 0 5px' }}>REMAINING EARLY ACCESS SLOTS</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 22, fontWeight: 800, color: '#F0655B' }}>{DEMO_WAITLIST.slots}</span>
                <span className="material-symbols-outlined" style={{ fontSize: 15, color: '#F0655B' }}>warning</span>
              </div>
              <div style={{ marginTop: 16, height: 6, borderRadius: 999, background: '#1A2440', overflow: 'hidden' }}>
                <div style={{ width: `${DEMO_WAITLIST.capacityPct}%`, height: '100%', background: GOLD, borderRadius: 999 }} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.12em', color: '#7E88A6' }}>{DEMO_WAITLIST.capacityPct}% CAPACITY</span>
                <span className="wl-blink" style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.12em', color: '#C9CFE0' }}>SYNCING...</span>
              </div>
            </div>

            {/* Information alpha feed */}
            <div style={{ background: PANEL, border: `1px solid ${BORDER}`, borderRadius: 6, overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 16px 10px', borderBottom: `1px solid ${BORDER}` }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 7, height: 7, borderRadius: 999, background: '#3DDC84' }} />
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 10.5, fontWeight: 700, letterSpacing: '0.1em', color: '#E8ECFF' }}>INFORMATION ALPHA</span>
                </span>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.1em', color: DIM }}>LIVE_FEED</span>
              </div>
              <div style={{ padding: '2px 16px 6px' }}>
                {WAITLIST_ALERTS.map((a, i) => (
                  <div key={a.time} style={{ padding: '12px 0', borderBottom: i < WAITLIST_ALERTS.length - 1 ? '1px solid #1A2440' : 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontFamily: 'var(--mono)', fontSize: 9.5, fontWeight: 700, color: GOLD }}>{a.time}</span>
                      <span style={{ fontFamily: 'var(--mono)', fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', color: a.tagColor }}>{a.tag}</span>
                    </div>
                    <p style={{ margin: '6px 0 0', fontSize: 11.3, lineHeight: 1.55, color: INK }}>{a.text}</p>
                  </div>
                ))}
              </div>
              <button onClick={() => navigate('/terminal')}
                style={{ display: 'block', width: '100%', background: '#1A2440', border: 'none', padding: '11px 0', cursor: 'pointer', fontFamily: 'var(--mono)', fontSize: 9.5, fontWeight: 700, letterSpacing: '0.16em', color: GOLD }}>
                VIEW ALL ALERTS
              </button>
            </div>

            {/* Terminal preview */}
            <div style={{ background: PANEL, border: `1px solid ${BORDER}`, borderRadius: 6, padding: 12 }}>
              <MiniTerminalPreview />
              <div style={{ fontFamily: 'var(--mono)', fontSize: 9.5, fontWeight: 700, letterSpacing: '0.12em', color: GOLD, margin: '10px 0 8px' }}>
                PREVIEW: TERMINAL_v1.0.4
              </div>
              <div style={{ height: 3, background: '#1A2440', borderRadius: 999, overflow: 'hidden' }}>
                <div style={{ width: '62%', height: '100%', background: GOLD }} />
              </div>
            </div>
          </aside>
        </div>
      </main>

      {/* ── Footer per the mock ── */}
      <footer style={{ borderTop: '1px solid #17203A', marginTop: 56 }}>
        <div className="wl-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14, padding: '22px 24px' }}>
          <div>
            <div style={{ fontFamily: 'var(--wordmark)', fontWeight: 800, fontSize: 14, color: '#F2F5FF' }}>Dobium</div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 9.5, letterSpacing: '0.06em', color: DIM, marginTop: 7 }}>
              © 2024 Dobium Intelligence. All rights reserved.
            </div>
          </div>
          <nav style={{ display: 'flex', flexWrap: 'wrap', gap: 22 }}>
            {['Terms of Service', 'Privacy Policy', 'Risk Disclosure', 'API Documentation'].map((label) => (
              <a key={label} href="#" onClick={(e) => e.preventDefault()}
                style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.06em', color: '#9AA3BC' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = GOLD)}
                onMouseLeave={(e) => (e.currentTarget.style.color = '#9AA3BC')}>
                {label}
              </a>
            ))}
          </nav>
        </div>
      </footer>
    </div>
  );
}
