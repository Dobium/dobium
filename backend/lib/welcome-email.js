/**
 * backend/lib/welcome-email.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Builds the branded welcome email sent to a new user after they confirm
 * their email address (or immediately after Google OAuth signup).
 * ─────────────────────────────────────────────────────────────────────────────
 */

const PLATFORM_URL = process.env.PLATFORM_URL || 'https://dobium.com';

function escHtml(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/**
 * Build the HTML welcome email for a new user.
 *
 * @param {Object} opts
 * @param {string} opts.username  - display name (may be null)
 * @param {string} opts.email     - recipient email
 */
function buildWelcomeHtml({ username, email }) {
  const year = new Date().getFullYear();
  const greeting = username ? `Hey ${escHtml(username)},` : 'Welcome aboard,';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>Welcome to Dobium</title>
</head>
<body style="margin:0;padding:0;background-color:#0a0f1e;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#0a0f1e;padding:32px 16px 48px;">
    <tr><td align="center">

      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;border-radius:16px;overflow:hidden;border:1px solid rgba(212,175,55,0.2);box-shadow:0 0 48px rgba(212,175,55,0.06);">

        <!-- Gold top bar -->
        <tr><td style="height:4px;background:linear-gradient(90deg,#7a5c10,#b8952a,#d4af37,#f0cc6a,#d4af37,#b8952a,#7a5c10);font-size:0;line-height:0;">&nbsp;</td></tr>

        <!-- Logo -->
        <tr><td align="center" style="padding:24px 32px 20px;background-color:#071428;">
          <img src="${PLATFORM_URL}/Logo-Title.png" alt="Dobium" width="130" style="display:block;height:auto;border:0;margin:0 auto;" />
        </td></tr>

        <!-- Hero -->
        <tr><td align="center" style="padding:36px 32px 28px;background:linear-gradient(160deg,#0c1e40 0%,#071428 60%,#04101f 100%);">
          <div style="width:56px;height:56px;border-radius:14px;background:rgba(212,175,55,0.12);border:1.5px solid rgba(212,175,55,0.5);margin:0 auto 18px;text-align:center;line-height:56px;font-size:26px;">🎉</div>
          <h1 style="margin:0 0 10px;font-size:26px;font-weight:900;color:#f1f5f9;line-height:1.2;">Welcome to Dobium!</h1>
          <p style="margin:0;font-size:14px;color:#64748b;line-height:1.6;">Your account is confirmed and ready to go.</p>
        </td></tr>

        <!-- Greeting -->
        <tr><td style="background:#0a1628;padding:24px 32px;border-top:1px solid rgba(212,175,55,0.1);border-bottom:1px solid rgba(212,175,55,0.1);">
          <p style="margin:0 0 10px;font-size:16px;font-weight:700;color:#f1f5f9;">${greeting}</p>
          <p style="margin:0;font-size:13px;color:#94a3b8;line-height:1.8;">
            You've successfully joined <strong style="color:#d4af37;">Dobium Prediction Markets</strong> — the platform where your knowledge pays off.
            You start with <strong style="color:#d4af37;">$10,000 in paper trading credit</strong> to explore live markets, place predictions, and track your P&amp;L in real time.
          </p>
        </td></tr>

        <!-- What's next cards -->
        <tr><td style="background:#071428;padding:28px 32px;">
          <p style="margin:0 0 18px;font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#475569;">Get Started</p>
          <table width="100%" cellpadding="0" cellspacing="0" border="0">

            <tr>
              <td style="padding:0 8px 16px 0;width:50%;vertical-align:top;">
                <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#0a1628;border:1px solid #1e3a5f;border-radius:10px;padding:16px;">
                  <tr><td>
                    <div style="font-size:20px;margin-bottom:8px;">📈</div>
                    <div style="font-size:13px;font-weight:700;color:#f1f5f9;margin-bottom:6px;">Explore Markets</div>
                    <div style="font-size:12px;color:#64748b;line-height:1.6;">Browse live prediction markets across sports, politics, tech, and more.</div>
                  </td></tr>
                </table>
              </td>
              <td style="padding:0 0 16px 8px;width:50%;vertical-align:top;">
                <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#0a1628;border:1px solid #1e3a5f;border-radius:10px;padding:16px;">
                  <tr><td>
                    <div style="font-size:20px;margin-bottom:8px;">💰</div>
                    <div style="font-size:13px;font-weight:700;color:#f1f5f9;margin-bottom:6px;">Place Predictions</div>
                    <div style="font-size:12px;color:#64748b;line-height:1.6;">Put your $10,000 paper credit to work. Buy positions and earn on accurate calls.</div>
                  </td></tr>
                </table>
              </td>
            </tr>

            <tr>
              <td style="padding:0 8px 0 0;width:50%;vertical-align:top;">
                <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#0a1628;border:1px solid #1e3a5f;border-radius:10px;padding:16px;">
                  <tr><td>
                    <div style="font-size:20px;margin-bottom:8px;">📊</div>
                    <div style="font-size:13px;font-weight:700;color:#f1f5f9;margin-bottom:6px;">Track Your P&amp;L</div>
                    <div style="font-size:12px;color:#64748b;line-height:1.6;">Watch your portfolio in real time. See wins, losses, and overall performance.</div>
                  </td></tr>
                </table>
              </td>
              <td style="padding:0 0 0 8px;width:50%;vertical-align:top;">
                <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#0a1628;border:1px solid #1e3a5f;border-radius:10px;padding:16px;">
                  <tr><td>
                    <div style="font-size:20px;margin-bottom:8px;">🏆</div>
                    <div style="font-size:13px;font-weight:700;color:#f1f5f9;margin-bottom:6px;">Climb the Leaderboard</div>
                    <div style="font-size:12px;color:#64748b;line-height:1.6;">Compete with other traders. The best predictors rise to the top.</div>
                  </td></tr>
                </table>
              </td>
            </tr>

          </table>
        </td></tr>

        <!-- CTA -->
        <tr><td align="center" style="background:#071428;padding:28px 32px 36px;">
          <a href="${PLATFORM_URL}/explore" style="display:inline-block;padding:14px 48px;background:linear-gradient(135deg,#b8952a 0%,#d4af37 50%,#e8c645 100%);color:#0a0f1e;font-size:14px;font-weight:900;text-decoration:none;border-radius:10px;letter-spacing:0.3px;box-shadow:0 4px 20px rgba(212,175,55,0.3);">Start Trading →</a>
        </td></tr>

        <!-- Footer -->
        <tr><td align="center" style="padding:22px 32px 24px;background:#04101f;border-top:1px solid rgba(255,255,255,0.04);">
          <p style="margin:0 0 4px;font-size:11px;color:#334155;">© ${year} Dobium · All rights reserved.</p>
          <p style="margin:0;font-size:10px;color:#1e293b;line-height:1.6;">You received this email because you created an account at dobium.com.</p>
        </td></tr>

        <!-- Gold bottom bar -->
        <tr><td style="height:3px;background:linear-gradient(90deg,#7a5c10,#b8952a,#d4af37,#f0cc6a,#d4af37,#b8952a,#7a5c10);font-size:0;line-height:0;">&nbsp;</td></tr>

      </table>

    </td></tr>
  </table>
</body>
</html>`;
}

module.exports = { buildWelcomeHtml };
