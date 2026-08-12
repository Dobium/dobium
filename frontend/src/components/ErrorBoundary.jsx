import { Component } from 'react';

// A crash anywhere under here would otherwise unmount the entire React tree and
// leave a blank white page with no clue what happened — which is exactly what a
// single undefined field on the homepage did. This keeps the failure local and
// visible instead.
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('Render error:', error, info?.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div style={{
        minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 32, background: '#00132D',
      }}>
        <div style={{ maxWidth: 460, textAlign: 'center' }}>
          <div style={{
            fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 700, letterSpacing: '0.16em',
            color: '#FFB4AB', marginBottom: 14,
          }}>SOMETHING BROKE</div>
          <h1 style={{ fontFamily: 'var(--wordmark)', fontWeight: 800, fontSize: 24, color: '#FFFFFF', margin: '0 0 12px' }}>
            This page didn&rsquo;t load
          </h1>
          <p style={{ color: '#CFC5B5', fontSize: 14, lineHeight: 1.6, margin: '0 0 22px' }}>
            Something went wrong rendering this view. Reloading usually clears it.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em',
              background: '#FFDF9B', color: '#2A1F00', border: 'none', borderRadius: 6,
              padding: '12px 22px', cursor: 'pointer',
            }}
          >
            RELOAD
          </button>
        </div>
      </div>
    );
  }
}
