import { WaveMark } from './TopNav';

// Sitewide footer — matched to the reference mock: near-black band, gold
// waveform mark + white wordmark with the © tagline underneath on the left,
// Terms / Privacy / Discord / API Documentation on the right.
export default function Footer() {
  return (
    <footer
      style={{
        borderTop: '1px solid #1B2240',
        background: '#05060F',
        marginTop: 48,
      }}
    >
      <div
        className="dbm-footwrap"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 14,
          padding: '24px 28px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <WaveMark height={15} />
            <span
              style={{
                fontFamily: 'var(--wordmark)',
                fontWeight: 800,
                fontSize: 15.5,
                color: '#F2F5FF',
              }}
            >
              Dobium
            </span>
          </div>
          <div style={{ color: '#6E7694', fontSize: 11.5, marginTop: 9 }}>
            © 2024 Dobium Markets. High-stakes culture prediction.
          </div>
        </div>

        <nav style={{ display: 'flex', flexWrap: 'wrap', gap: 20 }}>
          {['Terms', 'Privacy', 'Discord', 'API Documentation'].map((label) => (
            <a
              key={label}
              href="#"
              onClick={(e) => e.preventDefault()}
              style={{ color: '#8E94AF', fontSize: 12, transition: 'color .15s ease' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#F3C74F')}
              onMouseLeave={(e) => (e.currentTarget.style.color = '#8E94AF')}
            >
              {label}
            </a>
          ))}
        </nav>
      </div>
    </footer>
  );
}
