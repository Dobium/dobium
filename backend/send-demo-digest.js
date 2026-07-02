require('dotenv').config();
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { sendEmail } = require('./lib/email');
const { buildDigestHtml } = require('./lib/digest-email');
const { User, Transaction, Prediction, Outcome, Market } = require('./lib/database/models');
const { getUserStats } = require('./jobs/daily-digest');

async function sendDemo() {
  try {
    const targetEmail = 'abhi.annavajahula@gmail.com';
    console.log(`[1/3] Fetching stats for ${targetEmail}...`);

    let user = await User.findOne({ where: { email: targetEmail } });
    const targetId = user ? user.id : targetEmail;
    const username = user ? (user.username || user.email.split('@')[0]) : 'Abhi';

    const stats = await getUserStats(targetId, { User, Transaction, Prediction, Outcome, Market });

    console.log(`[2/3] Building HTML template...`);
    const html = buildDigestHtml({
      username,
      ...stats
    });

    console.log(`[3/3] Dispatching email...`);
    const info = await sendEmail({
      to: targetEmail,
      subject: 'Your Dobium Daily Digest 📊 (Demo Send)',
      text: `Your daily digest is here! Portfolio: $${stats.portfolioValue.toFixed(2)} | Buying Power: $${stats.buyingPower.toFixed(2)}`,
      html
    });

    console.log('✅ Demo digest sent successfully!');
    console.log('Message ID:', info.messageId);
    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to send demo digest:', error);
    process.exit(1);
  }
}

sendDemo();