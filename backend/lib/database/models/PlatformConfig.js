const { DataTypes } = require('sequelize');
const { sequelize } = require('../connection');

const PlatformConfig = sequelize.define('PlatformConfig', {
  key: {
    type: DataTypes.STRING(80),
    primaryKey: true,
    allowNull: false
  },
  value: {
    type: DataTypes.DECIMAL(12, 4),
    allowNull: false,
    defaultValue: 0
  }
}, {
  tableName: 'platform_configs',
  timestamps: false,
  underscored: true
});

module.exports = PlatformConfig;
