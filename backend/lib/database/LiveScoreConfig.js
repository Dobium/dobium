const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('LiveScoreConfig', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    sport_id: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    score_unit: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    display_format: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    stats_to_track: {
      type: DataTypes.JSONB,
      allowNull: true
    }
  }, {
    tableName: 'live_score_configs',
    timestamps: true,
    underscored: true
  });
};