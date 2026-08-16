// ── Trading close dates ────────────────────────────────────────────────────
//
// Most markets here were written with close_date equal to resolution_date, or
// with no close at all. That means trading stays open right through the moment
// the answer becomes known — someone can buy "will Texas go undefeated" after
// the final whistle, at 50c, against people who wagered when it was genuinely
// uncertain. Every real venue stops trading before the event.
//
// So each market gets a close set ahead of its resolution. The lead scales with
// how far out the market is: a same-day question closes a couple of hours
// early, a season-long future a week, because the last week of a season is when
// the outcome stops being a question.
//
// This is also the answer to capturing the run-up rather than the aftermath.
// Attention peaks going into an event and collapses the moment it resolves;
// closing before resolution means the market is live for the whole climb and
// shuts at the top, instead of hanging around dead afterwards.

const { Op } = require('sequelize');

function leadHoursFor(daysOut) {
  if (daysOut <= 1) return 2;      // same-day: shut shortly before
  if (daysOut <= 7) return 12;
  if (daysOut <= 30) return 24;
  if (daysOut <= 120) return 72;
  return 168;                      // season-long: a week out
}

async function setTradingCloseDates(models, { dryRun = false } = {}) {
  const { Market } = models;
  const now = Date.now();

  const markets = await Market.findAll({
    where: { status: 'active', resolution_date: { [Op.ne]: null } },
  });

  const updated = [];
  const alreadyFine = [];

  for (const m of markets) {
    const resolveAt = new Date(m.resolution_date);
    if (Number.isNaN(resolveAt.getTime())) continue;

    const daysOut = (resolveAt.getTime() - now) / 86400000;
    if (daysOut <= 0) continue; // already past resolution; the void sweep owns these

    const lead = leadHoursFor(daysOut) * 3600 * 1000;
    const target = new Date(resolveAt.getTime() - lead);

    const closeAt = m.close_date ? new Date(m.close_date) : null;
    // Only move a close that is missing, or at/after resolution. A close
    // already set earlier than this was chosen deliberately — leave it.
    const needsFixing = !closeAt || Number.isNaN(closeAt.getTime()) || closeAt >= resolveAt;
    if (!needsFixing) { alreadyFine.push(m.id); continue; }

    if (!dryRun) await m.update({ close_date: target });
    updated.push({
      id: m.id,
      title: m.title,
      resolves: resolveAt.toISOString().slice(0, 10),
      tradingCloses: target.toISOString().slice(0, 10),
      leadHours: lead / 3600000,
    });
  }

  return { checked: markets.length, updated: updated.length, alreadyFine: alreadyFine.length, changes: updated.slice(0, 40), dryRun };
}

module.exports = { setTradingCloseDates, leadHoursFor };
