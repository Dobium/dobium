// Sitewide footer — matched to the mock: dark band, logo mark + white
// wordmark with the © tagline underneath on the left, link row on the right.
export default function Footer() {
  return (
    <footer
      style={{
        borderTop: '1px solid #1B2240',
        background: '#060D24',
        marginTop: 48,
      }}
    >
      <div
        className="max-w-7xl mx-auto px-6 lg:px-8"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 14,
          padding: '26px 24px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <svg viewBox="0 0 120 110" xmlns="http://www.w3.org/2000/svg" style={{ height: 18, width: 'auto' }} aria-hidden="true">
              <defs>
                <linearGradient id="footGoldG" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="#FFDF9B" /><stop offset="1" stopColor="#F0C04A" />
                </linearGradient>
              </defs>
              <path d="M60 12 L104 34 L104 78 L60 100 L16 78 L16 34 Z" fill="url(#footGoldG)" stroke="url(#footGoldG)" strokeWidth="14" strokeLinejoin="round" />
            </svg>
            <span
              style={{
                fontFamily: 'var(--wordmark)',
                fontWeight: 700,
                fontSize: 17,
                color: '#DCE1FF',
              }}
            >
              Dobium
            </span>
          </div>
          <div style={{ color: '#8E94AF', fontSize: 12, marginTop: 8 }}>
            © 2026 Dobium Markets. High-stakes culture prediction.
          </div>
        </div>

        <nav style={{ display: 'flex', flexWrap: 'wrap', gap: 18 }}>
          {['Terms', 'Privacy', 'Discord', 'API Documentation'].map((label) => (
            <a
              key={label}
              href="#"
              onClick={(e) => e.preventDefault()}
              style={{ color: '#B5AB9B', fontSize: 12, transition: 'color .15s ease' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#FFDF9B')}
              onMouseLeave={(e) => (e.currentTarget.style.color = '#B5AB9B')}
            >
              {label}
            </a>
          ))}
        </nav>
      </div>
    </footer>
  );
}
