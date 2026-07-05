// ============================================================================
// MODELS INDEX
// ============================================================================
// Exports all models and defines their relationships

const { sequelize } = require('../connection');
const User = require('./User');
const Transaction = require('./Transaction');
const Market = require('./Market');
const Outcome = require('./Outcome');
const Prediction = require('./Prediction');
const PriceHistory = require('./PriceHistory');
const PlatformConfig = require('./PlatformConfig');
const ForecastLeague = require('./ForecastLeague');
const LeagueTimingWindow = require('./LeagueTimingWindow');
const LeagueMember = require('./LeagueMember');
const LeaguePrediction = require('./LeaguePrediction');
const PositionExit = require('./PositionExit');
const LeagueScore = require('./LeagueScore');
const CalledItEntry = require('./CalledItEntry');
const MainEvent = require('./MainEvent');
const MainEventMarket = require('./MainEventMarket');
const GlobalScore = require('./GlobalScore');
const Comment = require('./Comment');

// ============================================================================
// DEFINE RELATIONSHIPS
// ============================================================================

// User has many Transactions
User.hasMany(Transaction, { foreignKey: 'user_id', as: 'transactions' });
Transaction.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// Market has many Outcomes
Market.hasMany(Outcome, { foreignKey: 'market_id', as: 'outcomes', onDelete: 'CASCADE' });
Outcome.belongsTo(Market, { foreignKey: 'market_id', as: 'market' });

// Market has many Predictions
Market.hasMany(Prediction, { foreignKey: 'market_id', as: 'predictions', onDelete: 'CASCADE' });
Prediction.belongsTo(Market, { foreignKey: 'market_id', as: 'market' });

// Outcome has many Predictions
Outcome.hasMany(Prediction, { foreignKey: 'outcome_id', as: 'predictions' });
Prediction.belongsTo(Outcome, { foreignKey: 'outcome_id', as: 'outcome' });

// Market has many PriceHistory entries
Market.hasMany(PriceHistory, { foreignKey: 'market_id', as: 'price_history', onDelete: 'CASCADE' });
PriceHistory.belongsTo(Market, { foreignKey: 'market_id', as: 'market' });

// User has many Predictions
User.hasMany(Prediction, { foreignKey: 'user_id', as: 'predictions' });
Prediction.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// Forecast league relationships
User.hasMany(ForecastLeague, { foreignKey: 'admin_user_id', as: 'admin_leagues' });
ForecastLeague.belongsTo(User, { foreignKey: 'admin_user_id', as: 'admin' });

ForecastLeague.hasMany(LeagueTimingWindow, { foreignKey: 'league_id', as: 'timing_windows', onDelete: 'CASCADE' });
LeagueTimingWindow.belongsTo(ForecastLeague, { foreignKey: 'league_id', as: 'league' });

ForecastLeague.hasMany(LeagueMember, { foreignKey: 'league_id', as: 'members', onDelete: 'CASCADE' });
LeagueMember.belongsTo(ForecastLeague, { foreignKey: 'league_id', as: 'league' });
User.hasMany(LeagueMember, { foreignKey: 'user_id', as: 'league_memberships' });
LeagueMember.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

ForecastLeague.hasMany(LeaguePrediction, { foreignKey: 'league_id', as: 'league_predictions', onDelete: 'CASCADE' });
LeaguePrediction.belongsTo(ForecastLeague, { foreignKey: 'league_id', as: 'league' });
User.hasMany(LeaguePrediction, { foreignKey: 'user_id', as: 'league_predictions' });
LeaguePrediction.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
Market.hasMany(LeaguePrediction, { foreignKey: 'market_id', as: 'league_predictions' });
LeaguePrediction.belongsTo(Market, { foreignKey: 'market_id', as: 'market' });
Outcome.hasMany(LeaguePrediction, { foreignKey: 'outcome_id', as: 'league_predictions' });
LeaguePrediction.belongsTo(Outcome, { foreignKey: 'outcome_id', as: 'outcome' });
Prediction.hasOne(LeaguePrediction, { foreignKey: 'real_prediction_id', as: 'league_prediction' });
LeaguePrediction.belongsTo(Prediction, { foreignKey: 'real_prediction_id', as: 'real_prediction' });
LeaguePrediction.belongsTo(LeagueTimingWindow, { foreignKey: 'timing_window_id', as: 'timing_window' });

LeaguePrediction.hasMany(PositionExit, { foreignKey: 'prediction_id', as: 'exits', onDelete: 'CASCADE' });
PositionExit.belongsTo(LeaguePrediction, { foreignKey: 'prediction_id', as: 'prediction' });
ForecastLeague.hasMany(PositionExit, { foreignKey: 'league_id', as: 'position_exits', onDelete: 'CASCADE' });
PositionExit.belongsTo(ForecastLeague, { foreignKey: 'league_id', as: 'league' });
User.hasMany(PositionExit, { foreignKey: 'user_id', as: 'position_exits' });
PositionExit.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

ForecastLeague.hasMany(LeagueScore, { foreignKey: 'league_id', as: 'scores', onDelete: 'CASCADE' });
LeagueScore.belongsTo(ForecastLeague, { foreignKey: 'league_id', as: 'league' });
User.hasMany(LeagueScore, { foreignKey: 'user_id', as: 'league_scores' });
LeagueScore.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

User.hasOne(GlobalScore, { foreignKey: 'user_id', as: 'global_score' });
GlobalScore.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

ForecastLeague.hasMany(CalledItEntry, { foreignKey: 'league_id', as: 'called_it_entries', onDelete: 'CASCADE' });
CalledItEntry.belongsTo(ForecastLeague, { foreignKey: 'league_id', as: 'league' });
User.hasMany(CalledItEntry, { foreignKey: 'user_id', as: 'called_it_entries' });
CalledItEntry.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
Market.hasMany(CalledItEntry, { foreignKey: 'market_id', as: 'called_it_entries' });
CalledItEntry.belongsTo(Market, { foreignKey: 'market_id', as: 'market' });

// Main Events (admin-curated events like Grammys, World Cup, etc.)
User.hasMany(MainEvent, { foreignKey: 'created_by', as: 'created_events' });
MainEvent.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });

MainEvent.hasMany(MainEventMarket, { foreignKey: 'event_id', as: 'event_markets', onDelete: 'CASCADE' });
MainEventMarket.belongsTo(MainEvent, { foreignKey: 'event_id', as: 'event' });

Market.hasMany(MainEventMarket, { foreignKey: 'market_id', as: 'event_memberships', onDelete: 'CASCADE' });
MainEventMarket.belongsTo(Market, { foreignKey: 'market_id', as: 'market' });

MainEvent.hasMany(ForecastLeague, { foreignKey: 'event_id', as: 'leagues' });
ForecastLeague.belongsTo(MainEvent, { foreignKey: 'event_id', as: 'event' });

// ============================================================================
// SYNC DATABASE (Create tables if they don't exist)
// ============================================================================

/**
 * Initialize database - creates tables if they don't exist
 * @param {boolean} force - If true, drops existing tables (WARNING: deletes data!)
 */
async function initializeDatabase(force = false) {
  try {
    // SAFETY: Never allow force=true in production
    if (force && process.env.NODE_ENV === 'production') {
      console.error('❌ PREVENTED: Cannot reset database in production environment');
      console.error('   To reset production database, you must do it manually');
      force = false;
    }

    await sequelize.sync({ force, alter: !force });
    console.log(`✅ Database ${force ? 'reset' : 'synchronized'} successfully`);
    return true;
  } catch (error) {
    console.error('❌ Database initialization failed:', error.message);
    return false;
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  sequelize,
  Comment,
  User,
  Transaction,
  Market,
  Outcome,
  Prediction,
  PriceHistory,
  PlatformConfig,
  ForecastLeague,
  LeagueTimingWindow,
  LeagueMember,
  LeaguePrediction,
  PositionExit,
  LeagueScore,
  CalledItEntry,
  MainEvent,
  MainEventMarket,
  GlobalScore,
  initializeDatabase
};
