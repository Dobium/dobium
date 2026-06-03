const fs = require('fs');
let code = fs.readFileSync('backend/server.js', 'utf8');

const regex = /console\.error\('Error checking position alerts:', err\);\s*\/\/\s*============================================================================\s*\/\/\s*FORECAST LEAGUES ENDPOINTS\s*\/\/\s*============================================================================/m;

const replacement = `    console.error('Error checking position alerts:', err);
  }
}

// ============================================================================
// MAIN EVENTS & GLOBAL LEADERBOARD
// ============================================================================

app.get('/api/events', async (req, res) => {
  try {
    const events = await MainEvent.findAll({
      where: { status: { [Op.in]: ['upcoming', 'active'] } },
      order: [['event_date', 'ASC']]
    });
    res.json(events);
  } catch (error) {
    console.error('List events error:', error);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

app.get('/api/leaderboard/global', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 10;
    const scores = await LeagueScore.findAll({
      attributes: [
        'user_id',
        [Sequelize.fn('SUM', Sequelize.col('total_points')), 'global_points']
      ],
      include: [{ model: User, as: 'user', attributes: ['username'] }],
      group: ['user_id', 'user.id', 'user.username'],
      order: [[Sequelize.literal('global_points'), 'DESC']],
      limit: limit
    });
    
    const formatted = scores.map((s, index) => ({
      rank: index + 1,
      user_id: s.user_id,
      username: s.user?.username || s.user_id.slice(0, 8),
      total_points: s.getDataValue('global_points')
    }));
    
    res.json(formatted);
  } catch (error) {
    console.error('Global leaderboard error:', error);
    res.status(500).json({ error: 'Failed to fetch global leaderboard' });
  }
});

// ============================================================================
// FORECAST LEAGUES ENDPOINTS
// ============================================================================`;

if (regex.test(code)) {
  code = code.replace(regex, replacement);
  fs.writeFileSync('backend/server.js', code);
  console.log('Fixed server.js!');
} else {
  console.log('Regex did not match.');
}
