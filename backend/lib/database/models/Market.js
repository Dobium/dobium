// ============================================================================
// MARKET MODEL
// ============================================================================
// Represents a prediction market

const { DataTypes } = require('sequelize');
const { sequelize } = require('../connection');

const Market = sequelize.define('Market', {
  id: {
    type: DataTypes.STRING(50),
    primaryKey: true,
    allowNull: false
  },
  title: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [3, 255]
    }
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  category: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  status: {
    type: DataTypes.STRING(20),
    defaultValue: 'active',
    validate: {
      isIn: [['active', 'resolved', 'closed']]
    }
  },
  close_date: {
    type: DataTypes.DATE,
    allowNull: true
  },
  resolution_date: {
    type: DataTypes.DATE,
    allowNull: true
  },
  total_volume: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
    validate: {
      min: 0
    }
  },
  image_url: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  winning_outcome_id: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  price_source: {
    // JSON string linking this market to a real-money market for price sync:
    // {"provider":"kalshi","ticker":"KXOSCARPICTURE-26"} or {"provider":"polymarket","slug":"..."}
    type: DataTypes.TEXT,
    allowNull: true
  },
  search_keywords: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  market_type: {
    type: DataTypes.STRING(30),
    defaultValue: 'binary',
    validate: {
      isIn: [['binary', 'multi_single', 'multi_multiple']]
    }
  },
  is_trending: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  display_order: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  }
}, {
  tableName: 'markets',
  timestamps: true,
  underscored: true, // Use snake_case for column names (created_at, updated_at)
  indexes: [
    { fields: ['status'] },
    { fields: ['category'] },
    { fields: ['close_date'] }
  ]
});

module.exports = Market;
