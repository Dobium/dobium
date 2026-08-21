// ── College football season seeder (2026 season) ───────────────────────────
//
// Two shapes, both hand-written so their resolution conditions are exact:
//
//   1. One binary "will <team> go undefeated" per Power Four team plus Notre
//      Dame — 68 markets, which is what actually fills the College Football
//      Futures rail rather than leaving it on three generic futures.
//   2. One multi_single "who wins the national championship", the headline
//      market, with a Field outcome so it stays resolvable when a longshot
//      wins.
//
// Dates are the real published ones for this season, not guesses:
//   • Championship weekend is Fri Dec 4 (Big 12) and Sat Dec 5 (SEC, Big Ten,
//     ACC) 2026, so an undefeated run is settled by Mon Dec 7.
//   • The CFP National Championship is Mon Jan 25 2027 at Allegiant Stadium,
//     Las Vegas. Resolution is the morning after, once the result is final.
//
// Titles deliberately contain "college football" and either "undefeated" or
// "championship": that is what files them under sportsfutures and matches the
// College Football Futures sub-filter. Renaming them will unfile them.
//
// Idempotent — re-running skips any title that already exists.

const crypto = require('crypto');
const nanoid = (size = 12) => crypto.randomBytes(Math.ceil(size / 2)).toString('hex').slice(0, size);

// Regular season including conference title games; Notre Dame plays no
// conference championship, so its season is complete before this date too.
const UNDEFEATED_RESOLVES = '2026-12-07';
const TITLE_GAME = '2027-01-25';
const TITLE_RESOLVES = '2027-01-26';

const TEAMS = {
  SEC: ['Alabama', 'Arkansas', 'Auburn', 'Florida', 'Georgia', 'Kentucky', 'LSU', 'Mississippi State',
    'Missouri', 'Oklahoma', 'Ole Miss', 'South Carolina', 'Tennessee', 'Texas', 'Texas A&M', 'Vanderbilt'],
  'Big Ten': ['Illinois', 'Indiana', 'Iowa', 'Maryland', 'Michigan', 'Michigan State', 'Minnesota',
    'Nebraska', 'Northwestern', 'Ohio State', 'Oregon', 'Penn State', 'Purdue', 'Rutgers', 'UCLA',
    'USC', 'Washington', 'Wisconsin'],
  'Big 12': ['Arizona', 'Arizona State', 'Baylor', 'BYU', 'Cincinnati', 'Colorado', 'Houston',
    'Iowa State', 'Kansas', 'Kansas State', 'Oklahoma State', 'TCU', 'Texas Tech', 'UCF', 'Utah',
    'West Virginia'],
  ACC: ['Boston College', 'California', 'Clemson', 'Duke', 'Florida State', 'Georgia Tech',
    'Louisville', 'Miami', 'NC State', 'North Carolina', 'Pitt', 'SMU', 'Stanford', 'Syracuse',
    'Virginia', 'Virginia Tech', 'Wake Forest'],
  Independent: ['Notre Dame'],
};

// Championship outcomes are a contender board, not all 68 — a 68-way market is
// unreadable and unpriceable. "Any other team" keeps it exhaustive.
const CONTENDERS = ['Ohio State', 'Oregon', 'Georgia', 'Texas', 'Alabama', 'Penn State', 'Notre Dame',
  'Michigan', 'Texas A&M', 'Ole Miss', 'LSU', 'Clemson', 'Miami', 'Indiana', 'Texas Tech', 'Oklahoma',
  'Tennessee', 'Florida State', 'USC', 'Utah'];
const FIELD_OUTCOME = 'Any other team';

function undefeatedTitle(team) {
  return `Will ${team} go undefeated in the 2026 college football regular season?`;
}

const TITLE_MARKET = 'Who will win the 2027 College Football Playoff National Championship?';

async function seedCollegeFootball(models, { dryRun = false } = {}) {
  const { Market, Outcome, sequelize } = models;
  const created = [];
  const skipped = [];

  const allTeams = Object.entries(TEAMS).flatMap(([conf, list]) => list.map((team) => ({ team, conf })));

  // ── 1. per-team undefeated markets ──────────────────────────────────────
  for (const { team, conf } of allTeams) {
    const title = undefeatedTitle(team);
    if (await Market.findOne({ where: { title } })) { skipped.push(title); continue; }
    if (dryRun) { created.push(title); continue; }

    const resolveAt = new Date(`${UNDEFEATED_RESOLVES}T23:59:00Z`);
    const marketId = nanoid(12);

    await sequelize.transaction(async (t) => {
      await Market.create({
        id: marketId,
        title,
        description: `Resolves YES if ${team} finishes the 2026 regular season with no losses and no ties, including its conference championship game if it plays one. A loss in any regular-season game resolves NO. Bowl games and College Football Playoff results do not count. Settled from the official NCAA record on ${resolveAt.toDateString()}.`,
        category: 'sports',
        market_type: 'binary',
        status: 'active',
        close_date: resolveAt,
        resolution_date: resolveAt,
        total_volume: 0,
        winning_outcome_id: null,
        search_keywords: `college football cfb ${conf} ${team} undefeated regular season 2026`,
        is_trending: false,
      }, { transaction: t });

      await Outcome.bulkCreate([
        { id: `${marketId}_yes`, market_id: marketId, title: 'Yes', probability: 50, total_stake: 0 },
        { id: `${marketId}_no`, market_id: marketId, title: 'No', probability: 50, total_stake: 0 },
      ], { transaction: t });
    });

    created.push(title);
  }

  // ── 2. the championship market ──────────────────────────────────────────
  if (await Market.findOne({ where: { title: TITLE_MARKET } })) {
    skipped.push(TITLE_MARKET);
  } else if (dryRun) {
    created.push(TITLE_MARKET);
  } else {
    const closeAt = new Date(`${TITLE_GAME}T23:00:00Z`);
    const resolveAt = new Date(`${TITLE_RESOLVES}T12:00:00Z`);
    const marketId = nanoid(12);
    const board = [...CONTENDERS, FIELD_OUTCOME];
    const share = Math.round((10000 / board.length)) / 100;

    await sequelize.transaction(async (t) => {
      await Market.create({
        id: marketId,
        title: TITLE_MARKET,
        description: `Resolves to the winner of the College Football Playoff National Championship, played Monday, January 25, 2027 at Allegiant Stadium in Las Vegas. Resolves to "${FIELD_OUTCOME}" if the champion is not listed as an outcome. Settled from the official College Football Playoff result.`,
        category: 'sports',
        market_type: 'multi_single',
        status: 'active',
        close_date: closeAt,
        resolution_date: resolveAt,
        total_volume: 0,
        winning_outcome_id: null,
        search_keywords: 'college football cfb playoff national championship 2027 title winner',
        is_trending: true,
      }, { transaction: t });

      await Outcome.bulkCreate(
        board.map((name, i) => ({
          id: `${marketId}_${i}`,
          market_id: marketId,
          title: name,
          probability: share,
          total_stake: 0,
        })),
        { transaction: t },
      );
    });

    created.push(TITLE_MARKET);
  }

  return { created: created.length, skipped: skipped.length, titles: created, dryRun };
}

module.exports = { seedCollegeFootball, TEAMS, CONTENDERS, undefeatedTitle, TITLE_MARKET };
