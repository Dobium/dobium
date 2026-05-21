require('dotenv').config();
const { sequelize } = require('../lib/database/models');

async function scaleDb() {
  console.log('🔄 Connecting to the database to scale down all trades and resolutions by a factor of 10...');
  const transaction = await sequelize.transaction();

  try {
    // 1. Scale down User Transactions (Deposits, Withdrawals, Payouts)
    await sequelize.query(`UPDATE transactions SET amount = amount / 10`, { transaction });
    console.log('✅ Scaled transactions');

    // 2. Scale down active and resolved Predictions (Stakes, Actual & Potential Returns)
    await sequelize.query(`UPDATE predictions SET stake_amount = stake_amount / 10, potential_return = potential_return / 10, actual_return = actual_return / 10`, { transaction });
    console.log('✅ Scaled predictions');

    // 3. Scale down Outcome pools
    await sequelize.query(`UPDATE outcomes SET total_stake = total_stake / 10`, { transaction });
    console.log('✅ Scaled outcomes');

    // 4. Scale down Market aggregates
    await sequelize.query(`UPDATE markets SET total_volume = total_volume / 10`, { transaction });
    console.log('✅ Scaled markets');

    await transaction.commit();
    console.log('🎉 Successfully scaled down the database by a factor of 10.');
    process.exit(0);
  } catch (err) {
    await transaction.rollback();
    console.error('❌ Error scaling database:', err);
    process.exit(1);
  }
}

scaleDb();