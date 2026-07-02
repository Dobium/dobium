const { DataTypes } = require('sequelize');
const { sequelize } = require('../connection');

const ForecastLeague = sequelize.define('ForecastLeague', {
  id: {
    type: DataTypes.STRING(12),
    primaryKey: true,
    allowNull: false
  },
  name: {
    type: DataTypes.STRING(120),
    allowNull: false,
    validate: {
      len: [3, 120],
      notEmpty: true
    }
  },
  admin_user_id: {
    type: DataTypes.STRING(50),
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  // Links to the admin-curated Main Event this league is based on.
  // Leagues with no event_id (legacy) are excluded from the UI.
  event_id: {
    type: DataTypes.STRING(12),
    allowNull: true,
    references: {
      model: 'main_events',
      key: 'id'
    }
  },
  // Kept for reference / leagueService compatibility but derived from MainEvent at creation time.
  // The app admin controls timing via the MainEvent; these are informational mirrors.
  season_start: {
    type: DataTypes.DATE,
    allowNull: true
  },
  season_end: {
    type: DataTypes.DATE,
    allowNull: true
  },
  status: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'lobby',
    validate: {
      isIn: [['lobby', 'active', 'locked', 'completed']]
    }
  },
  invite_code: {
    type: DataTypes.STRING(16),
    allowNull: false,
    unique: true
  }
}, {
  tableName: 'forecast_leagues',
  timestamps: true,
  underscored: true,
  indexes: [
    { fields: ['admin_user_id'] },
    { fields: ['event_id'] },
    { fields: ['status'] },
    { unique: true, fields: ['invite_code'] }
  ]
});

module.exports = ForecastLeague;
