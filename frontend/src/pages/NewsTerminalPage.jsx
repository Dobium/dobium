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
  T_PAGE, T_PANEL, T_TILE, T_LINE, GREEN, GOLD, MUTED, WHITE,
  tmono, ExchangeTopBar, SourceRail,
} from '../components/TerminalChrome';
import { StatusStrip, MarketStreamTable, Hypotheses, TerminalStatusBar, TerminalHeader } from '../components/TerminalPanels';

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
          <TerminalStatusBar />
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
      <TerminalHeader name="NEWS TERMINAL" />

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

