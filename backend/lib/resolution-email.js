/**
 * backend/lib/resolution-email.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Builds the HTML email sent to users when a market they traded in resolves.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const PLATFORM_URL = process.env.PLATFORM_URL || 'https://dobium.com';

function escHtml(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function fmtDollar(val) {
  return '$' + parseFloat(val || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function buildResolutionHtml({ username, marketTitle, marketId, outcomeTitle, won, stake, actualReturn, pnl, newBalance, feedback }) {
  const year = new Date().getFullYear();
  const greeting = username ? `Hey ${escHtml(username)},` : 'Hey there,';
  const resultText = won ? 'Won' : 'Lost';
  const resultColor = won ? '#4ade80' : '#f87171';
  const icon = won ? '🎉' : '📉';
  const pnlText = pnl >= 0 ? `+${fmtDollar(pnl)}` : `-${fmtDollar(Math.abs(pnl))}`;

  const marketLink = marketId ? `${PLATFORM_URL}/markets/${marketId}` : `${PLATFORM_URL}/`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>Prediction ${resultText} - ${escHtml(marketTitle)}</title>
</head>
<body style="margin:0;padding:0;background-color:#0a0f1e;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#0a0f1e;padding:32px 16px 48px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;border-radius:16px;overflow:hidden;border:1px solid rgba(212,175,55,0.2);box-shadow:0 0 48px rgba(212,175,55,0.06);">
        <tr><td style="height:4px;background:linear-gradient(90deg,#7a5c10,#b8952a,#d4af37,#f0cc6a,#d4af37,#b8952a,#7a5c10);font-size:0;line-height:0;">&nbsp;</td></tr>
        <tr><td align="center" style="padding:24px 32px 20px;background-color:#071428;">
          <img src="${PLATFORM_URL}/Logo-Title.png" alt="Dobium" width="130" style="display:block;height:auto;border:0;margin:0 auto;" />
        </td></tr>
        <tr><td align="center" style="padding:36px 32px 28px;background:linear-gradient(160deg,#0c1e40 0%,#071428 60%,#04101f 100%);">
          <div style="width:56px;height:56px;border-radius:14px;background:rgba(212,175,55,0.12);border:1.5px solid rgba(212,175,55,0.5);margin:0 auto 18px;text-align:center;line-height:56px;font-size:26px;">${icon}</div>
          <h1 style="margin:0 0 10px;font-size:24px;font-weight:900;color:#f1f5f9;line-height:1.2;">Prediction ${resultText}</h1>
          <p style="margin:0;font-size:14px;color:#64748b;line-height:1.6;">The market has resolved.</p>
        </td></tr>
        <tr><td style="background:#0a1628;padding:24px 32px;border-top:1px solid rgba(212,175,55,0.1);border-bottom:1px solid rgba(212,175,55,0.1);">
          <p style="margin:0 0 10px;font-size:16px;font-weight:700;color:#f1f5f9;">${greeting}</p>
          <p style="margin:0;font-size:13px;color:#94a3b8;line-height:1.8;">
            Your position in <strong style="color:#d4af37;">${escHtml(marketTitle)}</strong> on the outcome <strong style="color:#f1f5f9;">${escHtml(outcomeTitle)}</strong> has resolved as a <strong style="color:${resultColor};">${resultText}</strong>.
          </p>
        </td></tr>
        <tr><td style="background:#071428;padding:28px 32px;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #1e3a5f;border-radius:12px;overflow:hidden;background:#0a1628;">
            <tr>
              <td style="padding:16px;border-bottom:1px solid rgba(212,175,55,0.1);">
                <div style="font-size:12px;color:#64748b;margin-bottom:4px;">Stake</div>
                <div style="font-size:16px;font-weight:700;color:#f1f5f9;">${fmtDollar(stake)}</div>
              </td>
              <td style="padding:16px;border-bottom:1px solid rgba(212,175,55,0.1);border-left:1px solid rgba(212,175,55,0.1);">
                <div style="font-size:12px;color:#64748b;margin-bottom:4px;">Return</div>
                <div style="font-size:16px;font-weight:700;color:${resultColor};">${fmtDollar(actualReturn)}</div>
              </td>
            </tr>
            <tr>
              <td colspan="2" style="padding:16px;text-align:center;">
                <div style="font-size:12px;color:#64748b;margin-bottom:4px;">Net P&amp;L</div>
                <div style="font-size:18px;font-weight:900;color:${resultColor};">${pnlText}</div>
              </td>
            </tr>
            ${newBalance !== undefined ? `
            <tr>
              <td colspan="2" style="padding:12px 16px;text-align:center;background:#0c1e40;border-top:1px solid rgba(212,175,55,0.1);">
                <div style="font-size:12px;color:#94a3b8;">New Buying Power: <strong style="color:#d4af37;">${fmtDollar(newBalance)}</strong></div>
              </td>
            </tr>
            ` : ''}
            ${feedback ? `
            <tr>
              <td colspan="2" style="padding:16px;background:rgba(212,175,55,0.06);border-top:1px solid rgba(212,175,55,0.1);">
                <p style="margin: 0; color: #d4af37; font-size: 13px; font-weight: 600; margin-bottom: 4px;">Trade Feedback 💡</p>
                <p style="margin: 0; color: #cbd5e1; font-size: 13px; line-height: 1.5;">${escHtml(feedback)}</p>
              </td>
            </tr>
            ` : ''}
          </table>
        </td></tr>
        <tr><td align="center" style="background:#071428;padding:12px 32px 36px;">
          <a href="${marketLink}" style="display:inline-block;padding:14px 48px;background:linear-gradient(135deg,#b8952a 0%,#d4af37 50%,#e8c645 100%);color:#0a0f1e;font-size:14px;font-weight:900;text-decoration:none;border-radius:10px;letter-spacing:0.3px;box-shadow:0 4px 20px rgba(212,175,55,0.3);">View Market →</a>
        </td></tr>
        <tr><td align="center" style="padding:22px 32px 24px;background:#04101f;border-top:1px solid rgba(255,255,255,0.04);">
          <p style="margin:0 0 4px;font-size:11px;color:#334155;">© ${year} Dobium · All rights reserved.</p>
        </td></tr>
        <tr><td style="height:3px;background:linear-gradient(90deg,#7a5c10,#b8952a,#d4af37,#f0cc6a,#d4af37,#b8952a,#7a5c10);font-size:0;line-height:0;">&nbsp;</td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

module.exports = { buildResolutionHtml };