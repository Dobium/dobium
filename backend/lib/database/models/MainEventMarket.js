const { DataTypes } = require('sequelize');
const { sequelize } = require('../connection');

const MainEventMarket = sequelize.define('MainEventMarket', {
  id: {
    type: DataTypes.STRING(12),
    primaryKey: true,
    allowNull: false
  },
  event_id: {
    type: DataTypes.STRING(12),
    allowNull: false,
    references: {
      model: 'main_events',
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
  }
}, {
  tableName: 'main_event_markets',
  timestamps: false,
  underscored: true,
  indexes: [
    { unique: true, fields: ['event_id', 'market_id'] },
    { fields: ['event_id'] },
    { fields: ['market_id'] }
  ]
});

module.exports = MainEventMarket;
