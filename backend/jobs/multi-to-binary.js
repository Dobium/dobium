// ── Multi-outcome → binary migration ──────────────────────────────────────
//
// Every market becomes a single yes/no question. The obvious implementation —
// delete the multi-outcome markets and recreate them — is the one thing not to
// do here: deleting a market cascades into Prediction, which is what erased the
// May ledger and left a hardcoded volume baseline standing in for it. There is
// a live $10,000 position on one of these.
//
// So instead:
//   1. Close the multi-outcome market. status 'closed' stops new positions;
//      holders keep their trades and the market still resolves on its date.
//   2. Create one binary market per outcome, inheriting the close and
//      resolution dates, so the same question is tradeable in yes/no form.
//   3. Skip catch-all outcomes ('Other', 'Any other team', 'Field') — "Will
//      any other team win?" is a real question but not one worth auto-writing.
//
// Idempotent, and dry-runnable: pass dry=1 to see every title it would create
// and every market it would close, without writing anything.

const crypto = require('crypto');
const nanoid = (size = 12) => crypto.randomBytes(Math.ceil(size / 2)).toString('hex').slice(0, size);

const CATCH_ALL = /^(other|any other team|field|none|neither|no one|nobody)$/i;

// multi_single stores each option as a pair of rows — "Bad Bunny (Yes)" and
// "Bad Bunny (No)" — so iterating outcomes naively yields two markets per
// option, one of them a nonsense "(No)" title. Keep the Yes side, strip the
// suffix, and dedupe on the bare option name.
const YES_SUFFIX = /\s*\((yes)\)\s*$/i;
const NO_SUFFIX = /\s*\((no)\)\s*$/i;

function distinctOptions(outcomes) {
  const seen = new Map();
  for (const o of outcomes) {
    const raw = (o.title || '').trim();
    if (NO_SUFFIX.test(raw)) continue;            // the paired negative side
    const name = raw.replace(YES_SUFFIX, '').trim();
    if (!name || CATCH_ALL.test(name)) continue;
    if (!seen.has(name.toLowerCase())) seen.set(name.toLowerCase(), { name, probability: o.probability });
  }
  return [...seen.values()];
}

// "When will X arrive?" / "Who will win Y?" don't survive having an outcome
// appended, so the binary form is built from the outcome plus the subject
// rather than by concatenating the original question.
function binaryTitle(marketTitle, outcomeTitle) {
  const q = marketTitle.replace(/\?+\s*$/, '').trim();
  const o = outcomeTitle.trim();
  const lower = o.charAt(0).toLowerCase() + o.slice(1);

  // "Who will win the title?" + "Ohio State" → "Will Ohio State win the title?"
  // "X — who wins?" / "X — which artist wins?" → "Will <option> win X?"
  let m = q.match(/^(.+?)\s*[—–-]\s*(?:which\s+\w+|who)\s+wins?$/i);
  if (m) return `Will ${o} win ${m[1].trim()}?`;

  // "Who will acquire Letterboxd?" / "Who will feature on X?" — any verb.
  m = q.match(/^who will ([a-z]+)\s+(.+)$/i);
  if (m) return `Will ${o} ${m[1].toLowerCase()} ${m[2]}?`;

  // "When will the album arrive?" + "Before October 2026"
  //   → "Will the album arrive before October 2026?"
  m = q.match(/^when will (.+?)\s+(arrive|release|drop|launch|come out|be released)$/i);
  if (m) {
    const joiner = /^(before|after|by|in|on|during)\b/i.test(o) ? '' : 'in ';
    return `Will ${m[1]} ${m[2].toLowerCase()} ${joiner}${lower}?`;
  }
  m = q.match(/^when will (.+)$/i);
  if (m) {
    const joiner = /^(before|after|by|in|on|during)\b/i.test(o) ? '' : 'in ';
    return `Will ${m[1]} ${joiner}${lower}?`;
  }

  // "What will be #1 on the chart?" + "Drake" → "Will Drake be #1 on the chart?"
  m = q.match(/^what will be\s+(.+)$/i);
  if (m) return `Will ${o} be ${m[1]}?`;

  // "A vs. B — who finishes 2026 as #1?" → drop the versus framing.
  m = q.match(/—\s*who\s+(\w+)\s+(.+)$/i);
  if (m) {
    // "who finishes 2026 as #1" → "Will Taylor Swift finish 2026 as #1?"
    const verb = m[1]
      .replace(/ies$/i, 'y')
      .replace(/(sh|ch|ss|x|z)es$/i, '$1')
      .replace(/([a-z])s$/i, '$1');
    return `Will ${o} ${verb} ${m[2]}?`;
  }

  return `Will ${o} — ${q}?`;
}

async function migrateMultiToBinary(models, { dryRun = false } = {}) {
  const { Market, Outcome, sequelize } = models;

  const multi = await Market.findAll({
    where: { status: 'active', market_type: 'multi_single' },
    include: [{ model: Outcome, as: 'outcomes' }],
  });

  const closed = [];
  const created = [];
  const skipped = [];

  for (const market of multi) {
    const outcomes = distinctOptions(market.outcomes || []);

    for (const o of outcomes) {
      const title = binaryTitle(market.title, o.name);
      if (await Market.findOne({ where: { title } })) { skipped.push(title); continue; }
      if (dryRun) { created.push(title); continue; }

      const id = nanoid(12);
      // Opening price carries over the outcome's current probability, so the
      // replacement starts where the crowd already had it rather than at 50/50.
      const p = Math.min(95, Math.max(5, Math.round(Number(o.probability) || 50)));

      await sequelize.transaction(async (t) => {
        await Market.create({
          id,
          title,
          description: market.description || `Binary replacement for "${market.title}". Resolves YES if this outcome occurs.`,
          category: market.category,
          market_type: 'binary',
          status: 'active',
          close_date: market.close_date,
          resolution_date: market.resolution_date,
          total_volume: 0,
          winning_outcome_id: null,
          search_keywords: market.search_keywords,
          is_trending: false,
        }, { transaction: t });

        await Outcome.bulkCreate([
          { id: `${id}_yes`, market_id: id, title: 'Yes', probability: p, total_stake: 0 },
          { id: `${id}_no`, market_id: id, title: 'No', probability: 100 - p, total_stake: 0 },
        ], { transaction: t });
      });

      created.push(title);
    }

    if (!dryRun) {
      // Closed, never deleted — the ledger and every open position survive.
      market.status = 'closed';
      await market.save();
    }
    closed.push({ id: market.id, title: market.title, outcomes: outcomes.length });
  }

  return {
    closed_count: closed.length,
    created_count: created.length,
    skipped_count: skipped.length,
    closed,
    created,
    dryRun,
  };
}

module.exports = { migrateMultiToBinary, binaryTitle };
