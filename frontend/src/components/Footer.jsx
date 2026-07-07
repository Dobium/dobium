// Sitewide footer — pixel-matched to the approved mockup:
// darker band, plain light wordmark on the left, © line on the right.
export default function Footer() {
  return (
    <footer
      style={{
        borderTop: '1px solid #312F2E',
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
          padding: '24px 24px',
        }}
      >
        <span
          style={{
            fontFamily: 'var(--wordmark)',
            fontWeight: 700,
            fontSize: 18,
            color: '#DCE1FF',
          }}
        >
          Dobium
        </span>

        <span style={{ color: '#D2C5AF', fontSize: 12.5 }}>
          © 2026 Dobium Prediction Markets. High-fidelity paper trading.
        </span>
      </div>
    </footer>
  );
}
