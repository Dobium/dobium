/**
 * backend/lib/digest-email.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Builds the personalised daily digest HTML email for a single user.
 * Layout mirrors the user dashboard: portfolio value, P&L change, forecasting
 * stats (predictions count, accuracy). No positions table.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const PLATFORM_URL = process.env.PLATFORM_URL || 'https://dobium.com';

function escHtml(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function fmtDollar(val) {
  return '$' + parseFloat(val || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtPnl(val) {
  const n = parseFloat(val || 0);
  const abs = Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return n >= 0 ? `+$${abs}` : `-$${abs}`;
}

/**
 * Build the HTML digest for a user.
 *
 * @param {Object} opts
 * @param {string}  opts.username          - display name (may be null)
 * @param {number}  opts.startingBalance   - paper trading starting balance (from DB, e.g. 10000)
 * @param {number}  opts.portfolioValue    - buyingPower + MTM of active positions (matches dashboard)
 * @param {number}  opts.buyingPower       - cash available (spendable)
 * @param {number}  opts.totalPnl          - portfolioValue − startingBalance (all-time change)
 * @param {number}  opts.totalPredictions  - total predictions ever placed
 * @param {number}  opts.wonCount          - resolved predictions that were won
 * @param {number}  opts.settledCount      - resolved predictions (won + lost)
 * @param {boolean} opts.hasEverTraded     - false = show "get started" CTA
 */
function buildDigestHtml({
  username,
  startingBalance,
  portfolioValue,
  buyingPower,
  totalPnl,
  totalPredictions,
  wonCount,
  settledCount,
  hasEverTraded,
  equityPoints,
  accuracyTrend = 0,
}) {
  const year = new Date().getFullYear();
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  const isProfit = totalPnl >= 0;
  const pnlColor = isProfit ? '#4ade80' : '#f87171';
  const pnlText = fmtPnl(totalPnl);
  const pnlPct = startingBalance > 0 ? ((totalPnl / startingBalance) * 100).toFixed(2) : '0.00';
  const pnlSign = isProfit ? '+' : '';
  const accuracyPct = settledCount > 0 ? Math.round((wonCount / settledCount) * 100) : 0;

  // Format Accuracy Trend
  const trendSign = accuracyTrend > 0 ? '+' : '';
  const trendColor = accuracyTrend > 0 ? '#4ade80' : '#f87171';
  const trendArrow = accuracyTrend > 0 ? '↑' : '↓';
  const trendText = Math.abs(accuracyTrend) >= 5
    ? `<span style="color:${trendColor};font-weight:700;">${trendArrow} ${trendSign}${Math.round(accuracyTrend)}%</span> from last wk`
    : `${wonCount}/${settledCount} resolved`;

  // ── "Get started" banner (no-trades users) ───────────────────────────────
  const noTradesBanner = !hasEverTraded ? `
        <!-- Get started banner -->
        <tr><td style="background:#0c1e40;padding:24px 32px;border-top:1px solid rgba(212,175,55,0.15);border-bottom:1px solid rgba(212,175,55,0.15);">
          <table width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td style="padding-right:16px;">
                <div style="font-size:16px;font-weight:700;color:#f1f5f9;margin-bottom:6px;">Ready to make your first trade?</div>
                <div style="font-size:13px;color:#94a3b8;line-height:1.7;">You have <strong style="color:#d4af37;">${fmtDollar(buyingPower)}</strong> in buying power ready to go. Explore live markets and place your first prediction — no real money, all the edge.</div>
              </td>
              <td style="text-align:right;vertical-align:middle;white-space:nowrap;">
                <a href="${PLATFORM_URL}/explore" style="display:inline-block;padding:12px 28px;background:linear-gradient(135deg,#b8952a,#d4af37);color:#0a0f1e;font-size:13px;font-weight:900;text-decoration:none;border-radius:8px;">Explore Markets →</a>
              </td>
            </tr>
          </table>
        </td></tr>` : '';

  let chartHtml = '';
  if (equityPoints && equityPoints.length >= 2) {
    function downsample(points, max) {
      if (!points || points.length <= max) return points;
      const result = [];
      const step = (points.length - 1) / (max - 1);
      for (let i = 0; i < max; i++) {
        result.push(points[Math.round(i * step)]);
      }
      return result;
    }

    const sampledPoints = downsample(equityPoints, 40);
    const dataValues = sampledPoints.map(p => parseFloat(p.value).toFixed(2));
    const labels = sampledPoints.map(() => "''");

    const colorHex = isProfit ? '4ade80' : 'f87171';
    const fillHex = isProfit ? 'rgba(74, 222, 128, 0.15)' : 'rgba(248, 113, 113, 0.15)';

    const chartConfig = {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          data: dataValues,
          borderColor: `#${colorHex}`,
          backgroundColor: fillHex,
          borderWidth: 3,
          fill: true,
          pointRadius: 0,
          lineTension: 0.4
        }]
      },
      options: {
        legend: { display: false },
        scales: {
          xAxes: [{ display: false, gridLines: { display: false } }],
          yAxes: [{ display: false, gridLines: { display: false } }]
        },
        layout: { padding: { top: 10, bottom: 10, left: 0, right: 0 } },
        plugins: {
          datalabels: { display: false }
        }
      }
    };

    const chartUrl = `https://quickchart.io/chart?w=600&h=200&bkg=071428&c=${encodeURIComponent(JSON.stringify(chartConfig))}`;

    chartHtml = `
      <!-- Portfolio Chart -->
      <tr><td style="background:#071428;padding:0 32px 10px;">
        <img src="${chartUrl}" alt="Equity Chart" style="width:100%; height:auto; border-radius:12px; display:block; border: 1px solid #1e3a5f;" />
      </td></tr>
    `;
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>Your Dobium Daily Digest — ${today}</title>
</head>
<body style="margin:0;padding:0;background-color:#0a0f1e;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#0a0f1e;padding:32px 16px 48px;">
    <tr><td align="center">

      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;border-radius:16px;overflow:hidden;border:1px solid rgba(212,175,55,0.2);box-shadow:0 0 48px rgba(212,175,55,0.06);">

        <!-- Gold top bar -->
        <tr><td style="height:4px;background:linear-gradient(90deg,#7a5c10,#b8952a,#d4af37,#f0cc6a,#d4af37,#b8952a,#7a5c10);font-size:0;line-height:0;">&nbsp;</td></tr>

        <!-- Logo -->
        <tr><td align="center" style="padding:20px 32px 18px;background-color:#071428;">
          <img src="${PLATFORM_URL}/Logo-Title.png" alt="Dobium" width="130" style="display:block;height:auto;border:0;margin:0 auto;" />
        </td></tr>

        <!-- Hero / Greeting -->
        <tr><td align="center" style="padding:30px 32px 24px;background:linear-gradient(160deg,#0c1e40 0%,#071428 60%,#04101f 100%);">
          <div style="width:48px;height:48px;border-radius:12px;background:rgba(212,175,55,0.1);border:1.5px solid rgba(212,175,55,0.4);margin:0 auto 16px;text-align:center;line-height:48px;font-size:22px;">📊</div>
          <h1 style="margin:0 0 6px;font-size:22px;font-weight:900;color:#f1f5f9;line-height:1.2;">Your Daily Digest</h1>
          <p style="margin:0;font-size:13px;color:#64748b;">${today}</p>
        </td></tr>

        <!-- Greeting text -->
        <tr><td style="background:#0a1628;padding:20px 32px;border-top:1px solid rgba(212,175,55,0.1);border-bottom:1px solid rgba(212,175,55,0.1);">
          ${username ? `<p style="margin:0 0 6px;font-size:15px;font-weight:600;color:#f1f5f9;">Hey ${escHtml(username)},</p>` : ''}
          <p style="margin:0;font-size:13px;color:#94a3b8;line-height:1.7;">Here's a snapshot of your Dobium portfolio as of today. ${hasEverTraded ? 'Keep making sharp predictions.' : "You haven't placed a trade yet — your buying power is waiting."}</p>
        </td></tr>

        <!-- Portfolio Value (mirrors dashboard hero number) -->
        <tr><td style="background:#071428;padding:28px 32px 20px;">
          <p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#475569;">Portfolio Value</p>
          <p style="margin:0 0 6px;font-size:36px;font-weight:900;color:#f1f5f9;line-height:1;">${fmtDollar(portfolioValue)}</p>
          <p style="margin:0;font-size:14px;font-weight:600;color:${pnlColor};">
            ${pnlSign}${fmtDollar(totalPnl).replace(/^\+/, '')} &nbsp;(${pnlSign}${pnlPct}%) &nbsp;<span style="font-size:11px;font-weight:400;color:#475569;">All Time</span>
          </p>
        </td></tr>

    ${chartHtml}

        <!-- Stats row (3 cards matching dashboard Forecasting Stats) -->
        <tr><td style="background:#071428;padding:0 32px 28px;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #1e3a5f;border-radius:12px;overflow:hidden;background:#0a1628;">
            <tr>
              <!-- Buying Power -->
              <td style="text-align:center;padding:18px 8px;border-right:1px solid #1e3a5f;">
                <div style="font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#475569;margin-bottom:8px;">Buying Power</div>
                <div style="font-size:22px;font-weight:900;color:#d4af37;">${fmtDollar(buyingPower)}</div>
                <div style="font-size:10px;color:#334155;margin-top:4px;">Available cash</div>
              </td>
              <!-- Predictions -->
              <td style="text-align:center;padding:18px 8px;border-right:1px solid #1e3a5f;">
                <div style="font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#475569;margin-bottom:8px;">Predictions</div>
                <div style="font-size:22px;font-weight:900;color:#d4af37;">${totalPredictions}</div>
                <div style="font-size:10px;color:#334155;margin-top:4px;">Total placed</div>
              </td>
              <!-- Accuracy -->
              <td style="text-align:center;padding:18px 8px;">
                <div style="font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#475569;margin-bottom:8px;">Accuracy</div>
                <div style="font-size:22px;font-weight:900;color:#4ade80;">${accuracyPct}%</div>
                <div style="font-size:10px;color:#475569;margin-top:4px;">${trendText}</div>
              </td>
            </tr>
          </table>
        </td></tr>

        ${noTradesBanner}

        <!-- CTA -->
        <tr><td align="center" style="background:#071428;padding:24px 32px 36px;">
          <a href="${PLATFORM_URL}/dashboard" style="display:inline-block;padding:14px 48px;background:linear-gradient(135deg,#b8952a 0%,#d4af37 50%,#e8c645 100%);color:#0a0f1e;font-size:14px;font-weight:900;text-decoration:none;border-radius:10px;letter-spacing:0.3px;box-shadow:0 4px 20px rgba(212,175,55,0.3);">Review Your Predictions →</a>
        </td></tr>

        <!-- Footer -->
        <tr><td align="center" style="padding:22px 32px 24px;background:#04101f;border-top:1px solid rgba(255,255,255,0.04);">
          <p style="margin:0 0 4px;font-size:11px;color:#334155;">© ${year} Dobium · All rights reserved.</p>
          <p style="margin:0;font-size:10px;color:#1e293b;line-height:1.6;">You receive this daily digest as a registered Dobium user.<br/>Sent every day at 12 PM CT.</p>
        </td></tr>

        <!-- Gold bottom bar -->
        <tr><td style="height:3px;background:linear-gradient(90deg,#7a5c10,#b8952a,#d4af37,#f0cc6a,#d4af37,#b8952a,#7a5c10);font-size:0;line-height:0;">&nbsp;</td></tr>

      </table>

    </td></tr>
  </table>
</body>
</html>`;
}

module.exports = { buildDigestHtml };