// ── DOBIUM News Terminal ───────────────────────────────────────────────────
// Built from Neel's mock. Shares the exchange chrome with RadarPage and
// MarketMakerPage via components/TerminalChrome.
//
// Everything on this page is illustrative: Dobium has no news ingestion feed,
// no equities/FX price source, and no hypothesis engine. The headlines, the
// MARKET STREAM quotes and the AI MARKET HYPOTHESES are all demo content,
// same standing as the Radar terminal's order book.
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  T_PAGE, T_RAIL, T_PANEL, T_TILE, T_LINE, T_ANALYSIS,
  GREEN, SALMON, GOLD, MUTED, WHITE, tmono, ExchangeTopBar, SourceRail,
} from '../components/TerminalChrome';

const RED = '#FF6B6B';

const STORIES = [
  {
    id: 1, min: 0, wire: 'REUTERS',
    head: 'OpenAI announces GPT-6 architecture with reasoning kernels',
    body: "San Francisco-based OpenAI has unveiled its next-generation model, GPT-6, featuring a novel 'Reasoning Kernel' specifically designed for complex…",
    tags: ['#GENAI', '#SEMICONDUCTOR', '#NASDAQ100'],
  },
  {
    id: 2, min: 2, wire: 'BLOOMBERG',
    head: 'Tesla issues hardware recall for CyberTruck navigation modules',
    body: 'National Highway Traffic Safety Administration (NHTSA) reports critical software-hardware incompatibility in 45,000 units. TSLA down 2.4% in pr…',
    tags: ['#TSLA', '#EV', '#NHTSA'],
  },
  {
    id: 3, min: 5, wire: 'AP',
    head: 'Fed rate decision: FOMC maintains current benchmark interest rates',
    body: "Jerome Powell emphasizes 'patience' in press conference as core inflation remains above target. Markets bracing for 'higher for longer' rhetoric.",
    tags: ['#FOMC', '#TREASURIES', '#USD'],
  },
];

const QUOTES = [
  { sym: 'BTC/USD', px: 68412.00, chg: 2.41, dp: 2 },
  { sym: 'NVDA', px: 821.44, chg: 1.12, dp: 2 },
  { sym: 'TSLA', px: 172.10, chg: -2.48, dp: 2 },
  { sym: 'GOLD', px: 2341.20, chg: 0.45, dp: 2 },
  { sym: 'EUR/USD', px: 1.0842, chg: -0.12, dp: 4 },
  { sym: 'AAPL', px: 183.12, chg: 0.08, dp: 2 },
  { sym: 'MSFT', px: 412.30, chg: -0.04, dp: 2 },
  { sym: 'OIL-WTI', px: 78.14, chg: 1.18, dp: 2 },
];

const HYPOTHESES = [
  { id: 'H-094', prob: 74, body: 'Long USD/JPY following FOMC hold; carry trade divergence widening.' },
  { id: 'H-102', prob: 52, body: 'Short TSLA components sector as recall impacts ripple through supply chain.' },
];

const BARS = [26, 34, 22, 40, 30, 52, 44, 68, 58, 82, 70, 92];

function pad2(n) { return String(n).padStart(2, '0'); }

export default function NewsTerminalPage() {
  const navigate = useNavigate();
  const [source, setSource] = useState('News');

  return (
    <div style={{ background: T_PAGE, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <ExchangeTopBar onBrand={() => navigate('/')} />

      <div className="dbm-news-shell" style={{ flex: 1, minHeight: 0 }}>
        <SourceRail source={source} setSource={setSource} />

        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <StatusStrip />
          <div className="dbm-news-body">
            <div style={{ minWidth: 0, padding: 14, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <NewsFeed />
              <SentimentFlow />
            </div>
            <div style={{ minWidth: 0, borderLeft: `1px solid ${T_LINE}`, display: 'flex', flexDirection: 'column' }}>
              <MarketStreamTable />
              <Hypotheses />
            </div>
          </div>
          <NewsStatusBar />
        </div>
      </div>

      <style>{`
        .dbm-news-shell { display: flex; align-items: stretch; }
        .dbm-news-body { display: grid; grid-template-columns: minmax(0,1fr); flex: 1; min-height: 0; }
        @media (min-width: 1100px) {
          .dbm-news-body { grid-template-columns: minmax(0,1fr) 340px; }
        }
        @media (max-width: 899px) {
          .dbm-news-shell { flex-direction: column; }
          .dbm-news-shell > aside { width: 100% !important; }
        }
      `}</style>
    </div>
  );
}

function StatusStrip() {
  const Stat = ({ k, children }) => (
    <div>
      <div style={tmono({ fontSize: 8, letterSpacing: '0.16em', color: MUTED, marginBottom: 6 })}>{k}</div>
      {children}
    </div>
  );
  const Btn = ({ children, gold }) => (
    <button style={{
      ...tmono({ fontSize: 9 }),
      background: gold ? GOLD : T_TILE, color: gold ? '#0A1A33' : '#C6D3E8',
      border: `1px solid ${gold ? GOLD : T_LINE}`, borderRadius: 4,
      padding: '9px 14px', cursor: 'pointer',
    }}>{children}</button>
  );

  return (
    <div style={{ borderBottom: `1px solid ${T_LINE}`, padding: '13px 18px', display: 'flex', alignItems: 'center', gap: 38, flexWrap: 'wrap' }}>
      <Stat k="STREAM STATUS">
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
          <span style={{ width: 6, height: 6, borderRadius: 999, background: GREEN }} />
          <span style={tmono({ fontSize: 10, color: GREEN })}>SYNCHRONIZED</span>
        </span>
      </Stat>
      <Stat k="GLOBAL LATENCY"><span style={{ ...tmono({ fontSize: 10 }), color: WHITE }}>14MS</span></Stat>
      <Stat k="ACTIVE SIGNALS"><span style={{ ...tmono({ fontSize: 10 }), color: WHITE }}>1,204</span></Stat>
      <div style={{ marginLeft: 'auto', display: 'flex', gap: 10 }}>
        <Btn>⚑ MARKET IMPACTS ONLY</Btn>
        <Btn gold>⚡ EXECUTE MACRO</Btn>
      </div>
    </div>
  );
}

function NewsFeed() {
  // Timestamps are rendered relative to load so the wire never looks stale.
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(t);
  }, []);

  const stamp = (minsAgo) => {
    const d = new Date(now.getTime() - minsAgo * 60000);
    return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 13, marginBottom: 16 }}>
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="1.9" strokeLinecap="round">
          <circle cx="12" cy="13" r="2.4" /><path d="M6.5 7.5a8 8 0 0111 0M9 10a4.4 4.4 0 016 0M12 15.5V21" />
        </svg>
        <span style={{ fontFamily: 'var(--wordmark)', fontWeight: 800, fontSize: 21, color: WHITE, letterSpacing: '0.02em' }}>NEWS TERMINAL</span>
        <span style={{ ...tmono({ fontSize: 8.5 }), background: `${RED}22`, color: RED, border: `1px solid ${RED}55`, borderRadius: 3, padding: '5px 9px' }}>LIVE TRANSMISSION</span>
        <svg width="52" height="12" viewBox="0 0 52 12" style={{ marginLeft: 'auto', opacity: 0.5 }}>
          {[2, 6, 3, 8, 4, 9, 5, 7, 3, 6, 2, 5].map((h, i) => (
            <rect key={i} x={i * 4.4} y={6 - h / 2} width="2" height={h} fill={MUTED} rx="1" />
          ))}
        </svg>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {STORIES.map((s) => (
          <article key={s.id} style={{ position: 'relative', background: T_PANEL, border: `1px solid ${T_LINE}`, borderLeft: `2px solid ${GOLD}`, borderRadius: 4, padding: '13px 16px 15px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 13, marginBottom: 9 }}>
                  <span style={{ ...tmono({ fontSize: 10 }), color: GOLD }}>{stamp(s.min)}</span>
                  <span style={tmono({ fontSize: 8.5, letterSpacing: '0.16em', color: MUTED })}>{s.wire}</span>
                </div>
                <h2 style={{ color: WHITE, fontSize: 14.5, fontWeight: 700, lineHeight: 1.4, margin: 0 }}>{s.head}</h2>
              </div>
              <button style={{
                ...tmono({ fontSize: 8.5 }), flexShrink: 0,
                background: 'transparent', color: GOLD, border: `1px solid ${GOLD}88`,
                borderRadius: 3, padding: '9px 12px', cursor: 'pointer',
              }}>⚡ GENERATE<br />MARKETS</button>
            </div>
            <p style={{ color: '#8FA3BC', fontSize: 12.5, lineHeight: 1.65, margin: '11px 0 0' }}>{s.body}</p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
              {s.tags.map((t) => (
                <span key={t} style={{ ...tmono({ fontSize: 8 }), background: T_TILE, color: '#8FA3BC', borderRadius: 3, padding: '5px 8px' }}>{t}</span>
              ))}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function SentimentFlow() {
  return (
    <div style={{ background: T_PANEL, border: `1px solid ${T_LINE}`, borderRadius: 4, padding: '14px 16px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 16 }}>
        <span style={tmono({ fontSize: 8.5, letterSpacing: '0.16em', color: MUTED })}>SENTIMENT FLOW (LAST 60M)</span>
        <span style={{ ...tmono({ fontSize: 10 }), color: GREEN }}>+14.2% POSITIVE SHIFT</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 92 }}>
        {BARS.map((h, i) => (
          <div key={i} style={{ flex: 1, height: `${h}%`, background: i >= BARS.length - 3 ? '#4A5A6C' : '#33414F', borderRadius: '2px 2px 0 0' }} />
        ))}
      </div>
    </div>
  );
}

function MarketStreamTable() {
  const [rows, setRows] = useState(QUOTES);
  const base = useRef(QUOTES);

  // Gentle drift so the board reads as live rather than frozen.
  useEffect(() => {
    const t = setInterval(() => {
      setRows((prev) => prev.map((r, i) => {
        const b = base.current[i];
        const px = r.px * (1 + (Math.random() - 0.5) * 0.0009);
        return { ...r, px, chg: r.chg + (px - b.px) / b.px * 100 * 0.06 };
      }));
    }, 2600);
    return () => clearInterval(t);
  }, []);

  return (
    <div style={{ borderBottom: `1px solid ${T_LINE}` }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '15px 16px 12px' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="2" strokeLinecap="round">
            <path d="M3 17l6-6 4 4 8-8M15 7h6v6" />
          </svg>
          <span style={tmono({ fontSize: 8.5, letterSpacing: '0.16em', color: WHITE })}>MARKET STREAM</span>
        </span>
        <span style={tmono({ fontSize: 8.5, color: GREEN })}>FLOOR: ACTIVE</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '0 14px', padding: '0 16px 8px' }}>
        <span style={tmono({ fontSize: 8, letterSpacing: '0.14em', color: MUTED })}>SYMBOL</span>
        <span style={{ ...tmono({ fontSize: 8, letterSpacing: '0.14em', color: MUTED }), textAlign: 'right' }}>PRICE</span>
        <span style={{ ...tmono({ fontSize: 8, letterSpacing: '0.14em', color: MUTED }), textAlign: 'right', minWidth: 52 }}>CHG%</span>
      </div>

      {rows.map((r) => (
        <div key={r.sym} style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '0 14px', padding: '9px 16px', borderTop: `1px solid ${T_LINE}` }}>
          <span style={{ ...tmono({ fontSize: 10 }), color: WHITE }}>{r.sym}</span>
          <span style={{ ...tmono({ fontSize: 10 }), color: '#C6D3E8', textAlign: 'right' }}>
            {r.px.toLocaleString('en-US', { minimumFractionDigits: r.dp, maximumFractionDigits: r.dp })}
          </span>
          <span style={{ ...tmono({ fontSize: 10 }), color: r.chg < 0 ? SALMON : GREEN, textAlign: 'right', minWidth: 52 }}>
            {r.chg >= 0 ? '+' : ''}{r.chg.toFixed(2)}%
          </span>
        </div>
      ))}
    </div>
  );
}

function Hypotheses() {
  return (
    <div style={{ padding: '15px 16px 18px' }}>
      <div style={tmono({ fontSize: 8.5, letterSpacing: '0.16em', color: MUTED, marginBottom: 14 })}>AI MARKET HYPOTHESES</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
        {HYPOTHESES.map((h) => (
          <div key={h.id} style={{ background: T_ANALYSIS, border: `1px solid ${T_LINE}`, borderLeft: `2px solid ${GOLD}`, borderRadius: 3, padding: '11px 13px 13px' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10, marginBottom: 8 }}>
              <span style={{ ...tmono({ fontSize: 9.5 }), color: WHITE }}>{h.id}</span>
              <span style={{ ...tmono({ fontSize: 9 }), color: GOLD }}>{h.prob}% PROB</span>
            </div>
            <p style={{ color: '#8FA3BC', fontSize: 11.5, lineHeight: 1.6, margin: 0 }}>{h.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function NewsStatusBar() {
  const Ex = ({ name, open }) => (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
      <span style={{ width: 6, height: 6, borderRadius: 999, background: open ? GREEN : '#4A5A6C' }} />
      <span style={tmono({ fontSize: 8.5, color: open ? GREEN : MUTED })}>{name}: {open ? 'OPEN' : 'CLOSED'}</span>
    </span>
  );
  return (
    <div style={{ borderTop: `1px solid ${T_LINE}`, background: T_RAIL, padding: '10px 18px', display: 'flex', alignItems: 'center', gap: 22, flexWrap: 'wrap' }}>
      <Ex name="NYSE" open />
      <Ex name="LSE" open />
      <Ex name="TSE" />
      <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 18 }}>
        <span style={tmono({ fontSize: 8.5, color: MUTED })}>⛁ DB-CLUSTER-A [REPLICATED]</span>
        <span style={tmono({ fontSize: 8.5, color: MUTED })}>TERMINAL V. NEWS-4.0.2</span>
      </span>
    </div>
  );
}
