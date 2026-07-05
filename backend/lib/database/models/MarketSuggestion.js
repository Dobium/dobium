// ============================================================================
// MARKET SUGGESTION MODEL
// ============================================================================
// Trending topics found by the market scout, awaiting admin review

const { DataTypes } = require('sequelize');
const { sequelize } = require('../connection');

const MarketSuggestion = sequelize.define('MarketSuggestion', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  headline: { type: DataTypes.STRING(300), allowNull: false },
  url: { type: DataTypes.STRING(500), allowNull: true },
  source: { type: DataTypes.STRING(60), allowNull: false },
  category: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'entertainment' },
  score: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  status: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'pending',
    validate: { isIn: [['pending', 'dismissed', 'published']] }
  }
}, {
  tableName: 'market_suggestions',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = MarketSuggestion;
