const { DataTypes } = require('sequelize');
const { sequelize } = require('../connection');

const LeagueScore = sequelize.define('LeagueScore', {
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
  user_id: {
    type: DataTypes.STRING(50),
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  total_points: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0
  },
  accuracy_pct: {
    type: DataTypes.DECIMAL(6, 2),
    allowNull: false,
    defaultValue: 0
  },
  calibration_score: {
    type: DataTypes.DECIMAL(6, 2),
    allowNull: false,
    defaultValue: 0
  },
  calibration_tier: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'Unrated'
  },
  called_it_count: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  timing_tier: {
    type: DataTypes.STRING(2),
    allowNull: false,
    defaultValue: 'B'
  },
  conviction_tier: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'Medium'
  },
  correct_count: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  wrong_count: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  archetype: {
    type: DataTypes.STRING(40),
    allowNull: false,
    defaultValue: 'Consensus'
  },
  league_rank: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  previous_rank: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  conviction_margin: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0
  },
  total_predictions_count: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  avg_entry_price: {
    type: DataTypes.DECIMAL(6, 3),
    allowNull: true
  },
  updated_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'league_scores',
  timestamps: false,
  underscored: true,
  indexes: [
    { unique: true, fields: ['league_id', 'user_id'] },
    { fields: ['league_id', 'league_rank'] },
    { fields: ['user_id'] }
  ]
});

module.exports = LeagueScore;
