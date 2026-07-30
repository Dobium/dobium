// ── DOBIUM Market Maker ────────────────────────────────────────────────────
// Single-market maker terminal, built from Neel's mocks. Shares the exchange
// chrome with RadarPage via components/TerminalChrome.
//
// What's real vs. illustrative: the market title, probability, 24h volume and
// resolution text come from the live market when one is available. The order
// book depth, trade prints, sentiment matrix and intelligence summary are
// synthetic — Dobium has no resting limit orders and no per-wallet order flow,
// same standing as the Radar terminal's ladder and tape.
import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMarkets } from '../hooks/useMarkets';
import {
  T_PAGE, T_RAIL, T_PANEL, T_TILE, T_LINE, T_ASK, T_BID, T_ANALYSIS,
  GREEN, SALMON, GOLD, MUTED, WHITE, tmono, ExchangeTopBar, SourceRail,
} from '../components/TerminalChrome';

const RANGES = ['1H', '4H', '1D', '1W'];

const DEMO = {
  title: 'GTA VI Release (Dec 2025)',
  identifier: 'RSG-G6-202512',
  prob: 74.2,
  delta: 4.2,
  volume24h: '$4.28M USD',
  openInterest: '$12,402,190',
  participants: '1,248',
  origin: 'News',
  category: 'Gaming',
  criteria: 'This market resolves to "YES" if Grand Theft Auto VI (GTA VI) is officially released to the public on any major gaming platform (PS5, Xbox Series X/S, or PC) on or before December 31, 2025, 23:59 ET. "Release" is defined as available for digital download or physical purchase. In the event of a delay announced by Rockstar Games or Take-Two Interactive beyond this window, the market resolves to "NO".',
};

const SIGNALS = [
  { at: 0.42, label: 'SIGNAL ALPHA-7', body: "Rockstar Domain Registry Update: 'GTAVI-Social.com' active." },
  { at: 0.66, label: 'METADATA LEAK', body: "Internal Take-Two roadmap mentions 'Project Americas' final stage." },
];

const WALLETS = ['0xbc31', '0xf0a1', '0x44ee', '0x8f2c', '0x9921', '0x1a9d'];

function pad2(n) { return String(n).padStart(2, '0'); }
function clockAt(d) { return `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`; }

function makeFill(mid, seq, at) {
  const side = Math.random() < 0.42 ? 'SELL' : 'BUY';
  const px = (mid + (Math.random() * 0.3 - 0.15)).toFixed(1);
  return {
    id: seq,
    time: clockAt(new Date(at)),
    wallet: WALLETS[Math.floor(Math.random() * WALLETS.length)],
    side,
    qty: (Math.floor(Math.random() * 48) + 2) * 100,
    px,
  };
}

// Prints land every three seconds, matching the cadence in the mock.
function useTapeFeed(mid) {
  const seq = useRef(0);
  const [rows, setRows] = useState([]);

  useEffect(() => {
    const now = Date.now();
    const seed = [];
    for (let i = 17; i >= 0; i -= 1) seed.push(makeFill(mid, seq.current++, now - i * 3000));
    setRows(seed.reverse());
  }, [mid]);

  useEffect(() => {
    const t = setInterval(() => {
      setRows((prev) => [makeFill(mid, seq.current++, Date.now()), ...prev].slice(0, 24));
    }, 3000);
    return () => clearInterval(t);
  }, [mid]);

  return rows;
}

export default function MarketMakerPage() {
  const navigate = useNavigate();
  const { markets } = useMarkets();
  const [range, setRange] = useState('1H');
  const [side, setSide] = useState('YES');
  const [source, setSource] = useState('Market Maker');
  const [contracts, setContracts] = useState('1000');

  const m = useMemo(() => {
    const live = (markets || []).filter((x) => x.status === 'active' || x.status === 'open');
    return live.sort((a, b) => (b.total_volume || 0) - (a.total_volume || 0))[0] || null;
  }, [markets]);

  const title = m?.title || DEMO.title;
  const rawProb = m
    ? (((m.outcomes || []).find((o) => /\(yes\)/i.test(o.name || '')) || (m.outcomes || [])[0])?.probability)
    : null;
  const price = Number.isFinite(Number(rawProb)) ? Number(rawProb) : DEMO.prob;
  const [priceInput, setPriceInput] = useState('');
  const tape = useTapeFeed(price);

  return (
    <div style={{ background: T_PAGE, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <ExchangeTopBar onBrand={() => navigate('/')} />

      <div className="dbm-mm-shell" style={{ flex: 1, minHeight: 0 }}>
        <SourceRail source={source} setSource={setSource} />

        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <MarketHeader title={title} price={price} />

          <div className="dbm-mm-body">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0, padding: 14 }}>
              <ChartPanel title={title} range={range} setRange={setRange} />
              <div className="dbm-mm-lower">
                <ResolutionPanel market={m} />
                <SourcePanel />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, borderLeft: `1px solid ${T_LINE}` }}>
              <DepthPanel price={price} />
              <TapePanel rows={tape} />
              <SentimentMatrix />
              <IntelligenceSummary />
            </div>
          </div>

          <TicketBar
            side={side} setSide={setSide}
            contracts={contracts} setContracts={setContracts}
            priceInput={priceInput} setPriceInput={setPriceInput}
            price={price}
          />
        </div>
      </div>

      <style>{`
        .dbm-mm-shell { display: flex; align-items: stretch; }
        .dbm-mm-body { display: grid; grid-template-columns: minmax(0,1fr); }
        .dbm-mm-lower { display: grid; grid-template-columns: minmax(0,1fr); gap: 14px; }
        @media (min-width: 1100px) {
          .dbm-mm-body { grid-template-columns: minmax(0,1fr) 400px; }
          .dbm-mm-lower { grid-template-columns: minmax(0,1.35fr) minmax(0,1fr); align-items: start; }
        }
        @media (max-width: 899px) {
          .dbm-mm-shell { flex-direction: column; }
          .dbm-mm-shell > aside { width: 100% !important; }
        }
      `}</style>
    </div>
  );
}

function MarketHeader({ price }) {
  const Btn = ({ children, gold }) => (
    <button style={{
      ...tmono({ fontSize: 9.5 }),
      background: gold ? GOLD : T_TILE, color: gold ? '#0A1A33' : '#C6D3E8',
      border: `1px solid ${gold ? GOLD : T_LINE}`, borderRadius: 4,
      padding: '11px 17px', cursor: 'pointer',
    }}>{children}</button>
  );

  return (
    <div style={{ borderBottom: `1px solid ${T_LINE}`, padding: '16px 22px', display: 'flex', alignItems: 'center', gap: 36, flexWrap: 'wrap' }}>
      <div>
        <div style={tmono({ fontSize: 8.5, letterSpacing: '0.16em', color: MUTED, marginBottom: 7 })}>MARKET IDENTIFIER</div>
        <div style={{ ...tmono({ fontSize: 16 }), color: WHITE }}>{DEMO.identifier}</div>
      </div>
      <div>
        <div style={tmono({ fontSize: 8.5, letterSpacing: '0.16em', color: MUTED, marginBottom: 7 })}>CURRENT PROBABILITY</div>
        <div style={{ display: 'inline-flex', alignItems: 'baseline', gap: 10 }}>
          <span style={{ ...tmono({ fontSize: 21 }), color: GOLD }}>{price.toFixed(1)}¢</span>
          <span style={{ ...tmono({ fontSize: 10.5 }), color: GREEN }}>▲ +{DEMO.delta}%</span>
        </div>
      </div>
      <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
        <div style={tmono({ fontSize: 8.5, letterSpacing: '0.16em', color: MUTED, marginBottom: 7 })}>24H VOLUME</div>
        <div style={{ ...tmono({ fontSize: 12.5 }), color: WHITE }}>{DEMO.volume24h}</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Btn>DEPLOY MARKET</Btn>
        <Btn>ALERTS</Btn>
        <Btn gold>WATCHLIST</Btn>
      </div>
    </div>
  );
}

function ChartPanel({ title, range, setRange }) {
  // Static series — this is a shape, not a price history feed.
  const pts = [[0, 78], [10, 74], [20, 66], [30, 70], [40, 52], [50, 56], [58, 44], [70, 46], [82, 30], [92, 22], [100, 14]];
  const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0]},${p[1]}`).join(' ');

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap', marginBottom: 18 }}>
        <h1 style={{ color: WHITE, fontWeight: 800, fontSize: 'clamp(21px,2.6vw,31px)', lineHeight: 1.18, margin: 0, maxWidth: 380 }}>{title}</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ ...tmono({ fontSize: 9, color: MUTED }), background: T_PANEL, border: `1px solid ${T_LINE}`, borderRadius: 4, padding: '9px 13px', lineHeight: 1.5 }}>
            SETTLEMENT:<br />BINARY
          </span>
          {RANGES.map((r) => (
            <button key={r} onClick={() => setRange(r)}
              style={{
                ...tmono({ fontSize: 10 }),
                background: range === r ? '#233243' : 'transparent',
                color: range === r ? WHITE : MUTED,
                border: 'none', borderRadius: 4, padding: '9px 12px', cursor: 'pointer',
              }}>{r}</button>
          ))}
        </div>
      </div>

      <div style={{ position: 'relative', background: T_RAIL, border: `1px solid ${T_LINE}`, borderRadius: 4, overflow: 'hidden' }}>
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ display: 'block', width: '100%', height: 360 }}>
          <defs>
            <linearGradient id="mmFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={GOLD} stopOpacity="0.20" />
              <stop offset="100%" stopColor={GOLD} stopOpacity="0.02" />
            </linearGradient>
          </defs>
          {[20, 40, 60, 80].map((y) => <line key={`h${y}`} x1="0" y1={y} x2="100" y2={y} stroke={T_LINE} strokeWidth="0.3" />)}
          {[12.5, 25, 37.5, 50, 62.5, 75, 87.5].map((x) => <line key={`v${x}`} x1={x} y1="0" x2={x} y2="100" stroke={T_LINE} strokeWidth="0.3" />)}
          <path d={`${path} L100,100 L0,100 Z`} fill="url(#mmFill)" />
          <path d={path} fill="none" stroke={GOLD} strokeWidth="0.7" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
          {SIGNALS.map((s) => (
            <line key={s.label} x1={s.at * 100} y1="18" x2={s.at * 100} y2="62" stroke={GOLD} strokeWidth="0.3" opacity="0.5" />
          ))}
        </svg>
        {SIGNALS.map((s, i) => (
          <div key={s.label}
            style={{
              position: 'absolute', left: `${s.at * 100}%`, top: i === 0 ? '30%' : '12%',
              width: 168, background: T_PANEL, border: `1px solid ${T_LINE}`, borderLeft: `2px solid ${GOLD}`,
              padding: '9px 11px', boxShadow: '0 8px 22px rgba(0,0,0,0.5)',
            }}>
            <div style={tmono({ fontSize: 8.5, letterSpacing: '0.14em', color: GOLD, marginBottom: 6 })}>{s.label}</div>
            <div style={{ color: '#C6D3E8', fontSize: 11, lineHeight: 1.5 }}>{s.body}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ResolutionPanel({ market }) {
  return (
    <div>
      <div style={tmono({ fontSize: 8.5, letterSpacing: '0.16em', color: MUTED, marginBottom: 13 })}>RESOLUTION CRITERIA</div>
      <p style={{ color: '#C6D3E8', fontSize: 13, lineHeight: 1.75, margin: 0 }}>
        {market?.description || DEMO.criteria}
      </p>
    </div>
  );
}

function SourcePanel() {
  const Row = ({ k, v, mono }) => (
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, marginTop: 11 }}>
      <span style={mono ? tmono({ fontSize: 8.5, letterSpacing: '0.14em', color: MUTED }) : { color: MUTED, fontSize: 11.5 }}>{k}</span>
      <span style={{ ...tmono({ fontSize: 10 }), color: '#C6D3E8' }}>{v}</span>
    </div>
  );

  return (
    <div style={{ background: T_ANALYSIS, border: `1px solid ${T_LINE}`, borderRadius: 4, padding: '14px 16px 16px' }}>
      <div style={tmono({ fontSize: 8.5, letterSpacing: '0.16em', color: MUTED, marginBottom: 12 })}>MARKET SOURCE</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <svg viewBox="0 0 22 22" width="19" height="19" style={{ flexShrink: 0 }}>
          <path fill={GOLD} d="M11 0l2.09 1.36 2.47-.44 1.02 2.3 2.3 1.02-.44 2.47L20 8.8l-1.36 2.09L20 13.2l-1.56 1.89.44 2.47-2.3 1.02-1.02 2.3-2.47-.44L11 22l-2.09-1.36-2.47.44-1.02-2.3-2.3-1.02.44-2.47L2 13.2l1.36-2.09L2 8.8l1.56-1.89-.44-2.47 2.3-1.02L6.44.92l2.47.44z" />
          <path d="M6.7 11.1l2.7 2.7 5.4-5.9" fill="none" stroke="#0A1A33" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span style={{ color: WHITE, fontSize: 14, fontWeight: 700, lineHeight: 1.3 }}>Official Dobium Oracle</span>
      </div>
      <div style={{ borderTop: `1px solid ${T_LINE}`, marginTop: 14, paddingTop: 3 }}>
        <Row k="Open Interest" v={DEMO.openInterest} />
        <Row k="Total Participants" v={DEMO.participants} />
        <Row k="SOURCE ORIGIN" v={DEMO.origin} mono />
        <Row k="CATEGORY" v={DEMO.category} mono />
      </div>
    </div>
  );
}

function DepthPanel({ price }) {
  const asks = [
    { px: (price + 0.6).toFixed(1), size: 12400, w: 22 },
    { px: (price + 0.5).toFixed(1), size: 28150, w: 44 },
    { px: (price + 0.3).toFixed(1), size: 45000, w: 72 },
  ];
  const bids = [
    { px: price.toFixed(1), size: 82000, w: 92 },
    { px: (price - 0.1).toFixed(1), size: 34200, w: 47 },
    { px: (price - 0.2).toFixed(1), size: 18900, w: 26 },
  ];

  const Row = ({ r, ask }) => (
    <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 16px' }}>
      <span style={{ position: 'absolute', left: 0, top: 2, bottom: 2, width: `${r.w}%`, background: ask ? T_ASK : T_BID }} />
      <span style={{ ...tmono({ fontSize: 10.5 }), color: ask ? SALMON : GREEN, position: 'relative' }}>{r.px}</span>
      <span style={{ ...tmono({ fontSize: 10.5 }), color: '#C6D3E8', position: 'relative' }}>{r.size.toLocaleString('en-US')}</span>
    </div>
  );

  return (
    <div style={{ borderBottom: `1px solid ${T_LINE}`, padding: '16px 0 14px' }}>
      <div style={{ ...tmono({ fontSize: 8.5, letterSpacing: '0.16em', color: MUTED }), padding: '0 16px 13px' }}>ORDER BOOK DEPTH</div>
      {asks.map((r) => <Row key={r.px} r={r} ask />)}
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 16px', borderTop: `1px solid ${T_LINE}`, borderBottom: `1px solid ${T_LINE}`, margin: '7px 0' }}>
        <span style={tmono({ fontSize: 9, color: MUTED })}>SPREAD: 0.3¢</span>
        <span style={tmono({ fontSize: 9, color: MUTED })}>LAST: {price.toFixed(1)}¢</span>
      </div>
      {bids.map((r) => <Row key={r.px} r={r} />)}
    </div>
  );
}

function TapePanel({ rows }) {
  return (
    <div style={{ borderBottom: `1px solid ${T_LINE}`, padding: '16px 0 12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px 13px' }}>
        <span style={tmono({ fontSize: 8.5, letterSpacing: '0.16em', color: MUTED })}>LIVE TRADE STREAM</span>
        <span style={{ width: 7, height: 7, borderRadius: 999, background: GREEN }} />
      </div>
      <div style={{ maxHeight: 430, overflowY: 'auto' }}>
        {rows.map((r) => (
          <div key={r.id} className="dbm-mm-fill"
            style={{ display: 'flex', alignItems: 'baseline', gap: 12, padding: '5px 16px', ...tmono({ fontSize: 10 }) }}>
            <span style={{ color: '#5C7391' }}>{r.time}</span>
            <span style={{ color: '#8FA3BC' }}>{r.wallet} …</span>
            <span style={{ color: r.side === 'SELL' ? SALMON : GREEN, marginLeft: 'auto' }}>{r.side}</span>
            <span style={{ color: '#C6D3E8', minWidth: 46, textAlign: 'right' }}>{r.qty.toLocaleString('en-US')}</span>
            <span style={{ color: '#C6D3E8', minWidth: 34, textAlign: 'right' }}>{r.px}</span>
          </div>
        ))}
      </div>
      <style>{`
        @keyframes dbmFillIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: none; } }
        .dbm-mm-fill { animation: dbmFillIn 400ms ease-out; }
        @media (prefers-reduced-motion: reduce) { .dbm-mm-fill { animation: none; } }
      `}</style>
    </div>
  );
}

function SentimentMatrix() {
  const Cell = ({ k, v, color }) => (
    <div>
      <div style={tmono({ fontSize: 8, letterSpacing: '0.14em', color: MUTED, marginBottom: 9 })}>{k}</div>
      <div style={{ ...tmono({ fontSize: 17 }), color }}>{v}</div>
    </div>
  );
  return (
    <div style={{ padding: '16px 16px 18px', borderBottom: `1px solid ${T_LINE}` }}>
      <div style={tmono({ fontSize: 8.5, letterSpacing: '0.16em', color: MUTED, marginBottom: 14 })}>SENTIMENT MATRIX</div>
      <div style={{ background: T_ANALYSIS, border: `1px solid ${T_LINE}`, borderRadius: 4, padding: '16px 18px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px 14px' }}>
        <Cell k="BULLISH VOLUME" v="68%" color={GREEN} />
        <Cell k="BEARISH SENTIMENT" v="32%" color={SALMON} />
        <Cell k="CONF. EVIDENCE" v="High" color={GREEN} />
        <Cell k="RUMOR NOISE" v="Low" color={WHITE} />
      </div>
    </div>
  );
}

function IntelligenceSummary() {
  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 13 }}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="1.9" strokeLinecap="round">
          <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" />
        </svg>
        <span style={tmono({ fontSize: 8.5, letterSpacing: '0.16em', color: GOLD })}>INTELLIGENCE SUMMARY</span>
      </div>
      <div style={{ borderLeft: `2px solid ${GOLD}`, paddingLeft: 13 }}>
        <p style={{ color: '#C6D3E8', fontSize: 11.5, lineHeight: 1.75, margin: 0 }}>
          Volume spike detected in London nodes following Rockstar internal API update (12.0.4).
          Correlation with historical 'Trailer 1' metadata patterns is <span style={{ color: GOLD }}>94%</span>.
          Sentiment leans heavily long-tail towards Q4 2025. Institutional accumulation observed at{' '}
          <span style={{ color: GOLD }}>72.0¢</span> level.
        </p>
      </div>
    </div>
  );
}

function TicketBar({ side, setSide, contracts, setContracts, priceInput, setPriceInput, price }) {
  const field = {
    background: T_TILE, border: `1px solid ${T_LINE}`, borderRadius: 4,
    padding: '11px 13px', color: WHITE, width: '100%',
    ...tmono({ fontSize: 12 }),
  };

  return (
    <div style={{ borderTop: `1px solid ${T_LINE}`, background: T_PAGE, padding: '16px 22px', display: 'flex', alignItems: 'flex-end', gap: 26, flexWrap: 'wrap' }}>
      <div>
        <div style={tmono({ fontSize: 8.5, letterSpacing: '0.16em', color: MUTED, marginBottom: 10 })}>POSITION SIDE</div>
        <div style={{ display: 'flex', gap: 8 }}>
          {[['YES', 'BUY / YES'], ['NO', 'SELL / NO']].map(([k, label]) => {
            const on = side === k;
            return (
              <button key={k} onClick={() => setSide(k)}
                style={{
                  ...tmono({ fontSize: 9.5 }), lineHeight: 1.5,
                  background: on ? '#2A2A22' : T_TILE,
                  color: on ? GOLD : '#8FA3BC',
                  border: `1px solid ${on ? GOLD : T_LINE}`, borderRadius: 4,
                  padding: '10px 15px', cursor: 'pointer', whiteSpace: 'pre-line',
                }}>{label.replace(' / ', '\n/ ')}</button>
            );
          })}
        </div>
      </div>

      <div style={{ minWidth: 70 }}>
        <div style={tmono({ fontSize: 8.5, letterSpacing: '0.16em', color: MUTED, marginBottom: 10 })}>ORDER<br />TYPE</div>
        <select style={{ ...field, cursor: 'pointer' }}>
          <option>LIMIT</option>
          <option>MARKET</option>
        </select>
      </div>

      <div style={{ minWidth: 170 }}>
        <div style={tmono({ fontSize: 8.5, letterSpacing: '0.16em', color: MUTED, marginBottom: 10 })}>CONTRACTS</div>
        <input value={contracts} onChange={(e) => setContracts(e.target.value)} style={field} />
      </div>

      <div style={{ minWidth: 120 }}>
        <div style={tmono({ fontSize: 8.5, letterSpacing: '0.16em', color: MUTED, marginBottom: 10 })}>PRICE (¢)</div>
        <input value={priceInput} placeholder={price.toFixed(1)} onChange={(e) => setPriceInput(e.target.value)} style={field} />
      </div>
    </div>
  );
}
