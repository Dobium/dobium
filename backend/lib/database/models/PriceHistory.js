// ============================================================================
// PRICE HISTORY MODEL
// ============================================================================
// Stores price snapshots for market outcomes over time

const { DataTypes } = require('sequelize');
const { sequelize } = require('../connection');

const PriceHistory = sequelize.define('PriceHistory', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  market_id: {
    type: DataTypes.STRING(50),
    allowNull: false,
    references: {
      model: 'markets',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  timestamp: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  prices: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: {}
  }
}, {
  tableName: 'price_history',
  timestamps: false,
  underscored: true,
  indexes: [
    { fields: ['market_id'] },
    { fields: ['timestamp'] }
  ]
});

module.exports = PriceHistory;
