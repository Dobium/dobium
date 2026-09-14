// ── Resolution rule templates ──────────────────────────────────────────────
//
// Every market needs a resolution criterion that a stranger can read and apply
// without asking us what we meant. Right now those strings are written inline
// in each seeder (seed-cfb.js, chart-markets.js) and multi-to-binary.js falls
// back to "Resolves YES if this outcome occurs", which is not a rule — it's a
// restatement of the title.
//
// This is a plain template library. No model calls, no network, nothing to
// rate-limit: every rule is a pure function of its parameters, so it costs
// nothing to run and produces byte-identical text every time. That matters
// because a resolution criterion that drifts between renders is a resolution
// criterion you can't defend when someone disputes a settlement.
//
// Each template renders five things, in this order:
//   1. The exact YES condition.
//   2. The explicit NO condition — never left as "otherwise".
//   3. The named source of truth.
//   4. When it settles.
//   5. The edge cases: ties, postponement, cancellation, later revision.
//
// Usage:
//   const { renderRule } = require('../lib/rules');
//   renderRule('sport.undefeated_season', { team: 'Notre Dame', season: 2026, ... })

'use strict';

// ── Canonical sources ──────────────────────────────────────────────────────
// One string per authority so "per Billboard" never becomes "per the Billboard
// charts" in one market and "according to Billboard" in the next. Consistent
// phrasing is what lets someone scan twenty rules and trust all of them.
const SOURCES = {
  ncaa: 'the official NCAA record',
  nfl: 'the official NFL record',
  nba: 'the official NBA record',
  mlb: 'the official MLB record',
  billboard: "Billboard's published chart",
  spotify: "Spotify's public play counts",
  boxOffice: 'Box Office Mojo',
  rottenTomatoes: 'the Rotten Tomatoes Tomatometer',
  imdb: 'IMDb',
  academy: 'the Academy of Motion Picture Arts and Sciences',
  recording: 'the Recording Academy',
  sec: "the company's filings with the SEC",
  crunchbase: 'Crunchbase',
  companyBlog: "the company's official announcement",
  arxiv: 'the arXiv listing',
  nasa: "NASA's official mission record",
  spacex: "SpaceX's official launch record",
  cftc: "the CFTC's public record",
  generic: 'the primary source named above',
};

// ── Shared fragments ───────────────────────────────────────────────────────

function humanDate(d) {
  // A bare "2026-12-07" parses as UTC midnight, which is December 6th in
  // Eastern — so a settlement date would print one day early. Anchor bare
  // dates at midday so no timezone shift can cross a day boundary.
  const input =
    typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d) ? `${d}T12:00:00Z` : d;
  const dt = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(dt.getTime())) return 'the stated settlement date';
  return dt.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'America/New_York',
  });
}

// Every rule ends with this. Stating the timezone once, explicitly, removes the
// single most common resolution dispute: two people reading the same deadline
// in different offsets.
function settles(source, date) {
  return `Settled from ${source} on ${humanDate(date)}. All times are US Eastern.`;
}

// Attached to anything that depends on a scheduled event happening at all.
const POSTPONEMENT =
  'If the event is postponed but occurs before the settlement date, the market stands. If it is cancelled outright or does not occur before the settlement date, the market is void and all positions are refunded at cost.';

// Attached to anything sourced from a figure that can be restated later.
const REVISION =
  'The figure published by the source at the settlement date governs. Later revisions do not reopen a settled market.';

const AMBIGUITY =
  'If the source does not publish a figure clear enough to apply this rule, the market is void and all positions are refunded at cost.';

function money(n) {
  const v = Number(n) || 0;
  if (v >= 1_000_000_000) return `$${(v / 1_000_000_000).toFixed(2).replace(/\.?0+$/, '')} billion`;
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1).replace(/\.0$/, '')} million`;
  return `$${v.toLocaleString('en-US')}`;
}

// ── Templates ──────────────────────────────────────────────────────────────

const TEMPLATES = {
  // ---- Sport ----

  'sport.undefeated_season': {
    params: ['team', 'season', 'resolveAt', 'league'],
    render: ({ team, season, resolveAt, league = 'ncaa' }) =>
      `Resolves YES if ${team} finishes the ${season} regular season with no losses and no ties, including its conference championship game if it plays one. ` +
      `Resolves NO if ${team} records one or more losses or ties in any of those games. ` +
      `Bowl games and postseason playoff results do not count toward this market. ` +
      `A forfeit or vacated win counts as recorded at the time it was played. ` +
      settles(SOURCES[league] || SOURCES.ncaa, resolveAt),
  },

  'sport.win_championship': {
    params: ['team', 'competition', 'season', 'resolveAt', 'league'],
    render: ({ team, competition, season, resolveAt, league = 'ncaa' }) =>
      `Resolves YES if ${team} is the ${season} ${competition} champion. ` +
      `Resolves NO if any other team wins, or if ${team} does not reach the final. ` +
      `A title vacated after the fact does not reopen this market. ` +
      `${POSTPONEMENT} ` +
      settles(SOURCES[league] || SOURCES.ncaa, resolveAt),
  },

  'sport.head_to_head': {
    params: ['teamA', 'teamB', 'eventDate', 'resolveAt', 'league'],
    render: ({ teamA, teamB, eventDate, resolveAt, league = 'ncaa' }) =>
      `Resolves YES if ${teamA} defeats ${teamB} in their scheduled meeting on ${humanDate(eventDate)}. ` +
      `Resolves NO if ${teamB} wins. ` +
      `A game decided in overtime resolves on the final score. A tie, where the competition permits one, resolves NO. ` +
      `${POSTPONEMENT} ` +
      settles(SOURCES[league] || SOURCES.ncaa, resolveAt),
  },

  'sport.season_win_total': {
    params: ['team', 'threshold', 'season', 'resolveAt', 'league'],
    render: ({ team, threshold, season, resolveAt, league = 'ncaa' }) =>
      `Resolves YES if ${team} records ${threshold} or more regular-season wins in ${season}. ` +
      `Resolves NO if the team finishes with fewer than ${threshold} wins. ` +
      `Ties do not count as wins. Games cancelled and not replayed are excluded from the count rather than counted as losses. ` +
      settles(SOURCES[league] || SOURCES.ncaa, resolveAt),
  },

  'sport.player_stat_threshold': {
    params: ['player', 'stat', 'threshold', 'window', 'resolveAt', 'league'],
    render: ({ player, stat, threshold, window, resolveAt, league = 'nfl' }) =>
      `Resolves YES if ${player} records ${threshold} or more ${stat} during ${window}. ` +
      `Resolves NO if the total is below ${threshold}, including if ${player} does not appear in any qualifying game. ` +
      `Only regular-season statistics count unless the window above says otherwise. ` +
      `${REVISION} ` +
      settles(SOURCES[league] || SOURCES.nfl, resolveAt),
  },

  // ---- Music and charts ----

  'music.billboard_number_one': {
    params: ['song', 'artist', 'chartDate', 'resolveAt'],
    render: ({ song, artist, chartDate, resolveAt }) =>
      `Resolves YES if "${song}" by ${artist} is the number one song on the Billboard Hot 100 chart dated ${humanDate(chartDate)}. ` +
      `Resolves NO if any other title holds the number one position on that chart, including if "${song}" does not appear on it. ` +
      `The chart dated ${humanDate(chartDate)} governs regardless of when Billboard publishes it. ` +
      settles(SOURCES.billboard, resolveAt),
  },

  'music.album_debut_position': {
    params: ['album', 'artist', 'position', 'chartDate', 'resolveAt'],
    render: ({ album, artist, position, chartDate, resolveAt }) =>
      `Resolves YES if ${album} by ${artist} debuts at position ${position} or higher on the Billboard 200 chart dated ${humanDate(chartDate)}. ` +
      `Resolves NO if it debuts lower than position ${position}, or does not chart. ` +
      `Only the album's first appearance on the chart counts; a later climb does not resolve this market YES. ` +
      settles(SOURCES.billboard, resolveAt),
  },

  'music.streaming_threshold': {
    params: ['track', 'artist', 'threshold', 'resolveAt'],
    render: ({ track, artist, threshold, resolveAt }) =>
      `Resolves YES if "${track}" by ${artist} shows at least ${Number(threshold).toLocaleString('en-US')} plays on its public Spotify track page at any point before the settlement date. ` +
      `Resolves NO if the count has not reached that figure by then. ` +
      `The count on the track page governs; counts aggregated across other releases, remixes, or regional versions do not. ` +
      `${AMBIGUITY} ` +
      settles(SOURCES.spotify, resolveAt),
  },

  // ---- Film and television ----

  'film.opening_weekend_gross': {
    params: ['title', 'threshold', 'market', 'resolveAt'],
    render: ({ title, threshold, market = 'domestic', resolveAt }) =>
      `Resolves YES if ${title} grosses at least ${money(threshold)} in ${market} box office over its opening three-day weekend. ` +
      `Resolves NO if the reported figure is below ${money(threshold)}. ` +
      `Previews and Thursday-night screenings count toward the opening weekend only where Box Office Mojo includes them in its reported figure. ` +
      `${REVISION} ${POSTPONEMENT} ` +
      settles(SOURCES.boxOffice, resolveAt),
  },

  'film.total_gross_threshold': {
    params: ['title', 'threshold', 'market', 'resolveAt'],
    render: ({ title, threshold, market = 'worldwide', resolveAt }) =>
      `Resolves YES if ${title} reaches at least ${money(threshold)} in ${market} box office before the settlement date. ` +
      `Resolves NO if its cumulative gross is below that figure at the settlement date. ` +
      `Re-release earnings count only if Box Office Mojo folds them into the same cumulative total. ` +
      `${REVISION} ` +
      settles(SOURCES.boxOffice, resolveAt),
  },

  'film.critic_score_threshold': {
    params: ['title', 'threshold', 'resolveAt'],
    render: ({ title, threshold, resolveAt }) =>
      `Resolves YES if ${title} holds a Tomatometer score of ${threshold}% or higher at the settlement date. ` +
      `Resolves NO if the score is below ${threshold}%, or if no Tomatometer score has been issued. ` +
      `The critics' score governs, not the audience score. ` +
      `The score displayed at the settlement date is final for this market even though the Tomatometer continues to move afterward. ` +
      settles(SOURCES.rottenTomatoes, resolveAt),
  },

  'awards.wins_category': {
    params: ['nominee', 'award', 'category', 'year', 'resolveAt', 'body'],
    render: ({ nominee, award, category, year, resolveAt, body = 'academy' }) =>
      `Resolves YES if ${nominee} wins ${category} at the ${year} ${award}. ` +
      `Resolves NO if any other nominee wins, or if ${nominee} is not nominated in that category. ` +
      `A tie in which ${nominee} is named a co-winner resolves YES. ` +
      `If the category is retired or not presented in ${year}, the market is void and all positions are refunded at cost. ` +
      `${POSTPONEMENT} ` +
      settles(SOURCES[body] || SOURCES.academy, resolveAt),
  },

  'awards.receives_nomination': {
    params: ['nominee', 'award', 'category', 'year', 'resolveAt', 'body'],
    render: ({ nominee, award, category, year, resolveAt, body = 'academy' }) =>
      `Resolves YES if ${nominee} appears among the announced nominees for ${category} at the ${year} ${award}. ` +
      `Resolves NO if ${nominee} is absent from the announced list in that category. ` +
      `Nomination in a different category does not resolve this market YES. ` +
      settles(SOURCES[body] || SOURCES.academy, resolveAt),
  },

  // ---- Technology and companies ----

  'tech.ships_by_date': {
    params: ['company', 'product', 'deadline', 'resolveAt'],
    render: ({ company, product, deadline, resolveAt }) =>
      `Resolves YES if ${company} makes ${product} generally available to the public on or before ${humanDate(deadline)}. ` +
      `Resolves NO if it has not shipped by that date. ` +
      `A closed beta, waitlist, staged rollout to a subset of users, or research preview does not count as general availability. ` +
      `An announcement of a future date does not count as shipping. ` +
      settles(SOURCES.companyBlog, resolveAt),
  },

  'tech.benchmark_threshold': {
    params: ['model', 'benchmark', 'threshold', 'deadline', 'resolveAt'],
    render: ({ model, benchmark, threshold, deadline, resolveAt }) =>
      `Resolves YES if ${model} posts a score of ${threshold} or higher on ${benchmark}, as reported by the model's developer or the benchmark's official leaderboard, on or before ${humanDate(deadline)}. ` +
      `Resolves NO if no such score is reported by that date. ` +
      `Third-party reproductions and self-reported scores without a published methodology do not count. ` +
      `Where the developer and the leaderboard disagree, the leaderboard governs. ` +
      settles(SOURCES.generic, resolveAt),
  },

  'company.funding_round': {
    params: ['company', 'stage', 'threshold', 'deadline', 'resolveAt'],
    render: ({ company, stage, threshold, deadline, resolveAt }) =>
      `Resolves YES if ${company} publicly announces a ${stage} round of at least ${money(threshold)} on or before ${humanDate(deadline)}. ` +
      `Resolves NO if no such announcement is made by that date. ` +
      `Reported-but-unconfirmed raises do not count; the company or a lead investor must confirm. ` +
      `Debt financing and secondary sales do not count toward the threshold. ` +
      settles(SOURCES.crunchbase, resolveAt),
  },

  'company.acquisition': {
    params: ['target', 'acquirer', 'deadline', 'resolveAt'],
    render: ({ target, acquirer, deadline, resolveAt }) =>
      `Resolves YES if a definitive agreement for ${acquirer} to acquire ${target} is publicly announced on or before ${humanDate(deadline)}. ` +
      `Resolves NO if no such agreement is announced by that date. ` +
      `The signed agreement resolves this market — the deal does not need to close, and a later collapse does not reopen it. ` +
      `Minority investments and acquisitions of a subsidiary rather than the whole company do not count. ` +
      settles(SOURCES.sec, resolveAt),
  },

  // ---- Space and science ----

  'space.launch_success': {
    params: ['mission', 'operator', 'deadline', 'resolveAt'],
    render: ({ mission, operator, deadline, resolveAt }) =>
      `Resolves YES if ${mission} launches and reaches its intended orbit on or before ${humanDate(deadline)}. ` +
      `Resolves NO if the launch does not occur by that date, or occurs and fails to reach its intended orbit. ` +
      `A scrubbed attempt is not a failure; only the outcome of an attempt that leaves the pad counts. ` +
      `A partial orbital insertion that the operator declares a failure resolves NO. ` +
      settles(SOURCES[operator] || SOURCES.nasa, resolveAt),
  },

  'science.publication': {
    params: ['claim', 'venue', 'deadline', 'resolveAt'],
    render: ({ claim, venue, deadline, resolveAt }) =>
      `Resolves YES if a peer-reviewed paper establishing ${claim} is published in ${venue} on or before ${humanDate(deadline)}. ` +
      `Resolves NO if no such paper appears by that date. ` +
      `Preprints, conference abstracts, and press releases do not count until the peer-reviewed version is published. ` +
      `${AMBIGUITY} ` +
      settles(SOURCES.arxiv, resolveAt),
  },

  // ---- Generic shapes ----
  // These are the fallbacks. They are deliberately still specific: the point of
  // this file is that no market ever ships with "resolves YES if it happens".

  'generic.event_by_date': {
    params: ['event', 'deadline', 'source', 'resolveAt'],
    render: ({ event, deadline, source, resolveAt }) =>
      `Resolves YES if ${event} occurs on or before ${humanDate(deadline)}, as reported by ${source}. ` +
      `Resolves NO if it has not occurred by that date. ` +
      `An announcement, plan, or commitment to do the thing is not the thing. ` +
      `${AMBIGUITY} ` +
      settles(source, resolveAt),
  },

  'generic.threshold_by_date': {
    params: ['subject', 'metric', 'threshold', 'deadline', 'source', 'resolveAt'],
    render: ({ subject, metric, threshold, deadline, source, resolveAt }) =>
      `Resolves YES if ${subject} reaches ${threshold} ${metric} on or before ${humanDate(deadline)}, as reported by ${source}. ` +
      `Resolves NO if the figure is below that threshold at the deadline. ` +
      `The threshold must be met or exceeded; matching it exactly resolves YES. ` +
      `${REVISION} ${AMBIGUITY} ` +
      settles(source, resolveAt),
  },

  // Used by multi-to-binary.js when a multi-outcome market is split. This
  // replaces the current "Binary replacement for X. Resolves YES if this
  // outcome occurs." fallback, which tells a trader nothing.
  'generic.multi_outcome_leg': {
    params: ['outcome', 'question', 'source', 'resolveAt'],
    render: ({ outcome, question, source = SOURCES.generic, resolveAt }) =>
      `This market covers one outcome of a larger question: ${question} ` +
      `Resolves YES if ${outcome} is the outcome that occurs. ` +
      `Resolves NO if any other outcome occurs, including an outcome not listed when this market opened. ` +
      `Exactly one outcome of the parent question resolves YES; if the parent question is voided, every leg is voided with it and all positions are refunded at cost. ` +
      settles(source, resolveAt),
  },
};

// ── Public API ─────────────────────────────────────────────────────────────

function renderRule(id, params = {}) {
  const t = TEMPLATES[id];
  if (!t) throw new Error(`rules: unknown template "${id}"`);

  const missing = t.params.filter(
    (p) => params[p] === undefined && !['league', 'body', 'market', 'source', 'operator'].includes(p),
  );
  if (missing.length) {
    throw new Error(`rules: template "${id}" missing required params: ${missing.join(', ')}`);
  }

  // Collapse any accidental double spacing from optional fragments.
  return t.render(params).replace(/\s+/g, ' ').trim();
}

function listTemplates() {
  return Object.keys(TEMPLATES).map((id) => ({ id, params: TEMPLATES[id].params }));
}

function hasTemplate(id) {
  return Object.prototype.hasOwnProperty.call(TEMPLATES, id);
}

module.exports = { renderRule, listTemplates, hasTemplate, SOURCES, TEMPLATES, humanDate };
