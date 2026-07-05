// ============================================================================
// WAITLIST MODEL
// ============================================================================
// Real-money waitlist signups from the landing page / Explore page

const { DataTypes } = require('sequelize');
const { sequelize } = require('../connection');

const Waitlist = sequelize.define('Waitlist', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: true,
    validate: { isEmail: true }
  }
}, {
  tableName: 'waitlist_signups',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false
});

module.exports = Waitlist;
