const { DataTypes } = require('sequelize');
const { sequelize } = require('../connection');

const LeagueTimingWindow = sequelize.define('LeagueTimingWindow', {
  id: {
    type: DataTypes.STRING(12),
    primaryKey: true,
    allowNull: false
  },
  league_id: {
    type: DataTypes.STRING(12),
    allowNull: false,
    references: {
      model: 'forecast_leagues',
      key: 'id'
    }
  },
  label: {
    type: DataTypes.STRING(80),
    allowNull: false
  },
  tier: {
    type: DataTypes.STRING(2),
    allowNull: false,
    defaultValue: 'B'
  },
  window_start: {
    type: DataTypes.DATE,
    allowNull: false
  },
  window_end: {
    type: DataTypes.DATE,
    allowNull: false
  },
  multiplier: {
    type: DataTypes.DECIMAL(6, 3),
    allowNull: false,
    defaultValue: 1
  }
}, {
  tableName: 'league_timing_windows',
  timestamps: false,
  underscored: true,
  indexes: [
    { fields: ['league_id'] },
    { fields: ['window_start', 'window_end'] }
  ]
});

module.exports = LeagueTimingWindow;
