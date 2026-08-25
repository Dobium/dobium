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
  },
  // Referral queue. The old waitlist page advertised "share your link to move
  // up" with nothing behind it — no code was ever issued and no position could
  // move. These three columns are what make that claim true.
  referral_code: {
    type: DataTypes.STRING(12),
    allowNull: true,
    unique: true
  },
  referred_by: {
    type: DataTypes.STRING(12),
    allowNull: true
  }
}, {
  tableName: 'waitlist_signups',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false
});

module.exports = Waitlist;
