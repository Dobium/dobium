// ── Sports futures seeder ──────────────────────────────────────────────────
//
// Fills the league subcategories with real markets rather than placeholder
// cards. Everything here is written to the database as an ordinary market with
// an id, outcomes and a resolution date — so it renders, it's clickable, and
// it can be traded, which placeholder cards never could.
//
// These are deliberately hand-written rather than scraped. A future has to
// state its resolution condition precisely enough to settle months from now,
// and that isn't something to leave to a title-matching heuristic.
//
// Idempotent: re-running skips anything whose title already exists, so this is
// safe to call repeatedly.

const crypto = require('crypto');
const nanoid = (size = 12) => crypto.randomBytes(Math.ceil(size / 2)).toString('hex').slice(0, size);

// Resolution dates are set to the end of each competition, so the long-dated
// exemption in sweepHypeDecay keeps them open through quiet stretches.
const SEASON_END = {
  nfl: '2027-02-14',
  nba: '2027-06-30',
  cfb: '2027-01-20',
  soccer: '2027-05-31',
  mlb: '2026-11-05',
  nhl: '2027-06-25',
};

const FUTURES = [
  // Titles name the league explicitly so classifySector files them under
  // sportsfutures and the league sub-filters match.
  { league: 'nfl', title: 'Will an AFC team win the Super Bowl this NFL season?', binary: true },
  { league: 'nfl', title: 'Will any NFL team finish the regular season undefeated?', binary: true },
  { league: 'nfl', title: 'Will the reigning champion return to the Super Bowl this NFL season?', binary: true },

  { league: 'nba', title: 'Will an NBA team win 65 or more regular season games?', binary: true },
  { league: 'nba', title: 'Will the NBA Finals go to seven games?', binary: true },
  { league: 'nba', title: 'Will the NBA MVP come from the Eastern Conference?', binary: true },

  { league: 'cfb', title: 'Will an SEC team win the College Football national championship?', binary: true },
  { league: 'cfb', title: 'Will any College Football team go undefeated through the regular season?', binary: true },
  { league: 'cfb', title: 'Will the Heisman winner play quarterback in College Football this season?', binary: true },

  { league: 'soccer', title: 'Will an English club win the Champions League this season?', binary: true },
  { league: 'soccer', title: 'Will the Premier League title be decided on the final day?', binary: true },
  { league: 'soccer', title: 'Will the Premier League Golden Boot winner score 25 or more goals?', binary: true },

  { league: 'mlb', title: 'Will a wild card team win the MLB World Series?', binary: true },
  { league: 'mlb', title: 'Will any MLB team win 100 or more games this season?', binary: true },

  { league: 'nhl', title: 'Will a Canadian team win the NHL Stanley Cup?', binary: true },
  { league: 'nhl', title: 'Will the NHL Stanley Cup Final go to seven games?', binary: true },
];

async function seedSportsFutures(models, { dryRun = false } = {}) {
  const { Market, Outcome, sequelize } = models;
  const created = [];
  const skipped = [];

  for (const f of FUTURES) {
    const existing = await Market.findOne({ where: { title: f.title } });
    if (existing) { skipped.push(f.title); continue; }
    if (dryRun) { created.push(f.title); continue; }

    const resolveAt = new Date(`${SEASON_END[f.league]}T23:59:00Z`);
    const marketId = nanoid(12);

    await sequelize.transaction(async (t) => {
      await Market.create({
        id: marketId,
        title: f.title,
        description: `Season-long futures market. Resolves on the outcome of the competition, per the league's official published result. No trading after ${resolveAt.toDateString()}.`,
        category: 'sports',
        market_type: 'binary',
        status: 'active',
        close_date: resolveAt,
        resolution_date: resolveAt,
        total_volume: 0,
        winning_outcome_id: null,
        search_keywords: `${f.league} futures season championship`,
        is_trending: false,
      }, { transaction: t });

      await Outcome.bulkCreate([
        { id: `${marketId}_yes`, market_id: marketId, title: 'Yes', probability: 50, total_stake: 0 },
        { id: `${marketId}_no`, market_id: marketId, title: 'No', probability: 50, total_stake: 0 },
      ], { transaction: t });
    });

    created.push(f.title);
  }

  return { created: created.length, skipped: skipped.length, titles: created, dryRun };
}

module.exports = { seedSportsFutures, FUTURES };
