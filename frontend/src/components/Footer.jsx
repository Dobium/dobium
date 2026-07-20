import { useLocation } from 'react-router-dom';
import { WaveMark } from './TopNav';

// Sitewide footer, route-aware per the approved mocks:
// • Home ('/'): the simple band — wordmark + "High-stakes culture prediction"
//   © line on the left, Terms / Privacy / Discord / API Documentation right.
// • Everywhere else: the market-terminal three-column layout
//   (PROTOCOL / COMMUNITY / LEGAL) with the "future that matters" tagline.
const COLUMNS = [
  { title: 'PROTOCOL', links: ['Market Integrity', 'Developer API'] },
  { title: 'COMMUNITY', links: ['Community Discord', 'News & Insights'] },
  { title: 'LEGAL', links: ['Terms of Service', 'Privacy Policy'] },
];

function FooterLink({ label, style }) {
  return (
    <a
      href="#"
      onClick={(e) => e.preventDefault()}
      style={{ transition: 'color .15s ease', ...style }}
      onMouseEnter={(e) => (e.currentTarget.style.color = '#FFDF9B')}
      onMouseLeave={(e) => (e.currentTarget.style.color = style.color)}
    >
      {label}
    </a>
  );
}

const EXPLORE_COLUMNS = [
  { title: 'PROTOCOL', links: ['Terms of Service', 'Privacy Policy', 'Market Integrity'] },
  { title: 'ECOSYSTEM', links: ['Community Discord', 'Developer API'] },
];

export default function Footer() {
  const { pathname } = useLocation();

  if (pathname === '/radar' || pathname === '/terminal') {
    return (
      <footer style={{ borderTop: '1px solid #10203A', background: '#000E24' }}>
        <div
          className="dbm-footwrap"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            flexWrap: 'wrap', gap: 18, padding: '20px 28px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, flexWrap: 'wrap' }}>
            <span style={{ fontFamily: 'var(--wordmark)', fontWeight: 800, fontSize: 14.5, color: '#F2F5FF' }}>
              Dobium
            </span>
            <span style={{ color: '#8E9AB0', fontSize: 11.5 }}>
              © 2024 Dobium Terminal. All market data is real-time.
            </span>
          </div>
          <nav style={{ display: 'flex', flexWrap: 'wrap', gap: 22 }}>
            {['Terms', 'Privacy', 'Discord', 'Docs'].map((label) => (
              <FooterLink key={label} label={label} style={{ color: '#8E9AB0', fontSize: 12 }} />
            ))}
          </nav>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
            <span style={{ width: 6, height: 6, borderRadius: 999, background: '#4BE176' }} />
            <span style={{ fontFamily: 'var(--mono)', fontSize: 9.5, fontWeight: 700, letterSpacing: '0.12em', color: '#CFC5B5' }}>
              System Operational
            </span>
          </span>
        </div>
      </footer>
    );
  }

  if (pathname === '/explore') {
    return (
      <footer style={{ borderTop: '1px solid #14223E', background: '#000E24', marginTop: 48 }}>
        <div
          className="dbm-footwrap"
          style={{
            display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
            flexWrap: 'wrap', gap: 36, padding: '30px 28px 34px',
          }}
        >
          <div style={{ maxWidth: 250 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <WaveMark height={15} />
              <span style={{ fontFamily: 'var(--wordmark)', fontWeight: 800, fontSize: 15.5, color: '#F2F5FF' }}>
                Dobium
              </span>
            </div>
            <p style={{ color: '#CFC5B5', fontSize: 11.5, lineHeight: 1.65, margin: '12px 0 0' }}>
              © 2024 Dobium Markets. High-fidelity prediction protocols for a deterministic future.
            </p>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 56 }}>
            {EXPLORE_COLUMNS.map((col) => (
              <div key={col.title}>
                <div
                  style={{
                    fontFamily: 'var(--mono)', fontSize: 9.5, fontWeight: 700,
                    letterSpacing: '0.16em', color: '#CFC5B5',
                  }}
                >
                  {col.title}
                </div>
                <nav style={{ marginTop: 13, display: 'flex', flexDirection: 'column' }}>
                  {col.links.map((label) => (
                    <FooterLink key={label} label={label} style={{ color: '#8E9AB0', fontSize: 11.5, marginBottom: 9 }} />
                  ))}
                </nav>
              </div>
            ))}
          </div>
        </div>
      </footer>
    );
  }

const HOME_COLUMNS = [
  { title: 'Sectors', links: ['Music Intel', 'Cinema Index', 'Event Rumors', 'Tech/Gaming'] },
  { title: 'Resources', links: ['Trade API', 'Market Rules', 'Security', 'Status'] },
];

function ConnectIcon({ kind }) {
  const c = { width: 15, height: 15, viewBox: '0 0 24 24', fill: 'none', stroke: '#8E9AB0', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' };
  if (kind === 'mail') return <svg {...c}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 6 9-6" /></svg>;
  if (kind === 'network') return <svg {...c}><circle cx="12" cy="5" r="2.5" /><circle cx="5" cy="19" r="2.5" /><circle cx="19" cy="19" r="2.5" /><path d="M12 7.5v6M12 13.5L6.8 17M12 13.5l5.2 3.5" /></svg>;
  return <svg {...c}><path d="M4 20V10M10 20V4M16 20v-9M21 20H3" /></svg>;
}

function ConnectButton({ kind }) {
  return (
    <a href="#" onClick={(e) => e.preventDefault()}
      style={{ width: 32, height: 32, borderRadius: 5, border: '1px solid #22314A', background: '#0C203A', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'border-color .15s ease' }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#FFDF9B')}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#22314A')}
    >
      <ConnectIcon kind={kind} />
    </a>
  );
}

  if (pathname === '/') {
    return (
      <footer style={{ borderTop: '1px solid #22314A', background: '#00132D', marginTop: 48 }}>
        <div className="dbm-footwrap" style={{ padding: '34px 28px 0' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 40, justifyContent: 'space-between' }}>
            <div style={{ maxWidth: 320 }}>
              <span style={{ fontFamily: 'var(--wordmark)', fontWeight: 800, fontSize: 17, color: '#FFDF9B' }}>
                Dobium
              </span>
              <p style={{ color: '#8E9AB0', fontSize: 12, lineHeight: 1.7, margin: '12px 0 0' }}>
                The next-generation intelligence exchange for cultural capital. Dobium provides
                high-fidelity, real-time prediction markets for global entertainment, media, and cultural shifts.
              </p>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 56 }}>
              {HOME_COLUMNS.map((col) => (
                <div key={col.title}>
                  <div style={{ fontFamily: 'var(--wordmark)', fontWeight: 700, fontSize: 12.5, color: '#E6EDF9' }}>
                    {col.title}
                  </div>
                  <nav style={{ marginTop: 13, display: 'flex', flexDirection: 'column' }}>
                    {col.links.map((label) => (
                      <FooterLink key={label} label={label} style={{ color: '#8E9AB0', fontSize: 12, marginBottom: 10 }} />
                    ))}
                  </nav>
                </div>
              ))}
              <div>
                <div style={{ fontFamily: 'var(--wordmark)', fontWeight: 700, fontSize: 12.5, color: '#E6EDF9' }}>Connect</div>
                <div style={{ display: 'flex', gap: 8, marginTop: 13 }}>
                  <ConnectButton kind="mail" />
                  <ConnectButton kind="network" />
                  <ConnectButton kind="bars" />
                </div>
              </div>
            </div>
          </div>

          <div style={{ borderTop: '1px solid #1C304F', marginTop: 28, padding: '18px 0', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <span style={{ color: '#5C7391', fontSize: 11 }}>© 2024 Dobium Technologies Inc. All rights reserved.</span>
            <nav style={{ display: 'flex', gap: 20 }}>
              {['Terms', 'Privacy', 'Status'].map((label) => (
                <FooterLink key={label} label={label} style={{ color: '#5C7391', fontSize: 11 }} />
              ))}
            </nav>
          </div>
        </div>
      </footer>
    );
  }

  return (
    <footer style={{ borderTop: '1px solid #14223E', background: '#000E24', marginTop: 48 }}>
      <div
        className="dbm-footwrap"
        style={{
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
          flexWrap: 'wrap', gap: 36, padding: '32px 28px 36px',
        }}
      >
        <div style={{ maxWidth: 300 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <WaveMark height={15} />
            <span style={{ fontFamily: 'var(--wordmark)', fontWeight: 800, fontSize: 15.5, color: '#F2F5FF' }}>
              Dobium
            </span>
          </div>
          <p style={{ color: '#6E7E9C', fontSize: 12, lineHeight: 1.65, margin: '12px 0 0' }}>
            High-fidelity prediction protocols for a future that matters.
            Trade culture, entertainment, and tech with precision.
          </p>
          <div style={{ color: '#4E5E7C', fontSize: 11, marginTop: 16 }}>
            © 2024 Dobium Markets. High-fidelity prediction protocols.
          </div>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 56 }}>
          {COLUMNS.map((col) => (
            <div key={col.title}>
              <div
                style={{
                  fontFamily: 'var(--mono)', fontSize: 9.5, fontWeight: 700,
                  letterSpacing: '0.16em', color: '#5C7391',
                }}
              >
                {col.title}
              </div>
              <nav style={{ marginTop: 13, display: 'flex', flexDirection: 'column' }}>
                {col.links.map((label) => (
                  <FooterLink key={label} label={label} style={{ color: '#8E9AB0', fontSize: 11.5, marginBottom: 9 }} />
                ))}
              </nav>
            </div>
          ))}
        </div>
      </div>
    </footer>
  );
}
