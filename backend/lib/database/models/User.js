// ============================================================================
// USER MODEL
// ============================================================================
// Represents a user account

const { DataTypes } = require('sequelize');
const { sequelize } = require('../connection');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.STRING(50),
    primaryKey: true,
    allowNull: false
  },
  username: {
    type: DataTypes.STRING(20),
    allowNull: true,
    unique: true,
    set(value) {
      if (value === null || value === undefined || value === '') {
        this.setDataValue('username', null);
        return;
      }
      const normalized = String(value)
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9_]+/g, '_')
        .replace(/^_+|_+$/g, '')
        .slice(0, 20);
      this.setDataValue('username', /^[a-z0-9_]{3,20}$/.test(normalized) ? normalized : null);
    },
    validate: {
      is: /^[a-z0-9_]{3,20}$/
    }
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: true,
    unique: true,
    validate: {
      isEmail: true
    }
  },
  welcome_email_sent: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false
  },
  username_set: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false
  }
}, {
  tableName: 'users',
  timestamps: true,
  underscored: true,
  indexes: [
    { unique: true, fields: ['username'] }
  ]
});

module.exports = User;

