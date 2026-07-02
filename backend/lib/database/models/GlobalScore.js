const { DataTypes } = require('sequelize');
const { sequelize } = require('../connection');

const GlobalScore = sequelize.define('GlobalScore', {
  id: {
    type: DataTypes.STRING(12),
    primaryKey: true,
    allowNull: false
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
  global_rank: {
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
  tableName: 'global_scores',
  timestamps: false,
  underscored: true,
  indexes: [
    { unique: true, fields: ['user_id'] },
    { fields: ['global_rank'] }
  ]
});

module.exports = GlobalScore;
