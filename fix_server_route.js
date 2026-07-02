const fs = require('fs');

let code = fs.readFileSync('backend/server.js', 'utf8');

const regexRoute = /app\.get\('\/api\/leaderboard\/global', async \(req, res\) => \{[\s\S]*?res\.json\(formatted\);\n  \} catch \(error\) \{\n    console\.error\('Global leaderboard error:', error\);\n    res\.status\(500\)\.json\(\{ error: 'Failed to fetch global leaderboard' \}\);\n  \}\n\}\);/g;

const newRoute = `app.get('/api/leaderboard/global', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 10;
    const { GlobalScore, User } = require('./lib/database/models');
    
    const scores = await GlobalScore.findAll({
      include: [{ model: User, as: 'user', attributes: ['username'] }],
      order: [['global_rank', 'ASC']],
      limit: limit
    });
    
    const formatted = scores.map(s => {
      const json = s.toJSON();
      return {
        ...json,
        username: json.user?.username || json.user_id.slice(0, 8),
        league_rank: json.global_rank // map global_rank to league_rank so the frontend LeagueLeaderboard component works seamlessly
      };
    });
    
    res.json(formatted);
  } catch (error) {
    console.error('Global leaderboard error:', error);
    res.status(500).json({ error: 'Failed to fetch global leaderboard' });
  }
});`;

if (regexRoute.test(code)) {
  code = code.replace(regexRoute, newRoute);
  fs.writeFileSync('backend/server.js', code);
  console.log("Updated global leaderboard route.");
} else {
  console.log("Could not find global leaderboard route.");
}
