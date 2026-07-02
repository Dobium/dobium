const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('MarketOptionTemplate', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    sport_id: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    submarket_type: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    outcomes_structure: {
      type: DataTypes.JSONB,
      allowNull: true
    }
  }, {
    tableName: 'market_option_templates',
    timestamps: true,
    underscored: true
  });
};