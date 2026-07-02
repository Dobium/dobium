const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('Sport', {
    id: {
      type: DataTypes.STRING(50),
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    icon: {
      type: DataTypes.STRING(20),
      allowNull: false
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    tableName: 'sports',
    timestamps: true,
    underscored: true
  });
};