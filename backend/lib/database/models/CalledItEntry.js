const { DataTypes } = require('sequelize');
const { sequelize } = require('../connection');

const CalledItEntry = sequelize.define('CalledItEntry', {
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
  league_id: {
    type: DataTypes.STRING(12),
    allowNull: false,
    references: {
      model: 'forecast_leagues',
      key: 'id'
    }
  },
  market_id: {
    type: DataTypes.STRING(50),
    allowNull: false,
    references: {
      model: 'markets',
      key: 'id'
    }
  },
  p_entry: {
    type: DataTypes.DECIMAL(8, 5),
    allowNull: false
  },
  timing_tier: {
    type: DataTypes.STRING(2),
    allowNull: false,
    defaultValue: 'B'
  },
  points_earned: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  created_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'called_it_registry',
  timestamps: false,
  underscored: true,
  indexes: [
    { unique: true, fields: ['user_id', 'league_id', 'market_id'] },
    { fields: ['user_id'] },
    { fields: ['league_id'] }
  ]
});

module.exports = CalledItEntry;
