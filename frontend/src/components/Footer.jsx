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

export default function Footer() {
  const { pathname } = useLocation();

  if (pathname === '/') {
    return (
      <footer style={{ borderTop: '1px solid #22314A', background: '#00132D', marginTop: 48 }}>
        <div
          className="dbm-footwrap"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            flexWrap: 'wrap', gap: 14, padding: '24px 28px',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <WaveMark height={15} />
              <span style={{ fontFamily: 'var(--wordmark)', fontWeight: 800, fontSize: 15.5, color: '#F2F5FF' }}>
                Dobium
              </span>
            </div>
            <div style={{ color: '#6E7E9C', fontSize: 11.5, marginTop: 9 }}>
              © 2024 Dobium Markets. High-stakes culture prediction.
            </div>
          </div>
          <nav style={{ display: 'flex', flexWrap: 'wrap', gap: 20 }}>
            {['Terms', 'Privacy', 'Discord', 'API Documentation'].map((label) => (
              <FooterLink key={label} label={label} style={{ color: '#8E9AB0', fontSize: 12 }} />
            ))}
          </nav>
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
