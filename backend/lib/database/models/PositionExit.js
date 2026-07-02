const { DataTypes } = require('sequelize');
const { sequelize } = require('../connection');

const PositionExit = sequelize.define('PositionExit', {
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
  prediction_id: {
    type: DataTypes.STRING(12),
    allowNull: false,
    references: {
      model: 'league_predictions',
      key: 'id'
    }
  },
  market_id: {
    type: DataTypes.STRING(50),
    allowNull: false,
    references: {
      model: 'markets',
      key: 'id'
    }
  },
  p_entry: {
    type: DataTypes.DECIMAL(8, 5),
    allowNull: false
  },
  p_exit: {
    type: DataTypes.DECIMAL(8, 5),
    allowNull: false
  },
  stake_amount_sold: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  allocation_pct_sold: {
    type: DataTypes.DECIMAL(6, 2),
    allowNull: false,
    defaultValue: 0
  },
  held_duration_pct: {
    type: DataTypes.DECIMAL(6, 3),
    allowNull: false,
    defaultValue: 1
  },
  exit_quality: {
    type: DataTypes.DECIMAL(8, 4),
    allowNull: false,
    defaultValue: 1
  },
  hold_factor: {
    type: DataTypes.DECIMAL(6, 3),
    allowNull: false,
    defaultValue: 1
  },
  exit_points: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0
  },
  exit_type: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'partial',
    validate: {
      isIn: [['partial', 'full', 'forced']]
    }
  },
  exited_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'position_exits',
  timestamps: false,
  underscored: true,
  indexes: [
    { fields: ['league_id', 'user_id'] },
    { fields: ['prediction_id'] },
    { fields: ['market_id'] }
  ]
});

module.exports = PositionExit;
