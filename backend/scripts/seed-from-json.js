/**
 * Migration script: Seeds markets, outcomes, predictions, and price history
 * from existing JSON files into the PostgreSQL database.
 *
 * Usage: node backend/scripts/seed-from-json.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });

const path = require('path');
const fs = require('fs').promises;
const {
  sequelize,
  Market,
  Outcome,
  Prediction,
  PriceHistory,
  initializeDatabase
} = require('../lib/database/models');

const DATA_DIR = path.join(__dirname, '..', 'data');

async function readJson(filePath) {
  try {
    console.log(`  Reading: ${filePath}`);
    const raw = await fs.readFile(filePath, 'utf-8');
    const data = JSON.parse(raw || '[]');
    console.log(`  Found ${data.length} records`);
    return data;
  } catch (err) {
    console.error(`  ❌ Failed to read ${filePath}: ${err.message}`);
    return [];
  }
}

async function seedMarkets() {
  const marketsPath = path.join(DATA_DIR, 'markets.json');
  const markets = await readJson(marketsPath);

  if (markets.length === 0) {
    console.log('⚠️  No markets found in markets.json');
    return;
  }

  console.log(`📦 Seeding ${markets.length} markets...`);

  for (const m of markets) {
    // Check if market already exists
    const existing = await Market.findByPk(m.id);
    if (existing) {
      console.log(`  ⏭️  Market "${m.title}" already exists, skipping`);
      continue;
    }

    try {
      await sequelize.transaction(async (t) => {
        // Create market
        await Market.create({
          id: m.id,
          title: m.title,
          description: m.description,
          category: m.category,
          status: m.status || 'active',
          close_date: m.close_date,
          resolution_date: m.resolution_date,
          market_type: m.market_type || 'binary',
          total_volume: m.total_volume || 0,
          image_url: m.image_url,
          winning_outcome_id: m.winning_outcome_id,
          search_keywords: m.search_keywords
        }, { transaction: t });

        // Create outcomes
        if (m.outcomes && m.outcomes.length > 0) {
          const outcomeRecords = m.outcomes.map(o => ({
            id: `${m.id}_${o.id}`,
            market_id: m.id,
            title: o.title,
            probability: o.probability || 0,
            total_stake: o.total_stake || 0
          }));
          await Outcome.bulkCreate(outcomeRecords, { transaction: t });
        }

        // Create price history entries
        if (m.price_history && m.price_history.length > 0) {
          const phRecords = m.price_history.map(ph => ({
            market_id: m.id,
            timestamp: ph.timestamp,
            prices: ph.prices
          }));
          await PriceHistory.bulkCreate(phRecords, { transaction: t });
        }

        console.log(`  ✅ Market "${m.title}" seeded with ${m.outcomes?.length || 0} outcomes, ${m.price_history?.length || 0} price snapshots`);
      });
    } catch (err) {
      console.error(`  ❌ Failed to seed market "${m.title}": ${err.message}`);
    }
  }
}

async function seedPredictions() {
  const predictionsPath = path.join(DATA_DIR, 'predictions.json');
  const predictions = await readJson(predictionsPath);

  if (predictions.length === 0) {
    console.log('⚠️  No predictions found in predictions.json');
    return;
  }

  console.log(`📦 Seeding ${predictions.length} predictions...`);

  for (const p of predictions) {
    const existing = await Prediction.findByPk(p.id);
    if (existing) {
      console.log(`  ⏭️  Prediction ${p.id} already exists, skipping`);
      continue;
    }

    // Map outcome_id to the new format (market_id + _ + outcome_id)
    const outcomeId = `${p.market_id}_${p.outcome_id}`;

    try {
      await Prediction.create({
        id: p.id,
        market_id: p.market_id,
        outcome_id: outcomeId,
        user_id: p.user_id || 'anonymous',
        stake_amount: p.stake_amount,
        odds_at_prediction: p.odds_at_prediction,
        potential_return: p.potential_return,
        actual_return: p.actual_return || 0,
        status: p.status || 'active',
        resolved_at: p.resolved_at,
        sold_at: p.sold_at
      });
      console.log(`  ✅ Prediction ${p.id} seeded`);
    } catch (error) {
      console.error(`  ❌ Failed to seed prediction ${p.id}:`, error.message);
    }
  }
}

async function main() {
  console.log('🚀 Starting database seed from JSON files...\n');

  try {
    await sequelize.authenticate();
    console.log('✅ Database connected\n');

    // Sync tables (create if not exist, alter to add new columns)
    await sequelize.sync({ alter: true });
    console.log('✅ Database tables synchronized\n');

    await seedMarkets();
    console.log('');
    await seedPredictions();

    console.log('\n🎉 Seed complete!');
  } catch (error) {
    console.error('❌ Seed failed:', error.message);
    console.error(error.stack);
  } finally {
    await sequelize.close();
  }
}

main();
