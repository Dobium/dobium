// Sitewide footer — matches the approved mockups:
// wordmark on the left, © line + link row on the right.
const LINKS = [
  { label: 'Terms', href: '#' },
  { label: 'Privacy', href: '#' },
  { label: 'Discord', href: '#' },
  { label: 'Documentation', href: '#' },
  { label: 'Support', href: '#' },
];

export default function Footer() {
  return (
    <footer
      style={{
        borderTop: '1px solid var(--line)',
        background: 'var(--bg)',
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
          padding: '22px 24px',
        }}
      >
        <span
          style={{
            fontFamily: 'var(--wordmark)',
            fontWeight: 700,
            fontSize: 17,
            background: 'linear-gradient(180deg,#FFDF9B,var(--gold-2))',
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            color: 'transparent',
          }}
        >
          Dobium
        </span>

        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 18 }}>
          <span style={{ color: 'var(--muted)', fontSize: 12.5 }}>
            © 2026 Dobium Prediction Markets. High-fidelity paper trading.
          </span>
          <nav style={{ display: 'flex', flexWrap: 'wrap', gap: 14 }}>
            {LINKS.map((l) => (
              <a
                key={l.label}
                href={l.href}
                onClick={(e) => l.href === '#' && e.preventDefault()}
                style={{ color: 'var(--muted)', fontSize: 12.5, transition: 'color .15s ease' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--gold)')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--muted)')}
              >
                {l.label}
              </a>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  );
}
