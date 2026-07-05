import TrendingRadar from '../components/TrendingRadar';

// A standalone, no-login review page for the Trending Radar.
// Reachable only by URL (like /pulse) — sidesteps the Supabase-auth admin gate entirely.
export default function RadarPage() {
  return (
    <div className="max-w-4xl mx-auto p-6 lg:p-8">
      <div style={{ marginBottom: 22 }}>
        <h1 style={{ fontFamily: 'var(--wordmark)', fontSize: 26, color: 'var(--text)', margin: 0 }}>
          Trending <span style={{ color: 'var(--gold)' }}>Radar</span>
        </h1>
        <p style={{ color: 'var(--muted)', fontSize: 13.5, marginTop: 6, maxWidth: 560 }}>
          Scans Reddit and entertainment/sports news every day, sorts into Music, Sports, Movies & TV,
          and Awards, and filters out anything that could put a real person in a harmful spotlight.
          Review each one, tweak the wording, and publish — takes a few seconds per market.
        </p>
      </div>
      <TrendingRadar />
    </div>
  );
}
