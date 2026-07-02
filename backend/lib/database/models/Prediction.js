// ============================================================================
// PREDICTION MODEL
// ============================================================================
// Represents a user's trade/prediction on a market outcome

const { DataTypes } = require('sequelize');
const { sequelize } = require('../connection');

const Prediction = sequelize.define('Prediction', {
  id: {
    type: DataTypes.STRING(50),
    primaryKey: true,
    allowNull: false
  },
  market_id: {
    type: DataTypes.STRING(50),
    allowNull: false,
    references: {
      model: 'markets',
      key: 'id'
    }
  },
  outcome_id: {
    type: DataTypes.STRING(50),
    allowNull: false,
    references: {
      model: 'outcomes',
      key: 'id'
    }
  },
  user_id: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  stake_amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0.01
    }
  },
  odds_at_prediction: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: false,
    validate: {
      min: 0,
      max: 100
    }
  },
  potential_return: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  actual_return: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0
  },
  status: {
    type: DataTypes.STRING(20),
    defaultValue: 'active',
    validate: {
      isIn: [['active', 'won', 'lost', 'sold', 'refunded']]
    }
  },
  resolved_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  sold_at: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'predictions',
  timestamps: true,
  underscored: true,
  indexes: [
    { fields: ['market_id'] },
    { fields: ['user_id'] },
    { fields: ['status'] },
    { fields: ['created_at'] }
  ]
});

module.exports = Prediction;

