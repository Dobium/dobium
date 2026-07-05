// ============================================================================
// COMMENT MODEL
// ============================================================================
// Represents user comments on a market (with optional one-level replies)

const { DataTypes } = require('sequelize');
const { sequelize } = require('../connection');

const Comment = sequelize.define('Comment', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    allowNull: false
  },
  market_id: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  user_id: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  username: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  body: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: { len: [1, 2000] }
  },
  parent_id: {
    type: DataTypes.UUID,
    allowNull: true
  }
}, {
  tableName: 'comments',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = Comment;
