const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('GameDurationConfig', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    sport_id: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    periods: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    length_of_regulation: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    overtime_configs: {
      type: DataTypes.JSONB,
      allowNull: true
    }
  }, {
    tableName: 'game_duration_configs',
    timestamps: true,
    underscored: true
  });
};