/**
 * send-iceman-launch.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Broadcast email: "New live markets now open for Drake's Iceman"
 *
 * Usage:
 *   node backend/scripts/send-iceman-launch.js             (dry-run — print list)
 *   node backend/scripts/send-iceman-launch.js --send      (live send)
 *
 * Requires .env with: EMAIL_USER, EMAIL_PASS,
 *                      SUPABASE_URL / VITE_SUPABASE_URL,
 *                      SUPABASE_SERVICE_ROLE_KEY
 * ─────────────────────────────────────────────────────────────────────────────
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });
const { createClient } = require('@supabase/supabase-js');
const { sendEmail } = require('../lib/email');

const LIVE_SEND = process.argv.includes('--send');

const ADMIN_EMAIL = 'donotreply.dobium@gmail.com';
const PLATFORM_URL = 'https://dobium.up.railway.app';

// ── Skip list ─────────────────────────────────────────────────────────────────
const SKIP_EMAILS = new Set([
  ADMIN_EMAIL,
  'peepeeeepooopoo@gmail.com',
  'hebdhdbdbsbhbbbhhdhdhsh@gmail.com',
]);

// ── Email copy ────────────────────────────────────────────────────────────────
const SUBJECT = "New live markets now open for Drake's Iceman 📊";

const HERO_HEADING = "Drake's Iceman — Live Markets Are Open";
const HERO_SUB    = "The album dropped. The data is moving. Be first to trade it.";

const INTRO = `Drake's <strong>Iceman</strong> is officially out — and real performance data is already shaping up.`;

const MARKET_QUESTIONS = [
  { emoji: "📦", label: "First-Week Sales",   question: "How many units will <em>Iceman</em> sell in its first week?" },
  { emoji: "🎧", label: "Streaming Record",   question: "Will <em>Iceman</em> break the 24-hour streaming record?" },
  { emoji: "🎤", label: "Featured Artists",   question: "Who will be featured on <em>Iceman</em>?" },
];

const BODY_CLOSING = `These markets close soon — prices will move as more data comes in. The earlier you trade, the more edge you have.`;

const CTA_LABEL = 'Start Trading →';
const CTA_URL   = `${PLATFORM_URL}/explore`;

// ── HTML builder ──────────────────────────────────────────────────────────────
function buildHtml(username) {
  const year = new Date().getFullYear();

  const questionsHtml = MARKET_QUESTIONS.map(q => `
    <tr>
      <td style="padding: 12px 16px; border-bottom: 1px solid #1e3a5f;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td width="36" style="vertical-align:top; padding-top:2px;">
              <div style="width:28px;height:28px;border-radius:6px;background:rgba(212,175,55,0.12);border:1px solid rgba(212,175,55,0.3);text-align:center;line-height:28px;font-size:14px;">${q.emoji}</div>
            </td>
            <td style="padding-left:10px;">
              <div style="font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#d4af37;margin-bottom:2px;">${q.label}</div>
              <div style="font-size:13px;color:#cbd5e1;line-height:1.5;">${q.question}</div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  `).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>${SUBJECT}</title>
</head>
<body style="margin:0;padding:0;background-color:#0a0f1e;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#0a0f1e;padding:32px 16px 48px;">
    <tr><td align="center">

      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;border-radius:16px;overflow:hidden;border:1px solid rgba(212,175,55,0.2);box-shadow:0 0 48px rgba(212,175,55,0.06);">

        <!-- ── Gold top bar ── -->
        <tr><td style="height:4px;background:linear-gradient(90deg,#7a5c10,#b8952a,#d4af37,#f0cc6a,#d4af37,#b8952a,#7a5c10);font-size:0;line-height:0;">&nbsp;</td></tr>

        <!-- ── Logo header ── -->
        <tr><td align="center" style="padding:20px 32px 18px;background-color:#071428;">
          <img src="${PLATFORM_URL}/Logo-Title.png" alt="Dobium" width="130" style="display:block;height:auto;border:0;margin:0 auto;" />
        </td></tr>

        <!-- ── HERO ── -->
        <tr><td align="center" style="padding:36px 32px 32px;background:linear-gradient(160deg,#0c1e40 0%,#071428 60%,#04101f 100%);">
          <!-- Ice/chart icon -->
          <div style="width:56px;height:56px;border-radius:14px;background:rgba(212,175,55,0.1);border:1.5px solid rgba(212,175,55,0.4);margin:0 auto 20px;text-align:center;line-height:56px;font-size:26px;">📊</div>
          <h1 style="margin:0 0 8px;font-size:24px;font-weight:900;color:#f1f5f9;line-height:1.2;letter-spacing:-0.5px;">${HERO_HEADING}</h1>
          <p style="margin:0;font-size:13px;color:#64748b;line-height:1.6;max-width:380px;">${HERO_SUB}</p>
        </td></tr>

        <!-- ── Intro band ── -->
        <tr><td style="background:#0a1628;padding:22px 32px;border-top:1px solid rgba(212,175,55,0.1);border-bottom:1px solid rgba(212,175,55,0.1);">
          ${username ? `<p style="margin:0 0 8px;font-size:15px;font-weight:600;color:#f1f5f9;">Hey ${username},</p>` : ''}
          <p style="margin:0;font-size:14px;color:#94a3b8;line-height:1.8;">${INTRO}</p>
          <p style="margin:12px 0 0;font-size:14px;color:#94a3b8;line-height:1.8;">We've opened a set of short-term prediction markets on <strong style="color:#d4af37;">Dobium</strong> so you can track what happens next in real time.</p>
        </td></tr>

        <!-- ── Market questions ── -->
        <tr><td style="background:#071428;padding:20px 32px 4px;">
          <p style="margin:0 0 12px;font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#475569;">Right now, you can trade on</p>
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #1e3a5f;border-radius:10px;overflow:hidden;background:#0a1628;">
            ${questionsHtml}
          </table>
        </td></tr>

        <!-- ── Closing copy ── -->
        <tr><td style="background:#071428;padding:20px 32px 8px;">
          <p style="margin:0;font-size:13px;color:#64748b;line-height:1.8;">${BODY_CLOSING}</p>
        </td></tr>

        <!-- ── CTA ── -->
        <tr><td align="center" style="background:#071428;padding:28px 32px 36px;">
          <p style="margin:0 0 18px;font-size:13px;color:#64748b;">You can view and trade all live markets on Dobium</p>
          <a href="${CTA_URL}" style="display:inline-block;padding:15px 52px;background:linear-gradient(135deg,#b8952a 0%,#d4af37 50%,#e8c645 100%);color:#0a0f1e;font-size:15px;font-weight:900;text-decoration:none;border-radius:10px;letter-spacing:0.3px;box-shadow:0 4px 20px rgba(212,175,55,0.3);">${CTA_LABEL}</a>
        </td></tr>

        <!-- ── Footer ── -->
        <tr><td align="center" style="padding:22px 32px 24px;background:#04101f;border-top:1px solid rgba(255,255,255,0.04);">
          <p style="margin:0 0 4px;font-size:11px;color:#334155;">© ${year} Dobium &middot; All rights reserved.</p>
          <p style="margin:0;font-size:10px;color:#1e293b;line-height:1.6;">You received this because you are a registered user of Dobium Prediction Markets.<br/>This is an automated platform update.</p>
        </td></tr>

        <!-- ── Gold bottom bar ── -->
        <tr><td style="height:3px;background:linear-gradient(90deg,#7a5c10,#b8952a,#d4af37,#f0cc6a,#d4af37,#b8952a,#7a5c10);font-size:0;line-height:0;">&nbsp;</td></tr>

      </table>

    </td></tr>
  </table>
</body>
</html>`;
}

// ── Plain-text fallback ────────────────────────────────────────────────────────
const PLAIN_TEXT = `
Drake's Iceman is officially out — and the first wave of real performance data is already shaping up.

We've opened a set of short-term prediction markets on Dobium so you can track what happens next in real time.

Right now, you can trade on questions like:

  📦 First-Week Sales — How many units will Iceman sell in its first week?
  🎧 Streaming Record — Will Iceman break the 24-hour streaming record?
  🎤 Featured Artists — Who will be featured on Iceman?

These markets close soon — prices will move as more data comes in. The earlier you trade, the more edge you have.

View and trade all live markets:
${CTA_URL}

──
© ${new Date().getFullYear()} Dobium · All rights reserved.
You received this because you are a registered user of Dobium Prediction Markets.
`.trim();

// ── Main ──────────────────────────────────────────────────────────────────────
async function run() {
  console.log('\n🚀 Dobium — Iceman Launch Broadcast\n');
  console.log(`Mode: ${LIVE_SEND ? '📤 LIVE SEND' : '🔍 DRY-RUN (add --send to actually send)'}\n`);

  const supabase = createClient(
    process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { data, error } = await supabase.auth.admin.listUsers();
  if (error) {
    console.error('❌ Failed to fetch users:', error.message);
    process.exit(1);
  }

  const recipients = data.users
    .filter(u => u.email && !SKIP_EMAILS.has(u.email))
    .map(u => ({
      email: u.email,
      username: u.user_metadata?.name || u.user_metadata?.full_name || null
    }));

  console.log(`📬 Recipients: ${recipients.length} (${SKIP_EMAILS.size} skipped)\n`);
  recipients.forEach(r => console.log(`  • ${r.email}${r.username ? ` (${r.username})` : ''}`));
  console.log('');

  if (!LIVE_SEND) {
    console.log('ℹ️  Dry-run complete. Run with --send to deliver.\n');
    return;
  }

  let sent = 0, failed = 0;
  for (const recipient of recipients) {
    try {
      await sendEmail({
        to: recipient.email,
        subject: SUBJECT,
        text: PLAIN_TEXT,
        html: buildHtml(recipient.username)
      });
      console.log(`  ✅ ${recipient.email}`);
      sent++;
      await new Promise(r => setTimeout(r, 700)); // rate-limit buffer
    } catch (err) {
      console.error(`  ❌ ${recipient.email} — ${err.message}`);
      failed++;
    }
  }

  console.log(`\n📊 Done — ${sent} sent, ${failed} failed.\n`);
}

run();
