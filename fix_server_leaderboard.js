const fs = require('fs');

let code = fs.readFileSync('backend/server.js', 'utf8');

// 1. Add require at top
if (!code.includes("const { updateGlobalScore } = require('./lib/globalLeaderboardService');")) {
  code = code.replace(
    "const { updateLeagueScores, getPlatformNumber, calculateArchetype, nanoid } = require('./lib/leagueService');",
    "const { updateLeagueScores, getPlatformNumber, calculateArchetype, nanoid } = require('./lib/leagueService');\nconst { updateGlobalScore } = require('./lib/globalLeaderboardService');"
  );
}

// 2. Add to app.post('/api/predictions')
const predBlock = "    const result = await sequelize.transaction(async (t) => {\n      return await executePredictionPlacement(req.body, t);\n    });\n";
const predBlockWithUpdate = predBlock + "\n    // Update global leaderboard score asynchronously\n    if (user_id) {\n      updateGlobalScore(user_id).catch(err => console.error('Error updating global score:', err));\n    }\n";
if (!code.includes("updateGlobalScore(user_id).catch(err =>")) {
  code = code.replace(predBlock, predBlockWithUpdate);
}

// 3. Add to app.post('/api/positions/sell')
const sellBlock = "    res.json({\n      message: 'Position sold completely.',\n      position: prediction\n    });";
const sellBlockWithUpdate = "    res.json({\n      message: 'Position sold completely.',\n      position: prediction\n    });\n\n    // Update global leaderboard score asynchronously\n    updateGlobalScore(user_id).catch(err => console.error('Error updating global score:', err));";
if (!code.includes("Update global leaderboard score asynchronously") || code.split("updateGlobalScore(").length < 3) {
  code = code.replace(sellBlock, sellBlockWithUpdate);
  
  // Also for partial sell
  const partialSellBlock = "    res.json({\n      message: 'Position sold partially.',\n      position: prediction\n    });";
  const partialSellBlockWithUpdate = "    res.json({\n      message: 'Position sold partially.',\n      position: prediction\n    });\n\n    // Update global leaderboard score asynchronously\n    updateGlobalScore(user_id).catch(err => console.error('Error updating global score:', err));";
  code = code.replace(partialSellBlock, partialSellBlockWithUpdate);
}

// 4. Add to resolveMarketInstance
const resolveBlock = "  return { winningOutcomeIds: allWinningIds };\n}";
const resolveBlockWithUpdate = "  // Update global scores for all involved users\n  const involvedUserIds = [...new Set(predictions.map(p => p.user_id))];\n  for (const uid of involvedUserIds) {\n    if (uid && uid !== 'demo_user') {\n      updateGlobalScore(uid).catch(err => console.error('Error updating global score on resolve:', err));\n    }\n  }\n\n  return { winningOutcomeIds: allWinningIds };\n}";
if (!code.includes("updateGlobalScore(uid)")) {
  code = code.replace(resolveBlock, resolveBlockWithUpdate);
}

fs.writeFileSync('backend/server.js', code);
console.log("Patched server.js with globalLeaderboard updates.");
