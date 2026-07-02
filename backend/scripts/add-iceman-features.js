/**
 * One-off migration: add 21 new artist outcomes to the drake_iceman_features market.
 * Safe to run multiple times — skips outcomes that already exist.
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });

const { sequelize, Outcome, Market, initializeDatabase } = require('../lib/database/models');

const MARKET_ID = 'drake_iceman_features';

const NEW_OUTCOMES = [
  { id: 'nicki',      title: 'Nicki Minaj'    },
  { id: 'wayne',      title: 'Lil Wayne'      },
  { id: 'weeknd',     title: 'The Weeknd'     },
  { id: 'pnd',        title: 'PARTYNEXTDOOR'  },
  { id: 'jcole',      title: 'J. Cole'        },
  { id: 'lilbaby',    title: 'Lil Baby'       },
  { id: 'gunna',      title: 'Gunna'          },
  { id: 'youngthug',  title: 'Young Thug'     },
  { id: 'rickross',   title: 'Rick Ross'      },
  { id: '2chainz',    title: '2 Chainz'       },
  { id: 'meekmill',   title: 'Meek Mill'      },
  { id: 'sza',        title: 'SZA'            },
  { id: 'rihanna',    title: 'Rihanna'        },
  { id: 'badbunny',   title: 'Bad Bunny'      },
  { id: 'chrisbrown', title: 'Chris Brown'    },
  { id: 'giveon',     title: 'Giveon'         },
  { id: 'majid',      title: 'Majid Jordan'   },
  { id: 'tydolla',    title: 'Ty Dolla $ign'  },
  { id: 'summer',     title: 'Summer Walker'  },
  { id: 'roddyricch', title: 'Roddy Ricch'    },
  { id: 'sexyy',      title: 'Sexyy Red'      },
];

async function main() {
  try {
    await sequelize.authenticate();
    console.log('✅ Connected to database\n');

    const market = await Market.findByPk(MARKET_ID);
    if (!market) {
      console.error(`❌ Market "${MARKET_ID}" not found in DB.`);
      process.exit(1);
    }
    console.log(`📊 Found market: "${market.title}"`);

    let added = 0, skipped = 0;
    for (const o of NEW_OUTCOMES) {
      const outcomeId = `${MARKET_ID}_${o.id}`;
      const existing = await Outcome.findByPk(outcomeId);
      if (existing) {
        console.log(`  ⏭️  "${o.title}" already exists`);
        skipped++;
        continue;
      }
      await Outcome.create({
        id: outcomeId,
        market_id: MARKET_ID,
        title: o.title,
        probability: 50,
        total_stake: 0,
      });
      console.log(`  ✅ Added "${o.title}"`);
      added++;
    }

    console.log(`\n🎉 Done — ${added} added, ${skipped} skipped.`);
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
  } finally {
    await sequelize.close();
  }
}

main();
