require('dotenv').config();
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { sendEmail } = require('./lib/email');
const { User, Transaction, Prediction, Outcome, Market } = require('./lib/database/models');
const { executeDailyDigest } = require('./jobs/daily-digest');

async function forceRun() {
  try {
    console.log('🚀 Forcing daily digest broadcast for all eligible users...');
    await executeDailyDigest({ User, Transaction, Prediction, Outcome, Market }, sendEmail);
    console.log('✅ Force run complete.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to force run digest:', error);
    process.exit(1);
  }
}

forceRun();