require('dotenv').config({ path: '../.env' });
const { sequelize, Prediction } = require('./lib/database/models');
const { updateGlobalScore } = require('./lib/globalLeaderboardService');

async function backfill() {
  console.log("Starting backfill for GlobalScores...");
  try {
    const predictions = await Prediction.findAll({ attributes: ['user_id'], group: ['user_id'] });
    const userIds = predictions.map(p => p.user_id);
    
    console.log(`Found ${userIds.length} users with predictions.`);
    
    for (let i = 0; i < userIds.length; i++) {
      const uid = userIds[i];
      console.log(`[${i+1}/${userIds.length}] Processing user: ${uid}`);
      await updateGlobalScore(uid);
    }
    
    console.log("Backfill completed successfully.");
    process.exit(0);
  } catch (err) {
    console.error("Backfill failed:", err);
    process.exit(1);
  }
}

backfill();
