// ============================================================================
// OUTCOME MODEL
// ============================================================================
// Represents a possible outcome in a market (e.g., "Yes", "No", "Team A")

const { DataTypes } = require('sequelize');
const { sequelize } = require('../connection');

const Outcome = sequelize.define('Outcome', {
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
    },
    onDelete: 'CASCADE' // Delete outcomes when market is deleted
  },
  title: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  image_url: {
    type: DataTypes.STRING(2048),
    allowNull: true
  },
  icon: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  probability: {
    type: DataTypes.DECIMAL(7, 2),
    defaultValue: 0,
    validate: {
      min: 0,
      max: 100
    }
  },
  total_stake: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
    validate: {
      min: 0
    }
  }
}, {
  tableName: 'outcomes',
  timestamps: true,
  underscored: true,
  indexes: [
    { fields: ['market_id'] }
  ]
});

module.exports = Outcome;

