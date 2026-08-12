import { JSDOM } from "jsdom";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { createRoot } from "react-dom/client";
import { useNavigate, MemoryRouter } from "react-router-dom";
import { jsx, jsxs, Fragment } from "react/jsx-runtime";
let API_BASE = typeof window !== "undefined" && window.location.hostname !== "localhost" ? "/api" : "http://localhost:3001/api";
async function request(endpoint, options = {}) {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    headers: { "Content-Type": "application/json", ...options.headers },
    ...options
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}
const api = {
  // Health
  health: () => request("/health"),
  // Markets
  getMarkets: () => request("/markets"),
  getMarket: (id) => request(`/markets/${id}`),
  getTrending: (limit = 10) => request(`/markets/trending?limit=${limit}`),
  getCurrentEvents: () => request("/markets/current-events"),
  getByCategory: (cat) => request(`/markets/category/${cat}`),
  createMarket: (data) => request("/markets", { method: "POST", body: JSON.stringify(data) }),
  resolveMarket: (id, winningOutcomeId) => request(`/markets/${id}/resolve`, { method: "POST", body: JSON.stringify({ winning_outcome_id: winningOutcomeId }) }),
  // Predictions
  getPendingResolution: (radarKey) => request("/resolve/pending", { headers: { "x-radar-key": radarKey } }),
  resolveMarket: (marketId, winningOutcomeIds, radarKey) => request(`/markets/${marketId}/resolve`, { method: "POST", body: JSON.stringify({ winning_outcome_ids: winningOutcomeIds }), headers: { "x-radar-key": radarKey } }),
  seedCuratedMarkets: (radarKey) => request("/seed/curated-batch", { method: "POST", headers: { "x-radar-key": radarKey } }),
  regenerateBadges: (radarKey) => request("/admin/regenerate-badges", { headers: { "x-radar-key": radarKey } }),
  joinWaitlist: (email) => request("/waitlist", { method: "POST", body: JSON.stringify({ email }) }),
  getMarketNews: (marketId) => request(`/markets/${marketId}/news`),
  adminWaitlist: (radarKey) => request("/admin/waitlist", { headers: { "x-radar-key": radarKey } }),
  adminDeleteWaitlistEntry: (id, radarKey) => request(`/admin/waitlist/${id}`, { method: "DELETE", headers: { "x-radar-key": radarKey } }),
  getWaitlistCount: () => request("/waitlist/count"),
  getPulse: () => request("/pulse"),
  getLatestActivity: () => request("/activity/latest"),
  getPulse: () => request("/pulse"),
  getLatestActivity: () => request("/activity/latest"),
  getSuggestions: (status = "pending", radarKey) => request(`/market-suggestions?status=${status}`, { headers: { "x-radar-key": radarKey } }),
  runMarketScout: (radarKey) => request("/cron/market-scout", { headers: { "x-radar-key": radarKey } }),
  setSuggestionStatus: (id, status, radarKey) => request(`/market-suggestions/${id}/status`, { method: "POST", body: JSON.stringify({ status }), headers: { "x-radar-key": radarKey } }),
  getComments: (marketId) => request(`/markets/${marketId}/comments`),
  postComment: (marketId, data) => request(`/markets/${marketId}/comments`, { method: "POST", body: JSON.stringify(data) }),
  getPredictions: (marketId = null) => request(`/predictions${marketId ? `?market_id=${marketId}` : ""}`),
  createPrediction: (data) => request("/predictions", { method: "POST", body: JSON.stringify(data) }),
  sellPosition: (data) => request("/positions/sell", { method: "POST", body: JSON.stringify(data) }),
  // Main Events & Leaderboards
  getEvents: () => request("/events"),
  getGlobalLeaderboard: (limit = 10) => request(`/leaderboard/global?limit=${limit}`),
  // Forecast Leagues
  getLeagues: (userId) => request(`/leagues${userId ? `?user_id=${userId}` : ""}`),
  getLeague: (id, userId) => request(`/leagues/${id}${userId ? `?user_id=${userId}` : ""}`),
  getLeagueLeaderboard: (id) => request(`/leagues/${id}/leaderboard`),
  createLeague: (data) => request("/leagues", { method: "POST", body: JSON.stringify(data) }),
  joinLeagueByCode: (data) => request("/leagues/join", { method: "POST", body: JSON.stringify(data) }),
  submitLeaguePrediction: (id, data) => request(`/leagues/${id}/predictions`, { method: "POST", body: JSON.stringify(data) }),
  exitLeaguePosition: (id, data) => request(`/leagues/${id}/positions/sell`, { method: "POST", body: JSON.stringify(data) }),
  resolveLeagueMarket: (id, data) => request(`/admin/events/${id}/markets/resolve`, { method: "POST", body: JSON.stringify(data) }),
  closeLeague: (id) => request(`/admin/events/${id}/close`, { method: "POST" }),
  // Admin Main Events
  adminGetEvents: (adminEmail) => request(`/admin/events?adminEmail=${encodeURIComponent(adminEmail)}`),
  adminCreateEvent: (data) => request("/admin/events", { method: "POST", body: JSON.stringify(data) }),
  adminUpdateEvent: (id, data) => request(`/admin/events/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  adminDeleteEvent: (id, adminEmail) => request(`/admin/events/${id}`, { method: "DELETE", body: JSON.stringify({ adminEmail }) }),
  adminAddEventMarket: (id, data) => request(`/admin/events/${id}/markets`, { method: "POST", body: JSON.stringify(data) }),
  adminRemoveEventMarket: (id, marketId, adminEmail) => request(`/admin/events/${id}/markets/${marketId}`, { method: "DELETE", body: JSON.stringify({ adminEmail }) }),
  adminCloseEvent: (id, adminEmail) => request(`/admin/events/${id}/close`, { method: "POST", body: JSON.stringify({ adminEmail }) }),
  // User Profile
  checkUsername: (username) => request(`/users/check-username?username=${encodeURIComponent(username)}`),
  setUsername: (id, data) => request(`/users/${id}/username`, { method: "PUT", body: JSON.stringify(data) }),
  // Wallet
  getBalance: (userId) => request(`/users/${userId}/balance`),
  deposit: (userId, amount, paymentMethod = "card") => request(`/users/${userId}/deposit`, { method: "POST", body: JSON.stringify({ amount, payment_method: paymentMethod }) }),
  withdraw: (userId, amount) => request(`/users/${userId}/withdraw`, { method: "POST", body: JSON.stringify({ amount }) }),
  resetDeposits: (userId) => request(`/users/${userId}/reset-deposits`, { method: "POST" }),
  getTransactions: (userId) => request(`/users/${userId}/transactions`),
  fixBalance: (userId) => request(`/users/${userId}/fix-balance`, { method: "POST" })
};
function useMarkets() {
  const [markets, setMarkets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  useEffect(() => {
    async function loadMarkets() {
      try {
        setLoading(true);
        const data = await api.getMarkets();
        setMarkets(Array.isArray(data) ? data : []);
        setError(null);
      } catch (err) {
        console.error("Error loading markets from API:", err);
        setError(err.message);
        setMarkets([]);
      } finally {
        setLoading(false);
      }
    }
    loadMarkets();
  }, []);
  return { markets, loading, error };
}
const SECTORS$1 = [
  {
    id: "music",
    label: "Music",
    re: /kendrick|drake|sza|beyonc|taylor swift|billboard|album|tour(?!nament)|stream(ing)?|spotify|chart|single|mixtape|rapper|grammy nom/i
  },
  {
    id: "movies",
    label: "Movies & TV",
    re: /movie|film|box office|netflix|hbo|disney|marvel|oscar|premiere|sequel|\bseries\b|renewal|episode|season \d|trailer|rotten tomatoes/i
  },
  {
    id: "celebrities",
    label: "Creators & Streamers",
    re: /mrbeast|kai cenat|ishowspeed|\bxqc\b|subscriber|subathon|youtuber|content creator/i
  },
  {
    id: "festivals",
    label: "Festivals",
    re: /coachella|festival|tour dates|stadium|concert|headlin|glastonbury|lollapalooza|rolling loud|bonnaroo/i
  },
  {
    id: "gaming",
    label: "Gaming",
    re: /\bgame\b|\bgta\b|esports|twitch|streamer|valorant|fortnite|minecraft|playstation|xbox|nintendo|steam|worlds \d|league of legends|call of duty|overwatch/i
  },
  {
    id: "streaming",
    label: "Streaming",
    re: /netflix|hulu|hbo max|disney\+|paramount\+|peacock|apple tv|prime video|renewal|viewership|weekly views/i
  },
  {
    id: "trends",
    label: "Internet Trends",
    re: /tiktok|viral|meme|trending on|twitter|\bx\.com\b|instagram|influencer|challenge/i
  },
  {
    id: "tech",
    label: "Tech Startups & AI",
    re: /\bai\b|\bgpt\b|\bllm\b|openai|anthropic|\bclaude\b|startup|venture capital|\bvc\b|\bipo\b|spacex|nvidia|silicon valley|y combinator|artificial intelligence/i
  }
];
function classifySector(title) {
  for (const s of SECTORS$1) if (s.re.test(title || "")) return s.id;
  return null;
}
const MEDIA_CATEGORIES = /* @__PURE__ */ new Set([
  "entertainment",
  "movies",
  "movies & tv",
  "tv",
  "streaming",
  "awards",
  "media",
  "celebrity",
  "culture",
  "gaming"
]);
function categoryBucket(category) {
  const c = (category || "").toLowerCase().trim();
  if (c === "music") return "music";
  if (MEDIA_CATEGORIES.has(c)) return "media";
  return "trending";
}
const BUCKET_LABELS = {
  trending: "Trending",
  music: "Music",
  media: "Media"
};
function bucketLabel(category) {
  return BUCKET_LABELS[categoryBucket(category)];
}
const LINE_COLORS = ["#4AE176", "#5CC8FF", "#C792EA"];
function isBinary(outcomes) {
  if (outcomes.length !== 2) return false;
  const t = outcomes.map((o) => (o.title || "").toLowerCase());
  return t.some((x) => x.startsWith("yes")) && t.some((x) => x.startsWith("no"));
}
function topOutcomes(market) {
  const sorted = [...market.outcomes || []].sort((a, b) => (b.probability || 0) - (a.probability || 0));
  if (isBinary(sorted)) {
    const yes = sorted.find((o) => (o.title || "").toLowerCase().startsWith("yes")) || sorted[0];
    return { rows: [yes], hidden: 0, binary: true };
  }
  return { rows: sorted.slice(0, 3), hidden: Math.max(0, sorted.length - 3), binary: false };
}
function historyFor(market, outcome) {
  const h = market.price_history || [];
  if (h.length >= 2) {
    const data = h.map((snap) => {
      var _a;
      return ((_a = snap.prices) == null ? void 0 : _a[outcome.id]) ?? outcome.probability ?? 50;
    });
    data.push(outcome.probability ?? 50);
    return data;
  }
  const p = outcome.probability ?? 50;
  return [p, p];
}
function MiniChart({ market, outcomes }) {
  var _a;
  const W = 420;
  const H = 210;
  const PAD = 8;
  const AXIS = 40;
  const series = outcomes.map((o, i) => ({
    id: o.id,
    color: LINE_COLORS[i % LINE_COLORS.length],
    data: historyFor(market, o)
  }));
  const plotW = W - PAD * 2 - AXIS;
  const path = (data) => {
    const n = data.length;
    return data.map((v, i) => {
      const x = PAD + i / (n - 1) * plotW;
      const y = PAD + (1 - v / 100) * (H - PAD * 2);
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(" ");
  };
  const hist = market.price_history || [];
  const firstDate = ((_a = hist[0]) == null ? void 0 : _a.timestamp) ? new Date(hist[0].timestamp) : null;
  const fmt = (d) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return /* @__PURE__ */ jsxs("div", { children: [
    /* @__PURE__ */ jsxs("svg", { viewBox: `0 0 ${W} ${H}`, className: "w-full", preserveAspectRatio: "xMidYMid meet", style: { maxHeight: 230 }, children: [
      /* @__PURE__ */ jsx(
        "text",
        {
          x: W - AXIS - 10,
          y: 26,
          textAnchor: "end",
          fontSize: "15",
          fontWeight: "700",
          fill: "#DCE1FF",
          opacity: "0.10",
          fontFamily: "Hanken Grotesk, sans-serif",
          children: "Dobium"
        }
      ),
      [0, 0.25, 0.5, 0.75, 1].map((r) => /* @__PURE__ */ jsxs("g", { children: [
        /* @__PURE__ */ jsx(
          "line",
          {
            x1: PAD,
            x2: PAD + plotW,
            y1: PAD + r * (H - PAD * 2),
            y2: PAD + r * (H - PAD * 2),
            stroke: "#12294A",
            strokeWidth: "0.6",
            strokeDasharray: "3,4",
            opacity: "0.45"
          }
        ),
        /* @__PURE__ */ jsxs(
          "text",
          {
            x: PAD + plotW + 8,
            y: PAD + r * (H - PAD * 2),
            dominantBaseline: "middle",
            fontSize: "9.5",
            fill: "#8E94AF",
            fontFamily: "JetBrains Mono, monospace",
            children: [
              Math.round((1 - r) * 100),
              "%"
            ]
          }
        )
      ] }, r)),
      series.map((sr) => {
        const n = sr.data.length;
        const lastX = PAD + plotW;
        const lastY = PAD + (1 - sr.data[n - 1] / 100) * (H - PAD * 2);
        return /* @__PURE__ */ jsxs("g", { children: [
          /* @__PURE__ */ jsx("path", { d: path(sr.data), fill: "none", stroke: sr.color, strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" }),
          /* @__PURE__ */ jsx("circle", { cx: lastX, cy: lastY, r: "3.2", fill: sr.color })
        ] }, sr.id);
      })
    ] }),
    /* @__PURE__ */ jsxs("div", { style: { display: "flex", justifyContent: "space-between", fontFamily: "var(--mono)", fontSize: 9.5, color: "#8E94AF", padding: "2px 4px 0" }, children: [
      /* @__PURE__ */ jsx("span", { children: firstDate ? fmt(firstDate) : "" }),
      /* @__PURE__ */ jsx("span", { children: fmt(/* @__PURE__ */ new Date()) })
    ] })
  ] });
}
function FeaturedCarousel({ markets }) {
  const navigate = useNavigate();
  const [idx, setIdx] = useState(0);
  const [newsByMarket, setNewsByMarket] = useState({});
  const timer = useRef(null);
  const featured = [...markets].filter((m) => m.status === "active" && (m.outcomes || []).length > 0).sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)).slice(0, 7);
  const count = featured.length;
  useEffect(() => {
    if (count < 2) return void 0;
    timer.current = setInterval(() => setIdx((i) => (i + 1) % count), 1e4);
    return () => clearInterval(timer.current);
  }, [count]);
  if (count === 0) return null;
  const market = featured[Math.min(idx, count - 1)];
  const { rows, hidden, binary } = topOutcomes(market);
  const chartOutcomes = rows.slice(0, 2);
  const go = (dir) => {
    setIdx((i) => (i + dir + count) % count);
    if (timer.current) {
      clearInterval(timer.current);
      timer.current = setInterval(() => setIdx((i2) => (i2 + 1) % count), 1e4);
    }
  };
  useEffect(() => {
    if (!(market == null ? void 0 : market.id) || newsByMarket[market.id] !== void 0) return;
    let alive = true;
    api.getMarketNews(market.id).then((r) => {
      if (alive) setNewsByMarket((prev) => ({ ...prev, [market.id]: ((r == null ? void 0 : r.items) || [])[0] || null }));
    }).catch(() => {
      if (alive) setNewsByMarket((prev) => ({ ...prev, [market.id]: null }));
    });
    return () => {
      alive = false;
    };
  }, [market == null ? void 0 : market.id]);
  const headline = newsByMarket[market.id];
  const blurb = headline ? `${headline.title} — ${headline.source}` : (market.description || "").replace(/\s+/g, " ").trim();
  const blurbLabel = headline ? "NEWS" : "ABOUT";
  return /* @__PURE__ */ jsx(
    "div",
    {
      onClick: () => navigate(`/markets/${market.id}`),
      style: {
        margin: "0 auto",
        textAlign: "left",
        cursor: "pointer",
        background: "#001F43",
        border: "1px solid #1C304F",
        borderRadius: 8,
        padding: "26px 30px 24px",
        minHeight: 330
      },
      children: /* @__PURE__ */ jsxs("div", { style: { display: "flex", flexWrap: "wrap", gap: 34 }, children: [
        /* @__PURE__ */ jsxs("div", { style: { flex: "1.05 1 340px", minWidth: 300, display: "flex", flexDirection: "column" }, children: [
          /* @__PURE__ */ jsx("span", { style: { fontFamily: "var(--mono)", fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.06em", color: "#D2C5AF", background: "#12294A", borderRadius: 3, padding: "4px 9px" }, children: bucketLabel(market.category) }),
          /* @__PURE__ */ jsx("h3", { style: { color: "#DCE1FF", fontSize: 19, fontWeight: 600, margin: "14px 0 18px", lineHeight: 1.4 }, children: market.title }),
          /* @__PURE__ */ jsxs("div", { style: { fontFamily: "var(--mono)", fontSize: 12.5 }, children: [
            /* @__PURE__ */ jsxs("div", { style: { display: "flex", color: "#948D87", fontSize: 10, paddingBottom: 7, borderBottom: "1px solid rgba(45,52,76,.7)" }, children: [
              /* @__PURE__ */ jsx("span", { style: { flex: 2.1 }, children: binary ? "Outcome" : "Market" }),
              /* @__PURE__ */ jsx("span", { style: { flex: 0.8, textAlign: "center" }, children: "Yes" }),
              /* @__PURE__ */ jsx("span", { style: { flex: 0.8, textAlign: "center" }, children: "No" }),
              /* @__PURE__ */ jsx("span", { style: { flex: 1.1, textAlign: "right" } })
            ] }),
            rows.map((o) => {
              const p = Math.round(o.probability || 0);
              return /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", padding: "12px 0", borderBottom: "1px solid rgba(45,52,76,.35)" }, children: [
                /* @__PURE__ */ jsx("span", { style: { flex: 2.1, color: "#DCE1FF", fontFamily: "var(--wordmark)", fontSize: 13.5, paddingRight: 8, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }, children: o.title }),
                /* @__PURE__ */ jsx("span", { style: { flex: 0.8, textAlign: "center" }, children: /* @__PURE__ */ jsxs("span", { style: { background: "#1D323D", color: "#48D773", borderRadius: 3, padding: "3px 8px" }, children: [
                  p,
                  "¢"
                ] }) }),
                /* @__PURE__ */ jsx("span", { style: { flex: 0.8, textAlign: "center" }, children: /* @__PURE__ */ jsxs("span", { style: { background: "#2A1620", color: "#CF9290", borderRadius: 3, padding: "3px 8px" }, children: [
                  100 - p,
                  "¢"
                ] }) }),
                /* @__PURE__ */ jsxs("span", { style: { flex: 1.1, textAlign: "right", color: "#948D87", fontSize: 10.5 }, children: [
                  (o.probability || 0).toFixed(1),
                  "% prob"
                ] })
              ] }, o.id);
            })
          ] }),
          /* @__PURE__ */ jsxs("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "auto", paddingTop: 16 }, children: [
            /* @__PURE__ */ jsxs("span", { style: { fontFamily: "var(--mono)", fontSize: 11.5, color: "#9D968D" }, children: [
              "$",
              (market.total_volume || 0).toLocaleString("en-US", { maximumFractionDigits: 0 }),
              " vol"
            ] }),
            hidden > 0 && /* @__PURE__ */ jsxs("span", { style: { fontFamily: "var(--mono)", fontSize: 11, color: "#B7A77E" }, children: [
              "+",
              hidden,
              " more →"
            ] })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { style: { flex: "1 1 340px", minWidth: 300 }, children: [
          /* @__PURE__ */ jsxs("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 8 }, children: [
            /* @__PURE__ */ jsx("div", { style: { display: "flex", flexDirection: "column", gap: 5 }, children: chartOutcomes.map((o, i) => /* @__PURE__ */ jsxs("span", { style: { display: "inline-flex", alignItems: "center", gap: 7, fontFamily: "var(--mono)", fontSize: 10.5, color: "#D2C5AF" }, children: [
              /* @__PURE__ */ jsx("span", { style: { width: 7, height: 7, borderRadius: 2, background: LINE_COLORS[i % LINE_COLORS.length], display: "inline-block" } }),
              /* @__PURE__ */ jsx("span", { style: { maxWidth: 170, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }, children: o.title }),
              /* @__PURE__ */ jsxs("span", { style: { color: LINE_COLORS[i % LINE_COLORS.length], fontWeight: 700 }, children: [
                (o.probability || 0).toFixed(1),
                "%"
              ] })
            ] }, o.id)) }),
            count > 1 && /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", gap: 7, flexShrink: 0 }, onClick: (e) => e.stopPropagation(), children: [
              /* @__PURE__ */ jsx(
                "button",
                {
                  onClick: () => go(-1),
                  "aria-label": "Previous market",
                  style: { width: 24, height: 24, borderRadius: 4, background: "#00132D", border: "1px solid #1C304F", color: "#D2C5AF", cursor: "pointer", fontSize: 11, lineHeight: 1 },
                  children: "◀"
                }
              ),
              /* @__PURE__ */ jsx(
                "button",
                {
                  onClick: () => go(1),
                  "aria-label": "Next market",
                  style: { width: 24, height: 24, borderRadius: 4, background: "#00132D", border: "1px solid #1C304F", color: "#D2C5AF", cursor: "pointer", fontSize: 11, lineHeight: 1 },
                  children: "▶"
                }
              ),
              /* @__PURE__ */ jsxs("span", { style: { fontFamily: "var(--mono)", fontSize: 10, color: "#8E94AF" }, children: [
                Math.min(idx, count - 1) + 1,
                " of ",
                count
              ] })
            ] })
          ] }),
          /* @__PURE__ */ jsx(MiniChart, { market, outcomes: chartOutcomes }),
          blurb && /* @__PURE__ */ jsxs("p", { style: { margin: "14px 0 0", paddingTop: 13, borderTop: "1px solid rgba(45,52,76,.6)", fontSize: 12, lineHeight: 1.65, color: "#B7A77E" }, children: [
            /* @__PURE__ */ jsx("span", { style: { fontFamily: "var(--mono)", fontWeight: 700, fontSize: 10.5, letterSpacing: "0.06em", marginRight: 8, color: "#FFDF9B" }, children: blurbLabel }),
            blurb.length > 170 ? `${blurb.slice(0, 170)}…` : blurb
          ] })
        ] })
      ] })
    }
  );
}
const PAGE_BG = "#00132D";
const SIDEBAR_BG = "#081C36";
const CARD_BG = "#001F43";
const CARD_LINE = "#22314A";
const WARM = "#CFC5B5";
const GREEN = "#4BE176";
const SALMON = "#FFB4AB";
const GOLD = "#FFDF9B";
const GOLD_DIM = "#E1C382";
const mono = (extra = {}) => ({ fontFamily: "var(--mono)", fontWeight: 700, letterSpacing: "0.1em", ...extra });
function leaderOf(m) {
  return [...m.outcomes || []].sort((a, b) => (b.probability || 0) - (a.probability || 0))[0];
}
function yesOf(m) {
  return (m.outcomes || []).find((o) => (o.title || "").toLowerCase().startsWith("yes"));
}
function deltaFor(m, outcome) {
  var _a, _b, _c, _d;
  const h = (m == null ? void 0 : m.price_history) || [];
  if (h.length >= 2 && outcome) {
    const last = (_b = (_a = h[h.length - 1]) == null ? void 0 : _a.prices) == null ? void 0 : _b[outcome.id];
    const prev = (_d = (_c = h[h.length - 2]) == null ? void 0 : _c.prices) == null ? void 0 : _d[outcome.id];
    if (typeof last === "number" && typeof prev === "number") return Math.round(last - prev);
  }
  return 0;
}
function shortTitle(t) {
  return (t || "").replace(/^will\s+/i, "").replace(/\?+\s*$/, "");
}
function compactVol(v) {
  if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `$${(v / 1e3).toFixed(1).replace(/\.0$/, "")}K`;
  return `$${Math.round(v || 0)}`;
}
const SECTOR_ICONS = { music: "note", movies: "film", celebrities: "people", festivals: "stage", gaming: "gamepad", streaming: "play", trends: "trend", tech: "grid" };
const SECTORS = SECTORS$1.map((s) => ({ ...s, icon: SECTOR_ICONS[s.id] }));
function classify(title) {
  return classifySector(title);
}
function sectorMarkets(markets, id) {
  return [...markets || []].filter((m) => m.status === "active" && classify(m.title) === id).sort((a, b) => (b.total_volume || 0) - (a.total_volume || 0));
}
const MUSIC_DEMO = [
  { title: 'Kendrick Lamar to drop "Surprise Project" before Dec 31?', vol: "$4.2M", yes: 88, no: 12, tag: "SPOTIFY 50" },
  { title: 'Taylor Swift "The Tortured Poets" returns to #1 this week?', vol: "$1.8M", yes: 31, no: 69, tag: "BILLBOARD" },
  { title: 'SZA "SOS" to win Album of the Year (AOTY)?', vol: "$920K", yes: 45, no: 55, tag: "GRAMMYS" },
  { title: `Drake "It's All A Blur" to gross over $300M total?`, vol: "$2.4M", yes: 91, no: 9, tag: "TOUR DATA" }
];
const MOVIES_DEMO_FEATURED = {
  title: "Dune: Part 3 to officially greenlit by WB before March 2025?",
  desc: "Recent box office projections for Part 2 exceeding $700M globally has triggered massive volume on a Part 3 confirmation.",
  yes: 82,
  no: 18,
  image: null
};
const MOVIES_DEMO_SIDE = [
  { title: '"Gladiator II" Critics Score above 85%?', vol: "$412K", yes: 64, no: 36, tag: "ROTTEN TOMATOES" },
  { title: '"The Bear" Season 4 release date set for 2024?', vol: "$288K", yes: 12, no: 88, tag: "STREAMING WARS" }
];
const MOVIES_PLATFORMS = ["All Movies & TV", "Box Office Hits", "New Releases", "Franchises", "Awards", "TV Shows", "Industry Deals"];
const PLATFORM_RE = {
  "Box Office Hits": /box office/i,
  "New Releases": /premiere|release date|debut|drops? (this|next)|opens? in theaters|streaming (debut|premiere)/i,
  "Franchises": /marvel|\bmcu\b|star wars|\bdc\b|sequel|part \d|chapter \d|franchise/i,
  "Awards": /oscar|academy award|golden globe|\bemmy\b|\baward\b/i,
  "TV Shows": /\bseries\b|season \d|renewal|episode|finale|\bshow\b/i,
  "Industry Deals": /acquir|merger|acquisition|buyout|stake in|studio deal|deal with/i
};
const PLATFORM_DEMO = {
  "Box Office Hits": {
    featured: MOVIES_DEMO_FEATURED,
    side: [
      { title: '"Gladiator II" to cross $500M worldwide?', vol: "$412K", yes: 64, no: 36, tag: "ROTTEN TOMATOES" },
      { title: "Will a 2025 release cross $1B worldwide?", vol: "$680K", yes: 37, no: 63, tag: "BOX OFFICE" }
    ]
  },
  "New Releases": {
    featured: { title: "Wicked: Part Two to open above $150M opening weekend?", desc: "Pre-release tracking has surged sharply following the latest trailer drop.", yes: 58, no: 42 },
    side: [
      { title: `A24's "Death of a Unicorn" wide release confirmed for 2025?`, vol: "$210K", yes: 71, no: 29, tag: "NEW RELEASES" },
      { title: "Mission: Impossible 8 to open before July 4th weekend?", vol: "$480K", yes: 83, no: 17, tag: "NEW RELEASES" }
    ]
  },
  "Franchises": {
    featured: { title: "Will Marvel announce Avengers: Secret Wars casting before 2026?", desc: "Studio insiders suggest a major casting reveal is being planned for a fan event.", yes: 59, no: 41 },
    side: [
      { title: 'A new "Star Wars" trilogy greenlit before 2026?', vol: "$310K", yes: 33, no: 67, tag: "FRANCHISES" },
      { title: "DC to reboot Batman again before 2027?", vol: "$260K", yes: 28, no: 72, tag: "FRANCHISES" }
    ]
  },
  "Awards": {
    featured: { title: 'Will "Oppenheimer" sweep Best Picture at the 2025 Oscars?', desc: "Awards-season momentum has made it the frontrunner across major guild ceremonies.", yes: 69, no: 31 },
    side: [
      { title: 'Will "Stranger Things" win Outstanding Drama Series at the 2026 Emmys?', vol: "$0", yes: 50, no: 50, tag: "ROTTEN TOMATOES" },
      { title: "A streaming-only film wins Best Picture before 2027?", vol: "$220K", yes: 44, no: 56, tag: "AWARDS" }
    ]
  },
  "TV Shows": {
    featured: { title: 'Will "Severance" Season 3 premiere before the end of 2025?', desc: "Production wrapped ahead of schedule, fueling speculation about an early release.", yes: 66, no: 34 },
    side: [
      { title: '"The Last of Us" Season 3 renewal confirmed?', vol: "$260K", yes: 81, no: 19, tag: "TV SHOWS" },
      { title: '"Stranger Things" final season to premiere before Q4 2025?', vol: "$620K", yes: 47, no: 53, tag: "TV SHOWS" }
    ]
  },
  "Industry Deals": {
    featured: { title: "Will Netflix acquire A24 before end of year?", desc: "Deal talk has intensified after A24's recent string of box office hits.", yes: 38, no: 62 },
    side: [
      { title: "Warner Bros. Discovery to spin off its streaming division in 2025?", vol: "$390K", yes: 29, no: 71, tag: "INDUSTRY DEALS" },
      { title: "A major studio merger announced before Q4 2025?", vol: "$310K", yes: 22, no: 78, tag: "INDUSTRY DEALS" }
    ]
  }
};
function platformMarkets(markets, platform) {
  const re = PLATFORM_RE[platform];
  if (!re) return [];
  return [...markets || []].filter((m) => m.status === "active" && re.test(m.title || "")).sort((a, b) => (b.total_volume || 0) - (a.total_volume || 0));
}
const CREATORS_DEMO = [
  { title: "MrBeast to reach 400M subscribers by end of 2024?", vol: "$8.4M", yes: 72, no: 28, tag: "YOUTUBE" },
  { title: "Kai Cenat to break the all-time sub record in next subathon?", vol: "$5.1M", yes: 55, no: 45, tag: "TWITCH / KICK" },
  { title: "IShowSpeed to sign exclusive deal with Kick by Q3?", vol: "$3.9M", yes: 38, no: 62, tag: "STREAMING WARS" },
  { title: "xQc to return to full-time variety gaming on Twitch?", vol: "$2.2M", yes: 12, no: 88, tag: "CONTENT TRENDS" }
];
const CREATOR_SUB_DEMO = {
  "YouTube Milestones": [
    { title: "MrBeast to reach 400M subscribers by end of 2024?", vol: "$8.4M", yes: 72, no: 28, tag: "YOUTUBE" },
    { title: "A YouTuber to surpass 300M subscribers in 2025?", vol: "$1.8M", yes: 41, no: 59, tag: "YOUTUBE" }
  ],
  "Twitch Live Streaming": [
    { title: "Kai Cenat to break the all-time sub record in next subathon?", vol: "$5.1M", yes: 55, no: 45, tag: "TWITCH" },
    { title: "xQc to return to full-time variety gaming on Twitch?", vol: "$2.2M", yes: 12, no: 88, tag: "TWITCH" }
  ],
  "Kick Live Streaming": [
    { title: "IShowSpeed to sign exclusive deal with Kick by Q3?", vol: "$3.9M", yes: 38, no: 62, tag: "KICK" },
    { title: "Kick to surpass Twitch in peak concurrent viewers this year?", vol: "$390K", yes: 19, no: 81, tag: "KICK" }
  ],
  "Viral Streamers and Events": [
    { title: "A creator collab event goes viral before Q4?", vol: "$610K", yes: 47, no: 53, tag: "VIRAL EVENTS" },
    { title: "A streamer-hosted IRL event breaks attendance records in 2025?", vol: "$340K", yes: 33, no: 67, tag: "VIRAL EVENTS" }
  ]
};
const CREATOR_SUB_RE = {
  "YouTube Milestones": /youtube|mrbeast|subscriber/i,
  "Twitch Live Streaming": /twitch|kai cenat|subathon|\bxqc\b/i,
  "Kick Live Streaming": /\bkick\b/i,
  "Viral Streamers and Events": /viral|challenge|\bevent\b|\birl\b|meetup|collab/i
};
function creatorSubMarkets(markets, sub) {
  const re = CREATOR_SUB_RE[sub];
  if (!re) return [];
  return [...markets || []].filter((m) => m.status === "active" && re.test(m.title || "")).sort((a, b) => (b.total_volume || 0) - (a.total_volume || 0));
}
const GAMING_SUBS = ["All Gaming", "Console", "Esports Odds", "Studio Deals", "Gaming Hardware"];
const GAMING_SUB_ICONS = {
  "All Gaming": "gamepad",
  "Console": "console",
  "Esports Odds": "trophy",
  "Studio Deals": "briefcase",
  "Gaming Hardware": "hardware"
};
const GAMING_MARKETS_DEMO = [
  { title: "GTA VI to be delayed to 2026?", vol: "$2.1M", yes: 24, no: 76, tag: "ROCKSTAR GAMES" },
  { title: "Nintendo Switch 2 Official Announcement before March 2025?", vol: "$1.5M", yes: 88, no: 12, tag: "NINTENDO" },
  { title: "T1 to win League of Legends Worlds 2024?", vol: "$940K", yes: 65, no: 35, tag: "ESPORTS" },
  { title: "Sony to announce acquisition of FromSoftware by EOY?", vol: "$3.2M", yes: 15, no: 85, tag: "M&A RUMORS" }
];
const GAMING_SUB_DEMO = {
  "Console": [
    { title: "PlayStation 6 to be announced before 2026?", vol: "$1.1M", yes: 38, no: 62, tag: "PLAYSTATION" },
    { title: "Xbox to discontinue console hardware by 2027?", vol: "$620K", yes: 22, no: 78, tag: "XBOX" }
  ],
  "Esports Odds": [
    { title: "T1 to win League of Legends Worlds 2024?", vol: "$940K", yes: 65, no: 35, tag: "ESPORTS" },
    { title: "FaZe Clan to make Valorant Champions playoffs in 2025?", vol: "$410K", yes: 44, no: 56, tag: "ESPORTS" }
  ],
  "Studio Deals": [
    { title: "Sony to announce acquisition of FromSoftware by EOY?", vol: "$3.2M", yes: 15, no: 85, tag: "M&A RUMORS" },
    { title: "Microsoft to acquire another major studio in 2025?", vol: "$780K", yes: 33, no: 67, tag: "M&A RUMORS" }
  ],
  "Gaming Hardware": [
    { title: "Nvidia to release a new GPU generation before Q4?", vol: "$560K", yes: 71, no: 29, tag: "HARDWARE" },
    { title: "Valve to release a new Steam Deck model in 2025?", vol: "$340K", yes: 52, no: 48, tag: "HARDWARE" }
  ]
};
const GAMING_SUB_RE = {
  "Console": /playstation|\bps5\b|\bxbox\b|nintendo switch|\bconsole\b/i,
  "Esports Odds": /esports|e-sports|worlds \d|league of legends|valorant|call of duty league|overwatch league|\bfaze\b|cloud9|\bt1\b/i,
  "Studio Deals": /acquir|merger|acquisition|buyout|stake in|studio deal/i,
  "Gaming Hardware": /\bgpu\b|nvidia|graphics card|steam deck|hardware|processor/i
};
function gamingSubMarkets(markets, sub) {
  const re = GAMING_SUB_RE[sub];
  if (!re) return [];
  return [...markets || []].filter((m) => m.status === "active" && re.test(m.title || "")).sort((a, b) => (b.total_volume || 0) - (a.total_volume || 0));
}
const STREAMING_SUBS = ["All Streaming", "Netflix", "Disney+", "HBO/Max Releases", "Prime Video", "Apple TV", "Hulu", "Streaming Charts"];
const STREAMING_SUB_ICONS = {
  "All Streaming": "film",
  "Netflix": "playcircle",
  "Disney+": "castle",
  "HBO/Max Releases": "console",
  "Prime Video": "play",
  "Apple TV": "console",
  "Hulu": "playcircle",
  "Streaming Charts": "bars"
};
const STREAMING_DEMO = [
  { title: "Stranger Things Season 5 to drop before Q3 2025?", vol: "$8.4M", yes: 42, no: 58, tag: "NETFLIX" },
  { title: "Netflix to acquire A24 by end of year?", vol: "$12.1M", yes: 12, no: 88, tag: "M&A RUMORS" },
  { title: "White Lotus S3 viewership to exceed 20M in first 48 hours?", vol: "$4.2M", yes: 65, no: 35, tag: "HBO / MAX" },
  { title: "MrBeast to hit 500M subscribers before 2026?", vol: "$15.7M", yes: 78, no: 22, tag: "YOUTUBE" }
];
const STREAMING_SUB_DEMO = {
  "Netflix": [
    { title: "Stranger Things Season 5 to drop before Q3 2025?", vol: "$8.4M", yes: 42, no: 58, tag: "NETFLIX" },
    { title: "Netflix to raise subscription prices again in 2025?", vol: "$2.9M", yes: 61, no: 39, tag: "NETFLIX" }
  ],
  "Disney+": [
    { title: "Disney+ to merge fully with the Hulu app in 2025?", vol: "$1.6M", yes: 57, no: 43, tag: "DISNEY+" },
    { title: "A new Marvel series premieres on Disney+ before Q4?", vol: "$980K", yes: 69, no: 31, tag: "DISNEY+" }
  ],
  "HBO/Max Releases": [
    { title: "White Lotus S3 viewership to exceed 20M in first 48 hours?", vol: "$4.2M", yes: 65, no: 35, tag: "HBO / MAX" },
    { title: "House of the Dragon Season 3 premieres before 2026?", vol: "$1.3M", yes: 58, no: 42, tag: "HBO / MAX" }
  ],
  "Prime Video": [
    { title: "Fallout Season 2 to premiere before Q3 2025?", vol: "$1.1M", yes: 71, no: 29, tag: "PRIME VIDEO" },
    { title: "Amazon to greenlight a new Jack Ryan season in 2025?", vol: "$620K", yes: 48, no: 52, tag: "PRIME VIDEO" }
  ],
  "Apple TV": [
    { title: "Severance Season 3 renewal confirmed before the finale?", vol: "$890K", yes: 77, no: 23, tag: "APPLE TV" },
    { title: "Apple TV+ to raise subscription prices in 2025?", vol: "$340K", yes: 44, no: 56, tag: "APPLE TV" }
  ],
  "Hulu": [
    { title: "Hulu to fully merge into the Disney+ app in 2025?", vol: "$710K", yes: 53, no: 47, tag: "HULU" },
    { title: '"Only Murders in the Building" Season 5 renewal confirmed?', vol: "$260K", yes: 82, no: 18, tag: "HULU" }
  ],
  "Streaming Charts": [
    { title: "A Netflix original tops the global Top 10 for 3+ weeks?", vol: "$540K", yes: 66, no: 34, tag: "STREAMING CHARTS" },
    { title: "A non-English series breaks into the weekly global Top 5?", vol: "$310K", yes: 39, no: 61, tag: "STREAMING CHARTS" }
  ]
};
const STREAMING_SUB_RE = {
  "Netflix": /netflix/i,
  "Disney+": /disney\+|disney plus/i,
  "HBO/Max Releases": /\bhbo\b|hbo max/i,
  "Prime Video": /prime video|amazon prime/i,
  "Apple TV": /apple tv/i,
  "Hulu": /\bhulu\b/i,
  "Streaming Charts": /top 10|top ten|\bchart(s)?\b|weekly views|viewership/i
};
function streamingSubMarkets(markets, sub) {
  const re = STREAMING_SUB_RE[sub];
  if (!re) return [];
  return [...markets || []].filter((m) => m.status === "active" && re.test(m.title || "")).sort((a, b) => (b.total_volume || 0) - (a.total_volume || 0));
}
const INTERNET_TRENDS_SUBS = ["Google Trends", "Reddit", "X/Twitter", "Tiktok", "YouTube"];
const TRENDS_SUB_ICONS = {
  "Google Trends": "trend",
  "Reddit": "bars",
  "X/Twitter": "pin",
  "Tiktok": "tiktok",
  "YouTube": "play"
};
const VIRAL_CHALLENGES_DEMO = [
  { title: "Next 'Dance Challenge' to reach 1B views by June?", vol: "$4.2M", yes: 42, no: 58, tag: "TIKTOK" },
  { title: "MrBeast to surpass 400M subscribers in 2024?", vol: "$8.1M", yes: 72, no: 28, tag: "YOUTUBE" }
];
const CREATOR_MILESTONES_DEMO = [
  { title: "Kai Cenat to break concurrent viewership record this month?", vol: "$2.5M", yes: 35, no: 65, tag: "TWITCH" },
  { title: "Elon Musk to step down as CEO of X by Q4?", vol: "$12.4M", yes: 18, no: 82, tag: "X / TWITTER" }
];
const VIRAL_RE = /challenge|viral|trend(ing)?|\bmeme\b/i;
const MILESTONE_RE = /subscriber|concurrent viewership|record|milestone|follower/i;
function viralChallengeMarkets(markets) {
  return [...markets || []].filter((m) => m.status === "active" && classifySector(m.title) === "trends" && VIRAL_RE.test(m.title || "")).sort((a, b) => (b.total_volume || 0) - (a.total_volume || 0));
}
function creatorMilestoneMarkets(markets) {
  return [...markets || []].filter((m) => m.status === "active" && classifySector(m.title) === "trends" && MILESTONE_RE.test(m.title || "")).sort((a, b) => (b.total_volume || 0) - (a.total_volume || 0));
}
const TRENDS_PLATFORM_DEMO = {
  "Reddit": [
    { title: "A subreddit hits 50M members before 2026?", vol: "$180K", yes: 44, no: 56, tag: "REDDIT" },
    { title: "r/wallstreetbets sparks another meme-stock rally in 2025?", vol: "$620K", yes: 29, no: 71, tag: "REDDIT" }
  ],
  "X/Twitter": [
    { title: "Elon Musk to step down as CEO of X by Q4?", vol: "$12.4M", yes: 18, no: 82, tag: "X / TWITTER" },
    { title: "X to relaunch a Vine-style short video feature before 2026?", vol: "$410K", yes: 33, no: 67, tag: "X / TWITTER" }
  ],
  "Tiktok": [
    { title: "Next 'Dance Challenge' to reach 1B views by June?", vol: "$4.2M", yes: 42, no: 58, tag: "TIKTOK" },
    { title: "TikTok to be banned in the US before 2026?", vol: "$3.8M", yes: 24, no: 76, tag: "TIKTOK" }
  ],
  "YouTube": [
    { title: "MrBeast to surpass 400M subscribers in 2024?", vol: "$8.1M", yes: 72, no: 28, tag: "YOUTUBE" },
    { title: "YouTube to launch a dedicated Shorts monetization tier in 2025?", vol: "$290K", yes: 61, no: 39, tag: "YOUTUBE" }
  ]
};
const TRENDS_PLATFORM_RE = {
  "Reddit": /reddit/i,
  "X/Twitter": /twitter|\bx\/twitter\b|elon musk/i,
  "Tiktok": /tiktok/i,
  "YouTube": /youtube|mrbeast/i
};
function trendsPlatformMarkets(markets, sub) {
  const re = TRENDS_PLATFORM_RE[sub];
  if (!re) return [];
  return [...markets || []].filter((m) => m.status === "active" && re.test(m.title || "")).sort((a, b) => (b.total_volume || 0) - (a.total_volume || 0));
}
const TECH_SUBS = ["All Tech", "Trending AI Companies", "AI Models", "Big Tech", "Startup Raises and Funding", "Open Source AI & Github Repos", "Startup Acquisitions", "Space Tech"];
const TECH_SUB_ICONS = {
  "All Tech": "grid",
  "Trending AI Companies": "hardware",
  "AI Models": "robot",
  "Big Tech": "building",
  "Startup Raises and Funding": "briefcase",
  "Open Source AI & Github Repos": "terminal",
  "Startup Acquisitions": "layers",
  "Space Tech": "rocket"
};
const AI_BENCHMARKS_DEMO = [
  { title: "GPT-5 official release before Q4?", vol: "$42.2M", yes: 68, no: 32, tag: "OPENAI" },
  { title: "Claude 3.5 Opus to top LMSYS leaderboard?", vol: "$18.5M", yes: 54, no: 46, tag: "ANTHROPIC" }
];
const STARTUP_FUNDING_DEMO = [
  { title: "SpaceX valuation to hit $250B by year-end?", vol: "$125.4M", yes: 82, no: 18, tag: "SPACEX" },
  { title: "OpenAI to announce IPO date in 2025?", vol: "$310.1M", yes: 15, no: 85, tag: "OPENAI / IPO" }
];
const AI_BENCHMARK_RE = /\bgpt\b|\bllm\b|leaderboard|benchmark|model release|lmsys|\bclaude\b|openai|anthropic/i;
const FUNDING_MA_RE = /valuation|\bipo\b|funding|\braise\b|series [a-e]\b|acquisition|acquire|venture capital/i;
function aiBenchmarkMarkets(markets) {
  return [...markets || []].filter((m) => m.status === "active" && classifySector(m.title) === "tech" && AI_BENCHMARK_RE.test(m.title || "")).sort((a, b) => (b.total_volume || 0) - (a.total_volume || 0));
}
function startupFundingMarkets(markets) {
  return [...markets || []].filter((m) => m.status === "active" && classifySector(m.title) === "tech" && FUNDING_MA_RE.test(m.title || "")).sort((a, b) => (b.total_volume || 0) - (a.total_volume || 0));
}
const TECH_SUB_DEMO = {
  "Trending AI Companies": [
    { title: "OpenAI to surpass $150B valuation in 2025?", vol: "$88.2M", yes: 61, no: 39, tag: "OPENAI" },
    { title: "Anthropic to raise a new round above $30B valuation?", vol: "$42.6M", yes: 57, no: 43, tag: "ANTHROPIC" }
  ],
  "AI Models": [
    { title: "GPT-5 official release before Q4?", vol: "$42.2M", yes: 68, no: 32, tag: "OPENAI" },
    { title: "Llama 4 to top open-source leaderboards in 2025?", vol: "$12.8M", yes: 49, no: 51, tag: "META" }
  ],
  "Big Tech": [
    { title: "Nvidia to cross $4T market cap in 2025?", vol: "$62.1M", yes: 44, no: 56, tag: "NVIDIA" },
    { title: "Apple to announce a major AI acquisition in 2025?", vol: "$28.4M", yes: 31, no: 69, tag: "APPLE" }
  ],
  "Startup Raises and Funding": [
    { title: "A startup to raise a $1B+ round in Q3 2025?", vol: "$34.7M", yes: 73, no: 27, tag: "FUNDING" },
    { title: "Y Combinator S24 demo day to produce a unicorn?", vol: "$9.2M", yes: 38, no: 62, tag: "Y COMBINATOR" }
  ],
  "Open Source AI & Github Repos": [
    { title: "Llama 4 weights leak confirmed as authentic?", vol: "$6.4M", yes: 79, no: 21, tag: "META" },
    { title: "An open-source model tops a major leaderboard in 2025?", vol: "$11.3M", yes: 52, no: 48, tag: "OPEN SOURCE" }
  ],
  "Startup Acquisitions": [
    { title: "OpenAI to acquire another AI startup before EOY?", vol: "$19.6M", yes: 41, no: 59, tag: "M&A" },
    { title: "A major cloud provider to acquire an AI chip startup in 2025?", vol: "$14.2M", yes: 35, no: 65, tag: "M&A" }
  ],
  "Space Tech": [
    { title: "SpaceX valuation to hit $250B by year-end?", vol: "$125.4M", yes: 82, no: 18, tag: "SPACEX" },
    { title: "Starship to complete a full orbital flight in 2025?", vol: "$21.9M", yes: 66, no: 34, tag: "SPACEX" }
  ]
};
const TECH_SUB_RE = {
  "Trending AI Companies": /openai|anthropic|\bxai\b|mistral|cohere|perplexity|deepmind|stability ai/i,
  "AI Models": /\bgpt\b|\bllm\b|\bclaude\b|gemini|llama|model release|benchmark|leaderboard/i,
  "Big Tech": /\bapple\b|\bgoogle\b|\bmeta\b|\bmicrosoft\b|\bamazon\b|\bnvidia\b|big tech/i,
  "Startup Raises and Funding": /\braise\b|funding round|series [a-e]\b|seed round|valuation/i,
  "Open Source AI & Github Repos": /open.?source|github|\bllama\b|hugging ?face|\brepo\b/i,
  "Startup Acquisitions": /acquir|acquisition|\bm&a\b|merger|buyout|bought by/i,
  "Space Tech": /spacex|\bnasa\b|rocket launch|starship|space tech|satellite|blue origin/i
};
function techSubMarkets(markets, sub) {
  const re = TECH_SUB_RE[sub];
  if (!re) return [];
  return [...markets || []].filter((m) => m.status === "active" && re.test(m.title || "")).sort((a, b) => (b.total_volume || 0) - (a.total_volume || 0));
}
const ATTENTION_SUBS = ["Trending Attention & News"];
const GLOBAL_ATTENTION_DEMO = [
  { title: "Will Kendrick Lamar drop a surprise album this week?", vol: "$4.2M", yes: 58, no: 42, tag: "BREAKING" },
  { title: "GTA VI release date to be confirmed before Q4?", vol: "$6.1M", yes: 44, no: 56, tag: "TOP STORY" },
  { title: "Taylor Swift to announce a new tour before 2026?", vol: "$3.8M", yes: 61, no: 39, tag: "TRENDING" },
  { title: "SpaceX Starship to complete an orbital flight this year?", vol: "$2.9M", yes: 69, no: 31, tag: "TOP STORY" }
];
function globalAttentionMarkets(markets) {
  return [...markets || []].filter((m) => m.status === "active").sort((a, b) => (b.total_volume || 0) - (a.total_volume || 0));
}
const MUSIC_GENRES = ["All Music", "R&B", "Hip Hop", "Rap", "Pop", "Electronic", "Latin", "Country", "Rock", "K-Pop"];
const GENRE_RE = {
  "R&B": /r&b|rnb|sza|usher|the weeknd|summer walker|chris brown|alicia keys|ne-?yo|jazmine sullivan/i,
  "Hip Hop": /hip.?hop|kendrick|drake|j\.? ?cole|travis scott|kanye|\bye\b|21 savage|\bfuture\b|metro boomin|lil (uzi|baby|wayne)|gunna|yeat|young thug|a\$?ap|tyler,? the creator/i,
  "Rap": /\brap\b|rapper|cardi b|nicki minaj|megan thee stallion|ice spice|playboi carti|central cee|glorilla|latto/i,
  "Pop": /\bpop\b|taylor swift|ariana grande|dua lipa|olivia rodrigo|billie eilish|katy perry|justin bieber|selena gomez|sabrina carpenter|chappell roan/i,
  "Electronic": /electronic|\bedm\b|house music|techno|dubstep|calvin harris|skrillex|david guetta|marshmello|deadmau5/i,
  "Latin": /latin|reggaeton|bad bunny|karol g|shakira|j balvin|peso pluma|feid|rauw alejandro/i,
  "Country": /country music|\bcountry\b|morgan wallen|luke combs|zach bryan|kacey musgraves|chris stapleton|carrie underwood/i,
  "Rock": /\brock\b|metallica|foo fighters|arctic monkeys|red hot chili peppers|coldplay|imagine dragons|greta van fleet/i,
  "K-Pop": /k-?pop|\bbts\b|blackpink|newjeans|stray kids|\btwice\b|seventeen|aespa|txt\b/i
};
const GENRE_DEMO = {
  "R&B": [
    { title: 'Will SZA drop a deluxe "SOS" edition before 2025?', vol: "$680K", yes: 59, no: 41, tag: "R&B CHARTS" },
    { title: "The Weeknd to headline a stadium tour in 2025?", vol: "$1.1M", yes: 74, no: 26, tag: "TOUR DATA" }
  ],
  "Hip Hop": [
    { title: "Kendrick Lamar to headline the Super Bowl Halftime Show 2026?", vol: "$2.9M", yes: 38, no: 62, tag: "HALFTIME" },
    { title: 'Travis Scott to release "Utopia 2" before 2026?', vol: "$1.4M", yes: 29, no: 71, tag: "RELEASE DATE" }
  ],
  "Rap": [
    { title: "Cardi B to release her second studio album in 2025?", vol: "$920K", yes: 44, no: 56, tag: "ALBUM WATCH" },
    { title: "Ice Spice to headline a major festival in 2025?", vol: "$410K", yes: 63, no: 37, tag: "FESTIVALS" }
  ],
  "Pop": [
    { title: "Will Chappell Roan win Best New Artist at the Grammys?", vol: "$780K", yes: 52, no: 48, tag: "GRAMMYS" },
    { title: "Dua Lipa to announce a new album before Q3?", vol: "$530K", yes: 41, no: 59, tag: "ALBUM WATCH" }
  ],
  "Electronic": [
    { title: "Calvin Harris to headline a major EDM festival in 2025?", vol: "$390K", yes: 68, no: 32, tag: "FESTIVALS" },
    { title: "Marshmello to release a collab album before 2026?", vol: "$210K", yes: 35, no: 65, tag: "RELEASE DATE" }
  ],
  "Latin": [
    { title: "Bad Bunny to headline Coachella 2025?", vol: "$1.6M", yes: 71, no: 29, tag: "COACHELLA" },
    { title: "Karol G to win Best Latin Album at the Grammys?", vol: "$460K", yes: 55, no: 45, tag: "GRAMMYS" }
  ],
  "Country": [
    { title: "Morgan Wallen to have the #1 country album of 2025?", vol: "$640K", yes: 66, no: 34, tag: "BILLBOARD" },
    { title: "Zach Bryan to announce a stadium tour in 2025?", vol: "$380K", yes: 58, no: 42, tag: "TOUR DATA" }
  ],
  "Rock": [
    { title: "A rock act to headline a major festival in 2025?", vol: "$290K", yes: 47, no: 53, tag: "FESTIVALS" },
    { title: "Foo Fighters to release a new album before 2026?", vol: "$220K", yes: 39, no: 61, tag: "RELEASE DATE" }
  ],
  "K-Pop": [
    { title: "BTS to reunite for a full group comeback in 2025?", vol: "$3.1M", yes: 61, no: 39, tag: "COMEBACK WATCH" },
    { title: "BLACKPINK to headline a US stadium tour in 2025?", vol: "$1.9M", yes: 57, no: 43, tag: "TOUR DATA" }
  ]
};
function genreMarkets(markets, genre) {
  const re = GENRE_RE[genre];
  if (!re) return [];
  return [...markets || []].filter((m) => m.status === "active" && re.test(m.title || "")).sort((a, b) => (b.total_volume || 0) - (a.total_volume || 0));
}
const CREATOR_SUBS = ["All Creators", "YouTube Milestones", "Twitch Live Streaming", "Kick Live Streaming", "Viral Streamers and Events"];
const CREATOR_SUB_ICONS = {
  "All Creators": "people",
  "YouTube Milestones": "playcircle",
  "Twitch Live Streaming": "play",
  "Kick Live Streaming": "bolt",
  "Viral Streamers and Events": "trend"
};
const FESTIVAL_SUBS = ["All Festivals", "Performances & Lineups", "Headliner", "Ticket Volatility", "Festival M&A"];
const FESTIVAL_SUB_ICONS = {
  "All Festivals": "stage",
  "Performances & Lineups": "calendar",
  "Headliner": "note",
  "Ticket Volatility": "ticket",
  "Festival M&A": "briefcase"
};
const FESTIVALS_DEMO = [
  { title: "Coachella 2025: Rihanna to headline?", vol: "$4.8M", yes: 32, no: 68, tag: "GOLDENVOICE" },
  { title: "Tomorrowland 2025 early bird to sell out in < 5 mins?", vol: "$2.1M", yes: 85, no: 15, tag: "ID&T" },
  { title: "Glastonbury to announce expansion into Asia by EOY?", vol: "$1.2M", yes: 12, no: 88, tag: "LIVE NATION" },
  { title: "Burning Man 2024 total attendance to exceed 80k?", vol: "$3.5M", yes: 55, no: 45, tag: "BLACK ROCK CITY" }
];
const FESTIVAL_SUB_DEMO = {
  "Performances & Lineups": [
    { title: "Full Coachella 2025 lineup announced before February?", vol: "$680K", yes: 74, no: 26, tag: "LINEUP WATCH" },
    { title: "A surprise guest joins a Coachella headliner set?", vol: "$310K", yes: 61, no: 39, tag: "PERFORMANCES" }
  ],
  "Headliner": [
    { title: "Beyoncé confirmed as a 2025 festival headliner?", vol: "$1.4M", yes: 48, no: 52, tag: "HEADLINER WATCH" },
    { title: "A K-pop act headlines a major US festival in 2025?", vol: "$390K", yes: 29, no: 71, tag: "HEADLINER WATCH" }
  ],
  "Ticket Volatility": [
    { title: "Coachella 2025 resale prices exceed 3x face value?", vol: "$520K", yes: 66, no: 34, tag: "TICKET VOLATILITY" },
    { title: "A major festival sells out in under 10 minutes in 2025?", vol: "$440K", yes: 58, no: 42, tag: "TICKET VOLATILITY" }
  ],
  "Festival M&A": [
    { title: "Live Nation to acquire another major festival brand in 2025?", vol: "$610K", yes: 41, no: 59, tag: "FESTIVAL M&A" },
    { title: "A private equity firm buys a stake in a top festival in 2025?", vol: "$280K", yes: 35, no: 65, tag: "FESTIVAL M&A" }
  ]
};
const FESTIVAL_SUB_RE = {
  "Performances & Lineups": /lineup|line-up|perform(ance)?|set time|schedule announc/i,
  "Headliner": /headlin/i,
  "Ticket Volatility": /ticket|sell.?out|early bird|resale/i,
  "Festival M&A": /acquir|merger|acquisition|buyout|stake in/i
};
function festivalSubMarkets(markets, sub) {
  const re = FESTIVAL_SUB_RE[sub];
  if (!re) return [];
  return [...markets || []].filter((m) => m.status === "active" && re.test(m.title || "")).sort((a, b) => (b.total_volume || 0) - (a.total_volume || 0));
}
function SectorIcon({ kind, color, size = 15 }) {
  const c = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: color, strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round", style: { flexShrink: 0 } };
  switch (kind) {
    case "note":
      return /* @__PURE__ */ jsxs("svg", { ...c, children: [
        /* @__PURE__ */ jsx("path", { d: "M9 18V5l12-2v13" }),
        /* @__PURE__ */ jsx("circle", { cx: "6", cy: "18", r: "3" }),
        /* @__PURE__ */ jsx("circle", { cx: "18", cy: "16", r: "3" })
      ] });
    case "film":
      return /* @__PURE__ */ jsxs("svg", { ...c, children: [
        /* @__PURE__ */ jsx("rect", { x: "3", y: "4", width: "18", height: "16", rx: "2" }),
        /* @__PURE__ */ jsx("path", { d: "M3 9h18M3 15h18M8 4v16M16 4v16" })
      ] });
    case "star":
      return /* @__PURE__ */ jsx("svg", { ...c, children: /* @__PURE__ */ jsx("path", { d: "M12 2l3 7 7 .6-5.5 4.6 1.8 7-6.3-4-6.3 4 1.8-7L2 9.6 9 9z" }) });
    case "stage":
      return /* @__PURE__ */ jsx("svg", { ...c, children: /* @__PURE__ */ jsx("path", { d: "M3 21h18M4 18h16M6 18v-7M10 18v-7M14 18v-7M18 18v-7M3 9l9-6 9 6z" }) });
    case "gamepad":
      return /* @__PURE__ */ jsxs("svg", { ...c, children: [
        /* @__PURE__ */ jsx("rect", { x: "2", y: "8", width: "20", height: "9", rx: "4" }),
        /* @__PURE__ */ jsx("path", { d: "M7 11v3M5.5 12.5h3M15.5 12.5h.01M18.5 11h.01" })
      ] });
    case "play":
      return /* @__PURE__ */ jsxs("svg", { ...c, children: [
        /* @__PURE__ */ jsx("rect", { x: "3", y: "4", width: "18", height: "16", rx: "2" }),
        /* @__PURE__ */ jsx("path", { d: "M10 9l5 3-5 3z", fill: color, stroke: "none" })
      ] });
    case "bolt":
      return /* @__PURE__ */ jsx("svg", { ...c, children: /* @__PURE__ */ jsx("path", { d: "M13 2L3 14h9l-1 8 10-12h-9z" }) });
    case "life":
      return /* @__PURE__ */ jsxs("svg", { ...c, children: [
        /* @__PURE__ */ jsx("circle", { cx: "12", cy: "12", r: "9" }),
        /* @__PURE__ */ jsx("circle", { cx: "12", cy: "12", r: "3.5" }),
        /* @__PURE__ */ jsx("path", { d: "M5.5 5.5l3.2 3.2M18.5 5.5l-3.2 3.2M5.5 18.5l3.2-3.2M18.5 18.5l-3.2-3.2" })
      ] });
    case "api":
      return /* @__PURE__ */ jsx("svg", { ...c, children: /* @__PURE__ */ jsx("path", { d: "M4 4l16 16M20 4L4 20" }) });
    case "bars":
      return /* @__PURE__ */ jsx("svg", { ...c, strokeWidth: "2.4", children: /* @__PURE__ */ jsx("path", { d: "M5 20V12M12 20V6M19 20v-9" }) });
    case "trend":
      return /* @__PURE__ */ jsx("svg", { ...c, children: /* @__PURE__ */ jsx("path", { d: "M3 17l6-6 4 4 8-8M15 7h6v6" }) });
    case "calendar":
      return /* @__PURE__ */ jsxs("svg", { ...c, children: [
        /* @__PURE__ */ jsx("rect", { x: "3", y: "5", width: "18", height: "16", rx: "2" }),
        /* @__PURE__ */ jsx("path", { d: "M8 3v4M16 3v4M3 10h18" })
      ] });
    case "ticket":
      return /* @__PURE__ */ jsxs("svg", { ...c, children: [
        /* @__PURE__ */ jsx("path", { d: "M3 8a2 2 0 012-2h14a2 2 0 012 2v2a2 2 0 000 4v2a2 2 0 01-2 2H5a2 2 0 01-2-2v-2a2 2 0 000-4z" }),
        /* @__PURE__ */ jsx("path", { d: "M9 6v12", strokeDasharray: "2 2" })
      ] });
    case "briefcase":
      return /* @__PURE__ */ jsxs("svg", { ...c, children: [
        /* @__PURE__ */ jsx("rect", { x: "3", y: "7", width: "18", height: "13", rx: "2" }),
        /* @__PURE__ */ jsx("path", { d: "M8 7V5a2 2 0 012-2h4a2 2 0 012 2v2M3 12h18" })
      ] });
    case "console":
      return /* @__PURE__ */ jsxs("svg", { ...c, children: [
        /* @__PURE__ */ jsx("rect", { x: "3", y: "4", width: "18", height: "12", rx: "2" }),
        /* @__PURE__ */ jsx("path", { d: "M8 20h8M12 16v4" })
      ] });
    case "trophy":
      return /* @__PURE__ */ jsx("svg", { ...c, children: /* @__PURE__ */ jsx("path", { d: "M8 21h8M12 17v4M7 4h10v5a5 5 0 01-10 0zM7 6H4a2 2 0 002 4h1M17 6h3a2 2 0 01-2 4h-1" }) });
    case "hardware":
      return /* @__PURE__ */ jsxs("svg", { ...c, children: [
        /* @__PURE__ */ jsx("rect", { x: "6", y: "6", width: "12", height: "12", rx: "2" }),
        /* @__PURE__ */ jsx("path", { d: "M9 3v3M15 3v3M9 18v3M15 18v3M3 9h3M3 15h3M18 9h3M18 15h3" })
      ] });
    case "playcircle":
      return /* @__PURE__ */ jsxs("svg", { ...c, children: [
        /* @__PURE__ */ jsx("circle", { cx: "12", cy: "12", r: "9" }),
        /* @__PURE__ */ jsx("path", { d: "M10 9l5 3-5 3z", fill: color, stroke: "none" })
      ] });
    case "castle":
      return /* @__PURE__ */ jsxs("svg", { ...c, children: [
        /* @__PURE__ */ jsx("path", { d: "M4 21V9l3-2v2h2V7l3-2 3 2v2h2V7l3 2v12z" }),
        /* @__PURE__ */ jsx("path", { d: "M4 21h16M9 21v-5h6v5" })
      ] });
    case "pin":
      return /* @__PURE__ */ jsxs("svg", { ...c, children: [
        /* @__PURE__ */ jsx("circle", { cx: "12", cy: "12", r: "9" }),
        /* @__PURE__ */ jsx("circle", { cx: "12", cy: "12", r: "2.5", fill: color, stroke: "none" })
      ] });
    case "people":
      return /* @__PURE__ */ jsxs("svg", { ...c, children: [
        /* @__PURE__ */ jsx("circle", { cx: "9", cy: "8", r: "3.5" }),
        /* @__PURE__ */ jsx("path", { d: "M2.5 20c.8-3.4 3.4-5 6.5-5s5.7 1.6 6.5 5" }),
        /* @__PURE__ */ jsx("circle", { cx: "17.5", cy: "9", r: "2.6" }),
        /* @__PURE__ */ jsx("path", { d: "M16 15.2c2.7.2 4.8 1.6 5.5 4.3" })
      ] });
    case "tiktok":
      return /* @__PURE__ */ jsx("svg", { ...c, children: /* @__PURE__ */ jsx("path", { d: "M14 4v10.5a3.5 3.5 0 11-3-3.46M14 4a4.5 4.5 0 004.5 4.5" }) });
    case "grid":
      return /* @__PURE__ */ jsxs("svg", { ...c, children: [
        /* @__PURE__ */ jsx("rect", { x: "3", y: "3", width: "7", height: "7", rx: "1" }),
        /* @__PURE__ */ jsx("rect", { x: "14", y: "3", width: "7", height: "7", rx: "1" }),
        /* @__PURE__ */ jsx("rect", { x: "3", y: "14", width: "7", height: "7", rx: "1" }),
        /* @__PURE__ */ jsx("rect", { x: "14", y: "14", width: "7", height: "7", rx: "1" })
      ] });
    case "robot":
      return /* @__PURE__ */ jsxs("svg", { ...c, children: [
        /* @__PURE__ */ jsx("rect", { x: "5", y: "9", width: "14", height: "10", rx: "2" }),
        /* @__PURE__ */ jsx("path", { d: "M12 9V5M9 5h6M9 13v2M15 13v2" }),
        /* @__PURE__ */ jsx("circle", { cx: "12", cy: "4", r: "1.2", fill: color, stroke: "none" })
      ] });
    case "building":
      return /* @__PURE__ */ jsxs("svg", { ...c, children: [
        /* @__PURE__ */ jsx("rect", { x: "5", y: "3", width: "14", height: "18", rx: "1" }),
        /* @__PURE__ */ jsx("path", { d: "M9 7h.01M15 7h.01M9 11h.01M15 11h.01M9 15h.01M15 15h.01M10 21v-4h4v4" })
      ] });
    case "terminal":
      return /* @__PURE__ */ jsxs("svg", { ...c, children: [
        /* @__PURE__ */ jsx("rect", { x: "3", y: "4", width: "18", height: "16", rx: "2" }),
        /* @__PURE__ */ jsx("path", { d: "M7 9l3 3-3 3M13 15h4" })
      ] });
    case "layers":
      return /* @__PURE__ */ jsxs("svg", { ...c, children: [
        /* @__PURE__ */ jsx("path", { d: "M12 3l9 5-9 5-9-5z" }),
        /* @__PURE__ */ jsx("path", { d: "M3 13l9 5 9-5M3 8l9 5 9-5" })
      ] });
    case "rocket":
      return /* @__PURE__ */ jsxs("svg", { ...c, children: [
        /* @__PURE__ */ jsx("path", { d: "M12 2c3 2 5 6 5 10 0 2-1 4-2 5l-3 2-3-2c-1-1-2-3-2-5 0-4 2-8 5-10z" }),
        /* @__PURE__ */ jsx("circle", { cx: "12", cy: "10", r: "1.6", fill: color, stroke: "none" }),
        /* @__PURE__ */ jsx("path", { d: "M9 16l-2 4M15 16l2 4M10.5 18.5h3" })
      ] });
    case "globe":
      return /* @__PURE__ */ jsxs("svg", { ...c, children: [
        /* @__PURE__ */ jsx("circle", { cx: "12", cy: "12", r: "9" }),
        /* @__PURE__ */ jsx("path", { d: "M3 12h18M12 3c2.5 2.5 4 5.6 4 9s-1.5 6.5-4 9c-2.5-2.5-4-5.6-4-9s1.5-6.5 4-9z" })
      ] });
    default:
      return null;
  }
}
function MiniSpark({ up, seed = 0 }) {
  const shapes = [
    "0,20 8,18 16,19 24,12 32,14 40,7 48,4",
    "0,20 8,15 16,17 24,10 32,12 40,6 48,3",
    "0,4 8,9 16,7 24,13 32,12 40,17 48,20",
    "0,6 8,10 16,8 24,14 32,11 40,16 48,20"
  ];
  const pts = shapes[seed % shapes.length];
  const color = up ? GREEN : SALMON;
  return /* @__PURE__ */ jsx("svg", { viewBox: "0 0 48 24", style: { width: "100%", height: 34, display: "block" }, children: /* @__PURE__ */ jsx("polyline", { points: pts, fill: "none", stroke: color, strokeWidth: "1.8", strokeLinecap: "round", strokeLinejoin: "round" }) });
}
function MusicCard({ m, onOpen }) {
  return /* @__PURE__ */ jsxs(
    "div",
    {
      onClick: () => m.id && onOpen(m.id),
      style: { background: CARD_BG, border: `1px solid ${CARD_LINE}`, borderRadius: 8, padding: "13px 14px 14px", cursor: m.id ? "pointer" : "default", display: "flex", flexDirection: "column", transition: "border-color .15s ease" },
      onMouseEnter: (e) => e.currentTarget.style.borderColor = GOLD,
      onMouseLeave: (e) => e.currentTarget.style.borderColor = CARD_LINE,
      children: [
        /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 }, children: [
          /* @__PURE__ */ jsx("span", { style: { ...mono({ fontSize: 8.5, color: WARM, background: "#0C2745", border: `1px solid ${CARD_LINE}`, borderRadius: 2, padding: "3px 7px" }) }, children: m.tag }),
          /* @__PURE__ */ jsxs("span", { style: { display: "inline-flex", alignItems: "center", gap: 4, ...mono({ fontSize: 9, color: WARM }) }, children: [
            /* @__PURE__ */ jsx(SectorIcon, { kind: "bars", color: WARM, size: 11 }),
            m.vol,
            " Vol"
          ] })
        ] }),
        /* @__PURE__ */ jsx("div", { style: { color: "#FFFFFF", fontWeight: 700, fontSize: 13, lineHeight: 1.4, margin: "11px 0 10px", minHeight: 54 }, children: m.title }),
        /* @__PURE__ */ jsx(MiniSpark, { up: m.yes >= 50, seed: m._seed || 0 }),
        /* @__PURE__ */ jsxs("div", { style: { display: "flex", gap: 8, marginTop: 12 }, children: [
          /* @__PURE__ */ jsxs("div", { style: { flex: 1, textAlign: "center", background: "#0C2745", borderRadius: 4, padding: "9px 4px" }, children: [
            /* @__PURE__ */ jsx("div", { style: { ...mono({ fontSize: 8.5, color: GREEN }) }, children: "YES" }),
            /* @__PURE__ */ jsxs("div", { style: { color: "#FFFFFF", fontWeight: 700, fontSize: 13, marginTop: 3 }, children: [
              m.yes,
              "¢"
            ] })
          ] }),
          /* @__PURE__ */ jsxs("div", { style: { flex: 1, textAlign: "center", background: "#0C2745", borderRadius: 4, padding: "9px 4px" }, children: [
            /* @__PURE__ */ jsx("div", { style: { ...mono({ fontSize: 8.5, color: SALMON }) }, children: "NO" }),
            /* @__PURE__ */ jsxs("div", { style: { color: "#FFFFFF", fontWeight: 700, fontSize: 13, marginTop: 3 }, children: [
              m.no,
              "¢"
            ] })
          ] })
        ] })
      ]
    }
  );
}
function DuneArt() {
  return /* @__PURE__ */ jsxs("svg", { viewBox: "0 0 600 320", preserveAspectRatio: "xMidYMid slice", style: { position: "absolute", inset: 0, width: "100%", height: "100%" }, children: [
    /* @__PURE__ */ jsxs("defs", { children: [
      /* @__PURE__ */ jsxs("linearGradient", { id: "dune-sky", x1: "0", y1: "0", x2: "0", y2: "1", children: [
        /* @__PURE__ */ jsx("stop", { offset: "0%", stopColor: "#060D16" }),
        /* @__PURE__ */ jsx("stop", { offset: "45%", stopColor: "#0F2435" }),
        /* @__PURE__ */ jsx("stop", { offset: "72%", stopColor: "#274456" }),
        /* @__PURE__ */ jsx("stop", { offset: "100%", stopColor: "#3C5B67" })
      ] }),
      /* @__PURE__ */ jsxs("radialGradient", { id: "dune-halo", cx: "50%", cy: "50%", r: "50%", children: [
        /* @__PURE__ */ jsx("stop", { offset: "0%", stopColor: "#F8D098", stopOpacity: "0.9" }),
        /* @__PURE__ */ jsx("stop", { offset: "35%", stopColor: "#C8A47E", stopOpacity: "0.55" }),
        /* @__PURE__ */ jsx("stop", { offset: "100%", stopColor: "#8A6B54", stopOpacity: "0" })
      ] }),
      /* @__PURE__ */ jsxs("linearGradient", { id: "dune-ridge-far", x1: "0", y1: "0", x2: "0", y2: "1", children: [
        /* @__PURE__ */ jsx("stop", { offset: "0%", stopColor: "#5C4A3C" }),
        /* @__PURE__ */ jsx("stop", { offset: "100%", stopColor: "#2E241D" })
      ] }),
      /* @__PURE__ */ jsxs("linearGradient", { id: "dune-ridge-near", x1: "0", y1: "0", x2: "0", y2: "1", children: [
        /* @__PURE__ */ jsx("stop", { offset: "0%", stopColor: "#1D1712" }),
        /* @__PURE__ */ jsx("stop", { offset: "100%", stopColor: "#07090C" })
      ] }),
      /* @__PURE__ */ jsxs("linearGradient", { id: "dune-rim", x1: "0", y1: "0", x2: "1", y2: "0", children: [
        /* @__PURE__ */ jsx("stop", { offset: "0%", stopColor: "#3E2A1C", stopOpacity: "0" }),
        /* @__PURE__ */ jsx("stop", { offset: "50%", stopColor: "#8A5A32", stopOpacity: "0.85" }),
        /* @__PURE__ */ jsx("stop", { offset: "100%", stopColor: "#3E2A1C", stopOpacity: "0" })
      ] })
    ] }),
    /* @__PURE__ */ jsx("rect", { width: "600", height: "320", fill: "url(#dune-sky)" }),
    /* @__PURE__ */ jsx("circle", { cx: "360", cy: "100", r: "130", fill: "url(#dune-halo)" }),
    /* @__PURE__ */ jsx("circle", { cx: "360", cy: "100", r: "30", fill: "#FBE3B8" }),
    /* @__PURE__ */ jsx("circle", { cx: "360", cy: "100", r: "30", fill: "#F8D098", opacity: "0.6" }),
    /* @__PURE__ */ jsx("path", { d: "M0,175 Q140,140 280,168 Q420,196 600,150 V320 H0 Z", fill: "url(#dune-ridge-far)" }),
    /* @__PURE__ */ jsx("path", { d: "M0,178 Q140,146 280,172 Q420,198 600,155 V182 Q420,214 280,190 Q140,164 0,196 Z", fill: "url(#dune-rim)", opacity: "0.55" }),
    /* @__PURE__ */ jsx("path", { d: "M0,225 Q160,195 300,222 Q440,248 600,205 V320 H0 Z", fill: "url(#dune-ridge-near)" }),
    /* @__PURE__ */ jsx("path", { d: "M270,320 Q290,250 300,222 Q312,250 332,320 Z", fill: "#050708", opacity: "0.9" }),
    /* @__PURE__ */ jsx("path", { d: "M282,320 Q294,268 300,240 Q307,268 320,320 Z", fill: "#0B0E12", opacity: "0.7" })
  ] });
}
function toCardShape(m, tag, seed) {
  const yes = yesOf(m);
  const lead = yes || leaderOf(m);
  const yesP = yes ? Math.round(yes.probability || 0) : Math.round((lead == null ? void 0 : lead.probability) || 50);
  return { id: m.id, title: m.title, vol: compactVol(m.total_volume || 0), yes: yesP, no: 100 - yesP, tag, _seed: seed };
}
function SectionHeader({ icon, label, onViewAll }) {
  return /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }, children: [
    /* @__PURE__ */ jsxs("span", { style: { display: "inline-flex", alignItems: "center", gap: 9 }, children: [
      /* @__PURE__ */ jsx(SectorIcon, { kind: icon, color: GOLD_DIM, size: 17 }),
      /* @__PURE__ */ jsx("span", { style: { color: "#FFFFFF", fontWeight: 800, fontSize: 19 }, children: label })
    ] }),
    /* @__PURE__ */ jsxs("button", { onClick: onViewAll, style: { background: "none", border: "none", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 5, color: WARM, fontSize: 12.5, fontWeight: 600 }, children: [
      "View All ",
      /* @__PURE__ */ jsx("span", { style: { fontSize: 14 }, children: "→" })
    ] })
  ] });
}
function MusicSection({ markets, genre, onOpen, onViewAll, forwardRef }) {
  const isGenre = genre && genre !== "All Music";
  const real = isGenre ? genreMarkets(markets, genre).slice(0, 4).map((m, i) => {
    var _a, _b;
    return toCardShape(m, ((_b = (_a = GENRE_DEMO[genre]) == null ? void 0 : _a[i]) == null ? void 0 : _b.tag) || genre.toUpperCase(), i);
  }) : sectorMarkets(markets, "music").slice(0, 4).map((m, i) => {
    var _a;
    return toCardShape(m, ((_a = MUSIC_DEMO[i]) == null ? void 0 : _a.tag) || "MUSIC", i);
  });
  const demoBank = isGenre ? GENRE_DEMO[genre] || [] : MUSIC_DEMO;
  const rows = real.length >= Math.min(2, demoBank.length) ? real : demoBank.map((d, i) => ({ ...d, id: null, _seed: i }));
  return /* @__PURE__ */ jsxs("div", { ref: forwardRef, style: { marginBottom: 34, scrollMarginTop: 90 }, children: [
    /* @__PURE__ */ jsx(SectionHeader, { icon: "note", label: isGenre ? `Music · ${genre}` : "Music", onViewAll }),
    /* @__PURE__ */ jsx("div", { className: "dbm-home-music-grid", children: rows.map((m, i) => /* @__PURE__ */ jsx(MusicCard, { m, onOpen }, m.id || `music-${i}`)) })
  ] });
}
function MoviesSection({ markets, platform, onOpen, onViewAll, forwardRef }) {
  const isPlatform = !!platform && platform !== "All Movies & TV";
  const real = isPlatform ? platformMarkets(markets, platform) : sectorMarkets(markets, "movies");
  const featuredM = real[0];
  const sideMs = real.slice(1, 3);
  const demoSet = isPlatform ? PLATFORM_DEMO[platform] || { featured: MOVIES_DEMO_FEATURED, side: MOVIES_DEMO_SIDE } : { featured: MOVIES_DEMO_FEATURED, side: MOVIES_DEMO_SIDE };
  const featured = featuredM ? { id: featuredM.id, title: featuredM.title, desc: featuredM.description || demoSet.featured.desc, ...(() => {
    const y = yesOf(featuredM) || leaderOf(featuredM);
    const yp = Math.round((yesOf(featuredM) ? y.probability : y == null ? void 0 : y.probability) || 50);
    return { yes: yp, no: 100 - yp };
  })(), image: featuredM.image || featuredM.event_image } : demoSet.featured;
  const side = sideMs.length > 0 ? sideMs.map((m, i) => {
    var _a;
    return toCardShape(m, ((_a = demoSet.side[i]) == null ? void 0 : _a.tag) || (isPlatform ? platform.toUpperCase() : i === 0 ? "ROTTEN TOMATOES" : "STREAMING WARS"), i);
  }) : demoSet.side.map((d, i) => ({ ...d, id: null, _seed: i }));
  return /* @__PURE__ */ jsxs("div", { ref: forwardRef, style: { marginBottom: 34, scrollMarginTop: 90 }, children: [
    /* @__PURE__ */ jsx(SectionHeader, { icon: "film", label: isPlatform ? `Movies & TV · ${platform}` : "Movies & TV", onViewAll }),
    /* @__PURE__ */ jsxs("div", { className: "dbm-home-movies-grid", children: [
      /* @__PURE__ */ jsxs(
        "div",
        {
          onClick: () => featured.id && onOpen(featured.id),
          style: { position: "relative", minHeight: 260, borderRadius: 8, overflow: "hidden", cursor: featured.id ? "pointer" : "default", border: `1px solid ${CARD_LINE}`, background: featured.image && /^https?:/.test(featured.image) ? `center/cover no-repeat url(${featured.image})` : "#0A1730", display: "flex", flexDirection: "column", justifyContent: "flex-end", padding: 20 },
          children: [
            !(featured.image && /^https?:/.test(featured.image)) && /* @__PURE__ */ jsx(DuneArt, {}),
            /* @__PURE__ */ jsx("div", { style: { position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(0,10,26,.05) 0%, rgba(0,10,26,.85) 78%)" } }),
            /* @__PURE__ */ jsxs("div", { style: { position: "relative", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }, children: [
              /* @__PURE__ */ jsx("span", { style: { ...mono({ fontSize: 8.5, color: WARM, background: "rgba(0,19,45,.85)", border: `1px solid ${CARD_LINE}`, borderRadius: 2, padding: "4px 9px" }) }, children: isPlatform ? `FEATURED · ${platform.toUpperCase()}` : "FEATURED BOX OFFICE" }),
              /* @__PURE__ */ jsxs("span", { style: { display: "inline-flex", alignItems: "center", gap: 5, ...mono({ fontSize: 8.5, color: GREEN }) }, children: [
                /* @__PURE__ */ jsx("span", { style: { width: 5, height: 5, borderRadius: 999, background: GREEN } }),
                "LIVE MARKET"
              ] })
            ] }),
            /* @__PURE__ */ jsxs("div", { style: { position: "relative", marginTop: "auto" }, children: [
              /* @__PURE__ */ jsx("h3", { style: { color: "#FFFFFF", fontWeight: 800, fontSize: "clamp(17px,1.9vw,21px)", lineHeight: 1.3, margin: "14px 0 0" }, children: featured.title }),
              /* @__PURE__ */ jsx("p", { style: { color: "#B9C7DC", fontSize: 11.5, lineHeight: 1.6, margin: "9px 0 0", maxWidth: 460 }, children: featured.desc }),
              /* @__PURE__ */ jsxs("div", { style: { display: "flex", gap: 10, marginTop: 14 }, children: [
                /* @__PURE__ */ jsxs("span", { style: { flex: 1, maxWidth: 150, textAlign: "center", background: "rgba(0,19,45,.75)", border: `1px solid ${CARD_LINE}`, borderRadius: 4, padding: "9px 4px" }, children: [
                  /* @__PURE__ */ jsx("div", { style: { ...mono({ fontSize: 8, color: WARM }) }, children: "TRADE YES" }),
                  /* @__PURE__ */ jsxs("div", { style: { color: GREEN, fontWeight: 800, fontSize: 14, marginTop: 3 }, children: [
                    featured.yes,
                    "¢"
                  ] })
                ] }),
                /* @__PURE__ */ jsxs("span", { style: { flex: 1, maxWidth: 150, textAlign: "center", background: "rgba(0,19,45,.75)", border: `1px solid ${CARD_LINE}`, borderRadius: 4, padding: "9px 4px" }, children: [
                  /* @__PURE__ */ jsx("div", { style: { ...mono({ fontSize: 8, color: WARM }) }, children: "TRADE NO" }),
                  /* @__PURE__ */ jsxs("div", { style: { color: SALMON, fontWeight: 800, fontSize: 14, marginTop: 3 }, children: [
                    featured.no,
                    "¢"
                  ] })
                ] })
              ] })
            ] })
          ]
        }
      ),
      /* @__PURE__ */ jsx("div", { style: { display: "flex", flexDirection: "column", gap: 14 }, children: side.map((m, i) => /* @__PURE__ */ jsx(SectorGridCard, { m, onOpen }, m.id || `side-${i}`)) })
    ] })
  ] });
}
function SectorGridCard({ m, onOpen }) {
  return /* @__PURE__ */ jsxs(
    "div",
    {
      onClick: () => m.id && onOpen(m.id),
      style: { background: CARD_BG, border: `1px solid ${CARD_LINE}`, borderRadius: 8, padding: "14px 15px", cursor: m.id ? "pointer" : "default", transition: "border-color .15s ease" },
      onMouseEnter: (e) => e.currentTarget.style.borderColor = GOLD,
      onMouseLeave: (e) => e.currentTarget.style.borderColor = CARD_LINE,
      children: [
        /* @__PURE__ */ jsx("span", { style: { ...mono({ fontSize: 8, color: WARM }) }, children: m.tag }),
        /* @__PURE__ */ jsx("div", { style: { color: "#FFFFFF", fontWeight: 700, fontSize: 15, lineHeight: 1.4, margin: "9px 0 12px" }, children: m.title }),
        /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between" }, children: [
          /* @__PURE__ */ jsxs("span", { style: { ...mono({ fontSize: 10, color: WARM }) }, children: [
            "Vol: ",
            m.vol
          ] }),
          /* @__PURE__ */ jsxs("span", { style: { display: "flex", gap: 6 }, children: [
            /* @__PURE__ */ jsxs("span", { style: { background: "#0C2745", border: "1px solid rgba(75,225,118,.4)", color: GREEN, ...mono({ fontSize: 10, letterSpacing: "0.02em" }), borderRadius: 3, padding: "5px 9px" }, children: [
              m.yes,
              "¢"
            ] }),
            /* @__PURE__ */ jsxs("span", { style: { background: "#0C2745", border: "1px solid rgba(255,180,171,.35)", color: SALMON, ...mono({ fontSize: 10, letterSpacing: "0.02em" }), borderRadius: 3, padding: "5px 9px" }, children: [
              m.no,
              "¢"
            ] })
          ] })
        ] })
      ]
    },
    m.id || m.title
  );
}
function TwoCardSection({ sector, markets, demo, max = 2, title, pickReal, onOpen, onViewAll, forwardRef }) {
  const pool = pickReal ? pickReal(markets) : sectorMarkets(markets, sector.id);
  const real = pool.slice(0, max).map((m, i) => {
    var _a;
    return toCardShape(m, ((_a = demo[i]) == null ? void 0 : _a.tag) || sector.label.toUpperCase(), i);
  });
  const rows = real.length >= Math.min(2, demo.length) ? real : demo.map((d, i) => ({ ...d, id: null, _seed: i }));
  return /* @__PURE__ */ jsxs("div", { ref: forwardRef, style: { marginBottom: 34, scrollMarginTop: 90 }, children: [
    /* @__PURE__ */ jsx(SectionHeader, { icon: sector.icon, label: title || sector.label, onViewAll }),
    /* @__PURE__ */ jsx("div", { className: "dbm-home-two-grid", children: rows.map((m, i) => /* @__PURE__ */ jsx(SectorGridCard, { m, onOpen }, m.id || `${sector.id}-${i}`)) })
  ] });
}
function HomeTape({ markets }) {
  const real = [...markets].filter((m) => m.status === "active").sort((a, b) => (b.total_volume || 0) - (a.total_volume || 0)).slice(0, 6).map((m) => {
    const yes = yesOf(m) || leaderOf(m);
    const p = Math.round((yes == null ? void 0 : yes.probability) || 50);
    return { label: shortTitle(m.title).slice(0, 20).toUpperCase(), price: p, delta: deltaFor(m, yes) };
  });
  const demo = [
    { label: "DUNE 3 ANNOUNCE", price: 76, delta: 12 },
    { label: "NETFLIX CHURN", price: 44, delta: -3 },
    { label: "GRAMMYS AOTY", price: 62, delta: 1 },
    { label: "K. LAMAR ALBUM", price: 88, delta: 4 },
    { label: "SZA TOUR '25", price: 91, delta: 2 }
  ];
  const items = real.length >= 4 ? real : demo;
  const loop = [...items, ...items, ...items];
  return /* @__PURE__ */ jsxs("div", { style: { overflow: "hidden", whiteSpace: "nowrap", flex: 1, minWidth: 0 }, children: [
    /* @__PURE__ */ jsx("div", { className: "dbm-home-tape", style: { display: "inline-flex", alignItems: "center" }, children: loop.map((it, i) => /* @__PURE__ */ jsxs("span", { style: { display: "inline-flex", alignItems: "baseline", gap: 6, marginRight: 34, ...mono({ fontSize: 10.5, letterSpacing: "0.04em" }) }, children: [
      /* @__PURE__ */ jsxs("span", { style: { color: WARM }, children: [
        it.label,
        ":"
      ] }),
      /* @__PURE__ */ jsxs("span", { style: { color: "#DCE6F5" }, children: [
        it.price,
        "¢"
      ] }),
      /* @__PURE__ */ jsxs("span", { style: { color: it.delta >= 0 ? GREEN : SALMON }, children: [
        it.delta >= 0 ? "▲" : "▼",
        " ",
        Math.abs(it.delta),
        "%"
      ] })
    ] }, i)) }),
    /* @__PURE__ */ jsx("style", { children: `
        .dbm-home-tape { animation: dbm-home-tape 42s linear infinite; }
        .dbm-home-tape:hover { animation-play-state: paused; }
        @keyframes dbm-home-tape { from { transform: translateX(0); } to { transform: translateX(-33.333%); } }
        @media (prefers-reduced-motion: reduce) { .dbm-home-tape { animation: none; } }
      ` })
  ] });
}
function LandingPage() {
  const { markets } = useMarkets();
  const navigate = useNavigate();
  const [pulse, setPulse] = useState(null);
  const [activeSector, setActiveSector] = useState("attention");
  const [attentionOpen, setAttentionOpen] = useState(true);
  const [attentionSub, setAttentionSub] = useState("Trending Attention & News");
  const [musicOpen, setMusicOpen] = useState(false);
  const [musicGenre, setMusicGenre] = useState("All Music");
  const [moviesOpen, setMoviesOpen] = useState(false);
  const [moviesPlatform, setMoviesPlatform] = useState("All Movies & TV");
  const [creatorsOpen, setCreatorsOpen] = useState(false);
  const [creatorSub, setCreatorSub] = useState("All Creators");
  const [festivalsOpen, setFestivalsOpen] = useState(false);
  const [festivalSub, setFestivalSub] = useState("All Festivals");
  const [gamingOpen, setGamingOpen] = useState(false);
  const [gamingSub, setGamingSub] = useState("All Gaming");
  const [streamingOpen, setStreamingOpen] = useState(false);
  const [streamingSub, setStreamingSub] = useState("All Streaming");
  const [trendsOpen, setTrendsOpen] = useState(false);
  const [trendsSub, setTrendsSub] = useState("Google Trends");
  const [techOpen, setTechOpen] = useState(false);
  const [techSub, setTechSub] = useState("All Tech");
  const fetchPulse = useCallback(() => {
    api.getPulse().then((r) => setPulse(r)).catch(() => {
    });
  }, []);
  useEffect(() => {
    fetchPulse();
    const t = setInterval(fetchPulse, 2e4);
    return () => clearInterval(t);
  }, [fetchPulse]);
  const refs = {
    attention: useRef(null),
    music: useRef(null),
    movies: useRef(null),
    celebrities: useRef(null),
    festivals: useRef(null),
    gaming: useRef(null),
    streaming: useRef(null),
    trends: useRef(null),
    tech: useRef(null)
  };
  const goTo = (id) => {
    var _a, _b;
    setActiveSector(id);
    if (id !== "attention") setAttentionOpen(false);
    if (id !== "music") setMusicOpen(false);
    if (id !== "movies") setMoviesOpen(false);
    if (id !== "celebrities") setCreatorsOpen(false);
    if (id !== "festivals") setFestivalsOpen(false);
    if (id !== "gaming") setGamingOpen(false);
    if (id !== "streaming") setStreamingOpen(false);
    if (id !== "trends") setTrendsOpen(false);
    if (id !== "tech") setTechOpen(false);
    (_b = (_a = refs[id]) == null ? void 0 : _a.current) == null ? void 0 : _b.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const toggleAttention = () => {
    var _a, _b;
    if (activeSector === "attention") {
      setAttentionOpen((v) => !v);
    } else {
      setActiveSector("attention");
      setAttentionOpen(true);
      setMusicOpen(false);
      setMoviesOpen(false);
      setCreatorsOpen(false);
      setFestivalsOpen(false);
      setGamingOpen(false);
      setStreamingOpen(false);
      setTrendsOpen(false);
      setTechOpen(false);
    }
    (_b = (_a = refs.attention) == null ? void 0 : _a.current) == null ? void 0 : _b.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const selectAttentionSub = (v) => {
    var _a, _b;
    setAttentionSub(v);
    setActiveSector("attention");
    setAttentionOpen(true);
    (_b = (_a = refs.attention) == null ? void 0 : _a.current) == null ? void 0 : _b.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const toggleMusic = () => {
    var _a, _b;
    if (activeSector === "music") {
      setMusicOpen((v) => !v);
    } else {
      setActiveSector("music");
      setMusicOpen(true);
      setMoviesOpen(false);
      setCreatorsOpen(false);
      setFestivalsOpen(false);
      setGamingOpen(false);
      setStreamingOpen(false);
      setTrendsOpen(false);
      setTechOpen(false);
      setAttentionOpen(false);
    }
    (_b = (_a = refs.music) == null ? void 0 : _a.current) == null ? void 0 : _b.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const selectGenre = (g) => {
    var _a, _b;
    setMusicGenre(g);
    setActiveSector("music");
    setMusicOpen(true);
    (_b = (_a = refs.music) == null ? void 0 : _a.current) == null ? void 0 : _b.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const toggleMovies = () => {
    var _a, _b;
    if (activeSector === "movies") {
      setMoviesOpen((v) => !v);
    } else {
      setActiveSector("movies");
      setMoviesOpen(true);
      setMusicOpen(false);
      setCreatorsOpen(false);
      setFestivalsOpen(false);
      setGamingOpen(false);
      setStreamingOpen(false);
      setTrendsOpen(false);
      setTechOpen(false);
      setAttentionOpen(false);
    }
    (_b = (_a = refs.movies) == null ? void 0 : _a.current) == null ? void 0 : _b.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const selectPlatform = (p) => {
    var _a, _b;
    setMoviesPlatform(p);
    setActiveSector("movies");
    setMoviesOpen(true);
    (_b = (_a = refs.movies) == null ? void 0 : _a.current) == null ? void 0 : _b.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const toggleCreators = () => {
    var _a, _b;
    if (activeSector === "celebrities") {
      setCreatorsOpen((v) => !v);
    } else {
      setActiveSector("celebrities");
      setCreatorsOpen(true);
      setMusicOpen(false);
      setMoviesOpen(false);
      setFestivalsOpen(false);
      setGamingOpen(false);
      setStreamingOpen(false);
      setTrendsOpen(false);
      setTechOpen(false);
      setAttentionOpen(false);
    }
    (_b = (_a = refs.celebrities) == null ? void 0 : _a.current) == null ? void 0 : _b.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const selectCreatorSub = (v) => {
    var _a, _b;
    setCreatorSub(v);
    setActiveSector("celebrities");
    setCreatorsOpen(true);
    (_b = (_a = refs.celebrities) == null ? void 0 : _a.current) == null ? void 0 : _b.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const toggleFestivals = () => {
    var _a, _b;
    if (activeSector === "festivals") {
      setFestivalsOpen((v) => !v);
    } else {
      setActiveSector("festivals");
      setFestivalsOpen(true);
      setMusicOpen(false);
      setMoviesOpen(false);
      setCreatorsOpen(false);
      setGamingOpen(false);
      setStreamingOpen(false);
      setTrendsOpen(false);
      setTechOpen(false);
      setAttentionOpen(false);
    }
    (_b = (_a = refs.festivals) == null ? void 0 : _a.current) == null ? void 0 : _b.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const selectFestivalSub = (v) => {
    var _a, _b;
    setFestivalSub(v);
    setActiveSector("festivals");
    setFestivalsOpen(true);
    (_b = (_a = refs.festivals) == null ? void 0 : _a.current) == null ? void 0 : _b.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const toggleGaming = () => {
    var _a, _b;
    if (activeSector === "gaming") {
      setGamingOpen((v) => !v);
    } else {
      setActiveSector("gaming");
      setGamingOpen(true);
      setMusicOpen(false);
      setMoviesOpen(false);
      setCreatorsOpen(false);
      setFestivalsOpen(false);
      setStreamingOpen(false);
      setTrendsOpen(false);
      setTechOpen(false);
      setAttentionOpen(false);
    }
    (_b = (_a = refs.gaming) == null ? void 0 : _a.current) == null ? void 0 : _b.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const selectGamingSub = (v) => {
    var _a, _b;
    setGamingSub(v);
    setActiveSector("gaming");
    setGamingOpen(true);
    (_b = (_a = refs.gaming) == null ? void 0 : _a.current) == null ? void 0 : _b.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const toggleStreaming = () => {
    var _a, _b;
    if (activeSector === "streaming") {
      setStreamingOpen((v) => !v);
    } else {
      setActiveSector("streaming");
      setStreamingOpen(true);
      setMusicOpen(false);
      setMoviesOpen(false);
      setCreatorsOpen(false);
      setFestivalsOpen(false);
      setGamingOpen(false);
      setTrendsOpen(false);
      setTechOpen(false);
      setAttentionOpen(false);
    }
    (_b = (_a = refs.streaming) == null ? void 0 : _a.current) == null ? void 0 : _b.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const selectStreamingSub = (v) => {
    var _a, _b;
    setStreamingSub(v);
    setActiveSector("streaming");
    setStreamingOpen(true);
    (_b = (_a = refs.streaming) == null ? void 0 : _a.current) == null ? void 0 : _b.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const toggleTrends = () => {
    var _a, _b;
    if (activeSector === "trends") {
      setTrendsOpen((v) => !v);
    } else {
      setActiveSector("trends");
      setTrendsOpen(true);
      setMusicOpen(false);
      setMoviesOpen(false);
      setCreatorsOpen(false);
      setFestivalsOpen(false);
      setGamingOpen(false);
      setStreamingOpen(false);
      setTechOpen(false);
      setAttentionOpen(false);
    }
    (_b = (_a = refs.trends) == null ? void 0 : _a.current) == null ? void 0 : _b.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const selectTrendsSub = (v) => {
    var _a, _b;
    setTrendsSub(v);
    setActiveSector("trends");
    setTrendsOpen(true);
    (_b = (_a = refs.trends) == null ? void 0 : _a.current) == null ? void 0 : _b.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const toggleTech = () => {
    var _a, _b;
    if (activeSector === "tech") {
      setTechOpen((v) => !v);
    } else {
      setActiveSector("tech");
      setTechOpen(true);
      setMusicOpen(false);
      setMoviesOpen(false);
      setCreatorsOpen(false);
      setFestivalsOpen(false);
      setGamingOpen(false);
      setStreamingOpen(false);
      setTrendsOpen(false);
      setAttentionOpen(false);
    }
    (_b = (_a = refs.tech) == null ? void 0 : _a.current) == null ? void 0 : _b.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const selectTechSub = (v) => {
    var _a, _b;
    setTechSub(v);
    setActiveSector("tech");
    setTechOpen(true);
    (_b = (_a = refs.tech) == null ? void 0 : _a.current) == null ? void 0 : _b.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const active = markets.filter((m) => m.status === "active");
  const marketVol = active.reduce((s, m) => s + (m.total_volume || 0), 0);
  const globalVol = Number.isFinite(Number(pulse == null ? void 0 : pulse.paper_volume_traded)) ? Number(pulse.paper_volume_traded) : marketVol;
  const activeTraders = Number.isFinite(Number(pulse == null ? void 0 : pulse.users)) ? Number(pulse.users).toLocaleString("en-US") : "12,492";
  return /* @__PURE__ */ jsxs("div", { style: { background: PAGE_BG, minHeight: "100%" }, children: [
    /* @__PURE__ */ jsx("div", { className: "dbm-home-shell-wrap", children: /* @__PURE__ */ jsxs("div", { className: "dbm-home-shell", children: [
      /* @__PURE__ */ jsxs("aside", { style: { background: SIDEBAR_BG, flexShrink: 0, padding: "20px 16px", display: "flex", flexDirection: "column" }, children: [
        /* @__PURE__ */ jsxs("div", { style: { display: "inline-flex", alignItems: "center", gap: 7 }, children: [
          /* @__PURE__ */ jsx("span", { style: { width: 6, height: 6, borderRadius: 999, background: GREEN } }),
          /* @__PURE__ */ jsx("span", { style: { ...mono({ fontSize: 9, letterSpacing: "0.16em", color: WARM }) }, children: "LIVE FEED" })
        ] }),
        /* @__PURE__ */ jsx("div", { style: { color: "#FFFFFF", fontWeight: 800, fontSize: 15, letterSpacing: "0.02em", marginTop: 8, marginBottom: 20 }, children: "MARKETS" }),
        /* @__PURE__ */ jsxs("nav", { style: { display: "flex", flexDirection: "column", gap: 2 }, children: [
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsxs(
              "button",
              {
                onClick: toggleAttention,
                style: {
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  width: "100%",
                  background: activeSector === "attention" ? "#394666" : "transparent",
                  border: "none",
                  borderRadius: 6,
                  padding: "10px 11px",
                  cursor: "pointer",
                  textAlign: "left",
                  color: activeSector === "attention" ? "#DCE6F5" : WARM,
                  fontSize: 13,
                  fontWeight: activeSector === "attention" ? 700 : 500
                },
                children: [
                  /* @__PURE__ */ jsx(SectorIcon, { kind: "globe", color: activeSector === "attention" ? "#DCE6F5" : WARM }),
                  /* @__PURE__ */ jsx("span", { style: { flex: 1 }, children: "Global Attention" }),
                  /* @__PURE__ */ jsx(
                    "svg",
                    {
                      width: "12",
                      height: "12",
                      viewBox: "0 0 24 24",
                      fill: "none",
                      stroke: activeSector === "attention" ? "#DCE6F5" : WARM,
                      strokeWidth: "2",
                      strokeLinecap: "round",
                      strokeLinejoin: "round",
                      style: { transform: activeSector === "attention" && attentionOpen ? "rotate(180deg)" : "none", transition: "transform .15s ease", flexShrink: 0 },
                      children: /* @__PURE__ */ jsx("path", { d: "M6 9l6 6 6-6" })
                    }
                  )
                ]
              }
            ),
            activeSector === "attention" && attentionOpen && /* @__PURE__ */ jsx("div", { style: { display: "flex", flexDirection: "column", marginTop: 2 }, children: ATTENTION_SUBS.map((g) => {
              const genreActive = attentionSub === g;
              return /* @__PURE__ */ jsxs(
                "button",
                {
                  onClick: () => selectAttentionSub(g),
                  style: {
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    background: "none",
                    border: "none",
                    textAlign: "left",
                    cursor: "pointer",
                    padding: "7px 11px 7px 38px",
                    fontSize: 12.5,
                    color: genreActive ? GOLD_DIM : WARM,
                    fontWeight: genreActive ? 700 : 500
                  },
                  children: [
                    /* @__PURE__ */ jsx("span", { style: { width: 5, height: 5, borderRadius: 999, background: genreActive ? GOLD_DIM : "transparent", flexShrink: 0 } }),
                    g
                  ]
                },
                g
              );
            }) })
          ] }),
          SECTORS.map((s) => {
            const isActive = activeSector === s.id;
            const isMusic = s.id === "music";
            const isMovies = s.id === "movies";
            const isCreators = s.id === "celebrities";
            const isFestivals = s.id === "festivals";
            const isGaming = s.id === "gaming";
            const isStreaming = s.id === "streaming";
            const isTrends = s.id === "trends";
            const isTech = s.id === "tech";
            const hasDropdown = isMusic || isMovies || isCreators || isFestivals || isGaming || isStreaming || isTrends || isTech;
            const expanded = isActive && (isMusic && musicOpen || isMovies && moviesOpen || isCreators && creatorsOpen || isFestivals && festivalsOpen || isGaming && gamingOpen || isStreaming && streamingOpen || isTrends && trendsOpen || isTech && techOpen);
            const onClickHeader = isMusic ? toggleMusic : isMovies ? toggleMovies : isCreators ? toggleCreators : isFestivals ? toggleFestivals : isGaming ? toggleGaming : isStreaming ? toggleStreaming : isTrends ? toggleTrends : isTech ? toggleTech : () => goTo(s.id);
            const subItems = isMusic ? MUSIC_GENRES : isMovies ? MOVIES_PLATFORMS : isCreators ? CREATOR_SUBS : isFestivals ? FESTIVAL_SUBS : isGaming ? GAMING_SUBS : isStreaming ? STREAMING_SUBS : isTrends ? INTERNET_TRENDS_SUBS : isTech ? TECH_SUBS : null;
            const subActive = isMusic ? musicGenre : isMovies ? moviesPlatform : isCreators ? creatorSub : isFestivals ? festivalSub : isGaming ? gamingSub : isStreaming ? streamingSub : isTrends ? trendsSub : isTech ? techSub : null;
            const onSelectSub = isMusic ? selectGenre : isMovies ? selectPlatform : isCreators ? selectCreatorSub : isFestivals ? selectFestivalSub : isGaming ? selectGamingSub : isStreaming ? selectStreamingSub : isTrends ? selectTrendsSub : isTech ? selectTechSub : null;
            const iconSubs = isCreators ? CREATOR_SUB_ICONS : isFestivals ? FESTIVAL_SUB_ICONS : isGaming ? GAMING_SUB_ICONS : isStreaming ? STREAMING_SUB_ICONS : isTrends ? TRENDS_SUB_ICONS : isTech ? TECH_SUB_ICONS : null;
            return /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsxs(
                "button",
                {
                  onClick: onClickHeader,
                  style: {
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    width: "100%",
                    background: isActive ? "#394666" : "transparent",
                    border: "none",
                    borderRadius: 6,
                    padding: "10px 11px",
                    cursor: "pointer",
                    textAlign: "left",
                    color: isActive ? "#DCE6F5" : WARM,
                    fontSize: 13,
                    fontWeight: isActive ? 700 : 500
                  },
                  children: [
                    /* @__PURE__ */ jsx(SectorIcon, { kind: s.icon, color: isActive ? "#DCE6F5" : WARM }),
                    /* @__PURE__ */ jsx("span", { style: { flex: 1 }, children: s.label }),
                    hasDropdown && /* @__PURE__ */ jsx(
                      "svg",
                      {
                        width: "12",
                        height: "12",
                        viewBox: "0 0 24 24",
                        fill: "none",
                        stroke: isActive ? "#DCE6F5" : WARM,
                        strokeWidth: "2",
                        strokeLinecap: "round",
                        strokeLinejoin: "round",
                        style: { transform: expanded ? "rotate(180deg)" : "none", transition: "transform .15s ease", flexShrink: 0 },
                        children: /* @__PURE__ */ jsx("path", { d: "M6 9l6 6 6-6" })
                      }
                    )
                  ]
                }
              ),
              expanded && iconSubs && /* @__PURE__ */ jsx("div", { style: { display: "flex", flexDirection: "column", marginTop: 2 }, children: subItems.map((g) => {
                const genreActive = subActive === g;
                return /* @__PURE__ */ jsxs(
                  "button",
                  {
                    onClick: () => onSelectSub(g),
                    style: {
                      display: "flex",
                      alignItems: "center",
                      gap: 9,
                      background: genreActive ? "rgba(255,223,155,.08)" : "none",
                      border: "none",
                      textAlign: "left",
                      cursor: "pointer",
                      padding: "9px 11px",
                      margin: "0 6px",
                      borderRadius: 5,
                      fontSize: 13,
                      color: genreActive ? GOLD_DIM : WARM,
                      fontWeight: genreActive ? 700 : 500
                    },
                    children: [
                      /* @__PURE__ */ jsx(SectorIcon, { kind: iconSubs[g], color: genreActive ? GOLD_DIM : WARM, size: 13 }),
                      g
                    ]
                  },
                  g
                );
              }) }),
              expanded && !iconSubs && /* @__PURE__ */ jsx("div", { style: { display: "flex", flexDirection: "column", marginTop: 2 }, children: subItems.map((g) => {
                const genreActive = subActive === g;
                return /* @__PURE__ */ jsxs(
                  "button",
                  {
                    onClick: () => onSelectSub(g),
                    style: {
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      background: "none",
                      border: "none",
                      textAlign: "left",
                      cursor: "pointer",
                      padding: "7px 11px 7px 38px",
                      fontSize: 12.5,
                      color: genreActive ? GOLD_DIM : WARM,
                      fontWeight: genreActive ? 700 : 500
                    },
                    children: [
                      /* @__PURE__ */ jsx("span", { style: { width: 5, height: 5, borderRadius: 999, background: genreActive ? GOLD_DIM : "transparent", flexShrink: 0 } }),
                      g
                    ]
                  },
                  g
                );
              }) })
            ] }, s.id);
          })
        ] }),
        /* @__PURE__ */ jsx(
          "button",
          {
            onClick: () => navigate("/explore"),
            style: { marginTop: 24, background: GOLD, color: "#00132D", border: "none", borderRadius: 6, padding: "11px 0", fontWeight: 800, fontSize: 12.5, cursor: "pointer" },
            children: "Trade Now"
          }
        ),
        /* @__PURE__ */ jsxs("div", { style: { marginTop: "auto", paddingTop: 30, display: "flex", flexDirection: "column", gap: 2 }, children: [
          /* @__PURE__ */ jsxs("span", { style: { display: "flex", alignItems: "center", gap: 9, padding: "8px 11px", color: "#5C7391", fontSize: 12 }, children: [
            /* @__PURE__ */ jsx(SectorIcon, { kind: "life", color: "#5C7391", size: 13 }),
            " Support"
          ] }),
          /* @__PURE__ */ jsxs("span", { style: { display: "flex", alignItems: "center", gap: 9, padding: "8px 11px", color: "#5C7391", fontSize: 12 }, children: [
            /* @__PURE__ */ jsx(SectorIcon, { kind: "api", color: "#5C7391", size: 13 }),
            " API"
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("main", { style: { flex: 1, minWidth: 0, padding: "16px 22px 60px" }, children: [
        /* @__PURE__ */ jsxs("div", { className: "dbm-home-statrow", style: { display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap", marginBottom: 14 }, children: [
          /* @__PURE__ */ jsx(HomeTape, { markets }),
          /* @__PURE__ */ jsxs("span", { style: { display: "inline-flex", alignItems: "center", gap: 7, background: CARD_BG, border: `1px solid ${CARD_LINE}`, borderRadius: 4, padding: "7px 12px", flexShrink: 0 }, children: [
            /* @__PURE__ */ jsx("span", { style: { width: 6, height: 6, borderRadius: 999, background: GREEN } }),
            /* @__PURE__ */ jsx("span", { style: { ...mono({ fontSize: 9, letterSpacing: "0.08em", color: GREEN }) }, children: "RADAR NODE: ALL SYSTEMS GO" })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", gap: 40, flexWrap: "wrap", marginBottom: 28, paddingBottom: 16, borderBottom: `1px solid ${CARD_LINE}` }, children: [
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("div", { style: { ...mono({ fontSize: 9, letterSpacing: "0.1em", color: WARM }) }, children: "GLOBAL VOLUME" }),
            /* @__PURE__ */ jsxs("div", { style: { ...mono({ fontSize: 19, color: "#FFFFFF", letterSpacing: "0.01em" }), marginTop: 6 }, children: [
              "$",
              globalVol.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
            ] })
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("div", { style: { ...mono({ fontSize: 9, letterSpacing: "0.1em", color: WARM }) }, children: "ACTIVE TRADERS" }),
            /* @__PURE__ */ jsx("div", { style: { ...mono({ fontSize: 19, color: GREEN, letterSpacing: "0.01em" }), marginTop: 6 }, children: activeTraders })
          ] })
        ] }),
        /* @__PURE__ */ jsx("div", { style: { margin: "0 0 34px" }, children: /* @__PURE__ */ jsx(FeaturedCarousel, { markets }) }),
        /* @__PURE__ */ jsx(
          TwoCardSection,
          {
            sector: { id: "attention", icon: "globe", label: "Global Attention" },
            demo: GLOBAL_ATTENTION_DEMO,
            max: 4,
            title: "Trending Attention & News",
            pickReal: globalAttentionMarkets,
            markets,
            onOpen: (id) => navigate(`/markets/${id}`),
            onViewAll: () => navigate("/explore?filter=attention"),
            forwardRef: refs.attention
          }
        ),
        /* @__PURE__ */ jsx(MusicSection, { markets, genre: musicGenre, onOpen: (id) => navigate(`/markets/${id}`), onViewAll: () => navigate("/explore?filter=music"), forwardRef: refs.music }),
        /* @__PURE__ */ jsx(MoviesSection, { markets, platform: moviesPlatform, onOpen: (id) => navigate(`/markets/${id}`), onViewAll: () => navigate("/explore?filter=movies"), forwardRef: refs.movies }),
        /* @__PURE__ */ jsx(
          TwoCardSection,
          {
            sector: SECTORS.find((s) => s.id === "celebrities"),
            demo: creatorSub === "All Creators" ? CREATORS_DEMO : CREATOR_SUB_DEMO[creatorSub] || CREATORS_DEMO,
            max: 4,
            title: creatorSub === "All Creators" ? "Creators & Streamers" : `Creators & Streamers · ${creatorSub}`,
            pickReal: creatorSub === "All Creators" ? void 0 : (m) => creatorSubMarkets(m, creatorSub),
            markets,
            onOpen: (id) => navigate(`/markets/${id}`),
            onViewAll: () => navigate("/explore?filter=celebrities"),
            forwardRef: refs.celebrities
          }
        ),
        /* @__PURE__ */ jsx(
          TwoCardSection,
          {
            sector: SECTORS.find((s) => s.id === "festivals"),
            demo: festivalSub === "All Festivals" ? FESTIVALS_DEMO : FESTIVAL_SUB_DEMO[festivalSub] || FESTIVALS_DEMO,
            max: 4,
            title: festivalSub === "All Festivals" ? "Festival Markets" : `Festival Markets · ${festivalSub}`,
            pickReal: festivalSub === "All Festivals" ? void 0 : (m) => festivalSubMarkets(m, festivalSub),
            markets,
            onOpen: (id) => navigate(`/markets/${id}`),
            onViewAll: () => navigate("/explore?filter=festivals"),
            forwardRef: refs.festivals
          }
        ),
        /* @__PURE__ */ jsx(
          TwoCardSection,
          {
            sector: SECTORS.find((s) => s.id === "gaming"),
            demo: gamingSub === "All Gaming" ? GAMING_MARKETS_DEMO : GAMING_SUB_DEMO[gamingSub] || GAMING_MARKETS_DEMO,
            max: 4,
            title: gamingSub === "All Gaming" ? "Gaming Markets" : `Gaming Markets · ${gamingSub}`,
            pickReal: gamingSub === "All Gaming" ? void 0 : (m) => gamingSubMarkets(m, gamingSub),
            markets,
            onOpen: (id) => navigate(`/markets/${id}`),
            onViewAll: () => navigate("/explore?filter=gaming"),
            forwardRef: refs.gaming
          }
        ),
        /* @__PURE__ */ jsx(
          TwoCardSection,
          {
            sector: SECTORS.find((s) => s.id === "streaming"),
            demo: streamingSub === "All Streaming" ? STREAMING_DEMO : STREAMING_SUB_DEMO[streamingSub] || STREAMING_DEMO,
            max: 4,
            title: streamingSub === "All Streaming" ? "Streaming Markets" : `Streaming Markets · ${streamingSub}`,
            pickReal: streamingSub === "All Streaming" ? void 0 : (m) => streamingSubMarkets(m, streamingSub),
            markets,
            onOpen: (id) => navigate(`/markets/${id}`),
            onViewAll: () => navigate("/explore?filter=streaming"),
            forwardRef: refs.streaming
          }
        ),
        /* @__PURE__ */ jsx("div", { ref: refs.trends, style: { scrollMarginTop: 90 }, children: trendsSub === "Google Trends" ? /* @__PURE__ */ jsxs(Fragment, { children: [
          /* @__PURE__ */ jsx(
            TwoCardSection,
            {
              sector: { id: "trends", icon: "trend", label: "Viral Challenges" },
              demo: VIRAL_CHALLENGES_DEMO,
              max: 2,
              pickReal: viralChallengeMarkets,
              markets,
              onOpen: (id) => navigate(`/markets/${id}`),
              onViewAll: () => navigate("/explore?filter=trends")
            }
          ),
          /* @__PURE__ */ jsx(
            TwoCardSection,
            {
              sector: { id: "trends", icon: "bars", label: "Creator Milestones" },
              demo: CREATOR_MILESTONES_DEMO,
              max: 2,
              pickReal: creatorMilestoneMarkets,
              markets,
              onOpen: (id) => navigate(`/markets/${id}`),
              onViewAll: () => navigate("/explore?filter=trends")
            }
          )
        ] }) : /* @__PURE__ */ jsx(
          TwoCardSection,
          {
            sector: SECTORS.find((s) => s.id === "trends"),
            demo: TRENDS_PLATFORM_DEMO[trendsSub] || VIRAL_CHALLENGES_DEMO,
            max: 4,
            title: `Internet Trends · ${trendsSub}`,
            pickReal: (m) => trendsPlatformMarkets(m, trendsSub),
            markets,
            onOpen: (id) => navigate(`/markets/${id}`),
            onViewAll: () => navigate("/explore?filter=trends")
          }
        ) }),
        /* @__PURE__ */ jsx("div", { ref: refs.tech, style: { scrollMarginTop: 90 }, children: techSub === "All Tech" ? /* @__PURE__ */ jsxs(Fragment, { children: [
          /* @__PURE__ */ jsx(
            TwoCardSection,
            {
              sector: { id: "tech", icon: "hardware", label: "AI Model Benchmarks" },
              demo: AI_BENCHMARKS_DEMO,
              max: 2,
              pickReal: aiBenchmarkMarkets,
              markets,
              onOpen: (id) => navigate(`/markets/${id}`),
              onViewAll: () => navigate("/explore?filter=tech")
            }
          ),
          /* @__PURE__ */ jsx(
            TwoCardSection,
            {
              sector: { id: "tech", icon: "rocket", label: "Startup Funding & M&A" },
              demo: STARTUP_FUNDING_DEMO,
              max: 2,
              pickReal: startupFundingMarkets,
              markets,
              onOpen: (id) => navigate(`/markets/${id}`),
              onViewAll: () => navigate("/explore?filter=tech")
            }
          )
        ] }) : /* @__PURE__ */ jsx(
          TwoCardSection,
          {
            sector: SECTORS.find((s) => s.id === "tech"),
            demo: TECH_SUB_DEMO[techSub] || AI_BENCHMARKS_DEMO,
            max: 4,
            title: `Tech Startups & AI · ${techSub}`,
            pickReal: (m) => techSubMarkets(m, techSub),
            markets,
            onOpen: (id) => navigate(`/markets/${id}`),
            onViewAll: () => navigate("/explore?filter=tech")
          }
        ) })
      ] })
    ] }) }),
    /* @__PURE__ */ jsx(
      "button",
      {
        onClick: () => navigate("/explore"),
        style: {
          position: "fixed",
          right: 26,
          bottom: 26,
          width: 52,
          height: 52,
          borderRadius: 999,
          background: GOLD,
          border: "none",
          cursor: "pointer",
          zIndex: 40,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 10px 26px rgba(0,5,15,.5)"
        },
        title: "Quick trade",
        children: /* @__PURE__ */ jsx(SectorIcon, { kind: "bolt", color: "#00132D", size: 20 })
      }
    ),
    /* @__PURE__ */ jsx("style", { children: `
        .dbm-home-shell-wrap { max-width: 1400px; margin: 0 auto; }
        .dbm-home-shell { display: flex; align-items: flex-start; min-height: 100%; }
        .dbm-home-music-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; }
        .dbm-home-movies-grid { display: grid; grid-template-columns: 1fr; gap: 16px; }
        .dbm-home-two-grid { display: grid; grid-template-columns: 1fr; gap: 16px; }
        @media (min-width: 640px) { .dbm-home-music-grid { grid-template-columns: repeat(3, 1fr); } .dbm-home-two-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (min-width: 1024px) {
          .dbm-home-music-grid { grid-template-columns: repeat(4, 1fr); }
          .dbm-home-movies-grid { grid-template-columns: 1.6fr 1fr; }
        }
        @media (min-width: 768px) { .dbm-home-shell > aside { width: 220px; } }
        @media (max-width: 767px) {
          .dbm-home-shell { flex-direction: column; }
          .dbm-home-shell > aside { width: 100% !important; flex-direction: row !important; flex-wrap: wrap; align-items: center; }
          .dbm-home-shell > aside nav { flex-direction: row !important; flex-wrap: wrap; }
        }
      ` })
  ] });
}
class B extends React.Component {
  constructor(p) {
    super(p);
    this.state = { err: null };
  }
  static getDerivedStateFromError(err) {
    return { err };
  }
  render() {
    return this.state.err ? React.createElement("div", null, "CAUGHT") : this.props.children;
  }
}
async function once(label, fetchImpl) {
  var _a, _b, _c;
  const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { url: "https://dobium.com/" });
  global.window = dom.window;
  global.document = dom.window.document;
  global.HTMLElement = dom.window.HTMLElement;
  global.localStorage = dom.window.localStorage;
  global.fetch = fetchImpl;
  const orig = console.error;
  console.error = () => {
  };
  const ref = React.createRef();
  let out;
  try {
    createRoot(document.getElementById("root")).render(
      React.createElement(B, { ref }, React.createElement(MemoryRouter, null, React.createElement(LandingPage)))
    );
    await new Promise((r) => setTimeout(r, 1e3));
    const err = (_c = (_b = (_a = ref.current) == null ? void 0 : _a.state) == null ? void 0 : _b.err) == null ? void 0 : _c.message;
    const n = document.getElementById("root").innerHTML.length;
    out = err ? `CRASH ${label}: ${err}` : n > 500 ? `OK    ${label} (${n} chars)` : `BLANK ${label} (${n})`;
  } catch (e) {
    out = `THREW ${label}: ${e.message}`;
  }
  console.error = orig;
  return out;
}
async function run() {
  return [
    await once("api all-empty-array", async () => ({ ok: true, json: async () => [] })),
    await once("api rejects", async () => {
      throw new Error("offline");
    }),
    await once("pulse missing fields", async () => ({ ok: true, json: async () => ({}) })),
    await once("pulse good", async () => ({ ok: true, json: async () => ({ paper_volume_traded: 20029.08, users: 39 }) }))
  ];
}
export {
  run
};
