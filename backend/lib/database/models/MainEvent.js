const { DataTypes } = require('sequelize');
const { sequelize } = require('../connection');

const MainEvent = sequelize.define('MainEvent', {
  id: {
    type: DataTypes.STRING(12),
    primaryKey: true,
    allowNull: false
  },
  name: {
    type: DataTypes.STRING(120),
    allowNull: false,
    unique: true,
    validate: {
      len: [2, 120],
      notEmpty: true
    }
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  image_url: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  icon: {
    type: DataTypes.STRING(10),
    allowNull: true,
    defaultValue: '🏆'
  },
  status: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'upcoming',
    validate: {
      isIn: [['upcoming', 'active', 'completed']]
    }
  },
  event_date: {
    type: DataTypes.DATE,
    allowNull: true
  },
  // Admin-controlled timing — inherited by all leagues under this event
  season_start: {
    type: DataTypes.DATE,
    allowNull: true
  },
  season_end: {
    type: DataTypes.DATE,
    allowNull: true
  },
  created_by: {
    type: DataTypes.STRING(50),
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  }
}, {
  tableName: 'main_events',
  timestamps: true,
  underscored: true,
  indexes: [
    { fields: ['status'] },
    { unique: true, fields: ['name'] }
  ]
});

module.exports = MainEvent;
