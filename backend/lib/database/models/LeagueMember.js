const { DataTypes } = require('sequelize');
const { sequelize } = require('../connection');

const LeagueMember = sequelize.define('LeagueMember', {
  id: {
    type: DataTypes.STRING(12),
    primaryKey: true,
    allowNull: false
  },
  league_id: {
    type: DataTypes.STRING(12),
    allowNull: false,
    references: {
      model: 'forecast_leagues',
      key: 'id'
    }
  },
  user_id: {
    type: DataTypes.STRING(50),
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  joined_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  final_rank: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  final_score: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: true
  }
}, {
  tableName: 'league_members',
  timestamps: false,
  underscored: true,
  indexes: [
    { unique: true, fields: ['league_id', 'user_id'] },
    { fields: ['user_id'] }
  ]
});

module.exports = LeagueMember;
