require('dotenv').config();
const { Market } = require('./lib/database/models');

async function fixMarket() {
  try {
    const [affectedRows] = await Market.update({
      close_date: '2026-05-23T04:00:00.000Z',
      description: 'Predict the first-week sales numbers for Drake\'s "Iceman" album. The album dropped on 5/15 at 11 PM CST, and this market will resolve exactly one week later on 5/22 at 11 PM CST. Only one range will be correct.'
    }, {
      where: { id: 'drake_iceman_sales' }
    });

    console.log(`✅ Successfully updated database! Affected rows: ${affectedRows}`);
    process.exit(0);
  } catch (err) {
    console.error('❌ Error updating database:', err);
    process.exit(1);
  }
}

fixMarket();