require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });
const { createClient } = require('@supabase/supabase-js');
const { sendEmail } = require('../lib/email');
const { buildWelcomeHtml } = require('../lib/welcome-email');
const { User, sequelize } = require('../lib/database/models');

async function run() {
  console.log('🔍 Scanning for users missing their welcome email...');

  // Ensure DB is connected
  await sequelize.authenticate();

  const supabase = createClient(
    process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { data, error } = await supabase.auth.admin.listUsers();
  if (error) {
    console.error('❌ Failed to fetch users from Supabase:', error.message);
    process.exit(1);
  }

  let sent = 0;
  let skipped = 0;

  for (const u of data.users) {
    if (!u.email) continue;

    // Check if the user already received it according to Postgres
    const dbUser = await User.findByPk(u.id);
    if (dbUser && dbUser.welcome_email_sent) {
      skipped++;
      continue;
    }

    const username = u.user_metadata?.name || u.user_metadata?.full_name || u.user_metadata?.display_name || u.email.split('@')[0];

    try {
      const html = buildWelcomeHtml({ username, email: u.email });
      await sendEmail({
        to: u.email,
        subject: 'Welcome to Dobium 🎉',
        text: `Welcome to Dobium, ${username}! Your account is confirmed and ready to go.`,
        html
      });

      // Mark the welcome email as sent so they never get a duplicate
      await User.upsert({
        id: u.id,
        email: u.email,
        username: username,
        welcome_email_sent: true
      });

      console.log(`✅ Sent welcome email to: ${u.email}`);
      sent++;

      // Small delay to respect Gmail rate limits
      await new Promise(r => setTimeout(r, 700));
    } catch (err) {
      console.error(`❌ Failed to send to ${u.email}:`, err.message);
    }
  }

  console.log(`\n🎉 Done! Sent ${sent} missing welcome emails. (Skipped ${skipped} users who already got it).`);
  process.exit(0);
}

run();