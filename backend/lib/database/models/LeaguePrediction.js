const { DataTypes } = require('sequelize');
const { sequelize } = require('../connection');

const LeaguePrediction = sequelize.define('LeaguePrediction', {
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
  market_id: {
    type: DataTypes.STRING(50),
    allowNull: false,
    references: {
      model: 'markets',
      key: 'id'
    }
  },
  outcome_id: {
    type: DataTypes.STRING(50),
    allowNull: false,
    references: {
      model: 'outcomes',
      key: 'id'
    }
  },
  real_prediction_id: {
    type: DataTypes.STRING(50),
    allowNull: true,
    references: {
      model: 'predictions',
      key: 'id'
    }
  },
  p_entry: {
    type: DataTypes.DECIMAL(8, 5),
    allowNull: false
  },
  stake_amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  allocation_pct: {
    type: DataTypes.DECIMAL(6, 2),
    allowNull: false,
    defaultValue: 0
  },
  stake_weight: {
    type: DataTypes.DECIMAL(8, 5),
    allowNull: false,
    defaultValue: 0
  },
  timing_window_id: {
    type: DataTypes.STRING(12),
    allowNull: true,
    references: {
      model: 'league_timing_windows',
      key: 'id'
    }
  },
  timing_multiplier: {
    type: DataTypes.DECIMAL(6, 3),
    allowNull: false,
    defaultValue: 1
  },
  difficulty_multiplier: {
    type: DataTypes.DECIMAL(8, 4),
    allowNull: false,
    defaultValue: 1
  },
  conviction_multiplier: {
    type: DataTypes.DECIMAL(8, 4),
    allowNull: false,
    defaultValue: 1
  },
  hold_factor: {
    type: DataTypes.DECIMAL(6, 3),
    allowNull: false,
    defaultValue: 1
  },
  exit_quality: {
    type: DataTypes.DECIMAL(8, 4),
    allowNull: false,
    defaultValue: 1
  },
  base_points: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0
  },
  exit_points: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0
  },
  resolution_points: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0
  },
  final_points: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0
  },
  actual_return: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: true
  },
  p_exit: {
    type: DataTypes.DECIMAL(8, 5),
    allowNull: true
  },
  was_correct: {
    type: DataTypes.BOOLEAN,
    allowNull: true
  },
  is_called_it: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  position_status: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'open',
    validate: {
      isIn: [['open', 'partial_exit', 'exited', 'resolved']]
    }
  },
  predicted_outcome: {
    type: DataTypes.STRING(160),
    allowNull: false
  },
  submitted_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  resolved: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  }
}, {
  tableName: 'league_predictions',
  timestamps: false,
  underscored: true,
  indexes: [
    { fields: ['league_id', 'user_id'] },
    { fields: ['market_id'] },
    { fields: ['real_prediction_id'] },
    { fields: ['resolved'] }
  ]
});

module.exports = LeaguePrediction;
