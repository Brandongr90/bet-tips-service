const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const UserStat = sequelize.define('UserStat', {
  user_id: {
    type: DataTypes.UUID,
    primaryKey: true,
    references: {
      model: 'users',
      key: 'user_id'
    }
  },
  total_tips: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  successful_tips: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  total_parlays: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  successful_parlays: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  last_calculated: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'user_stats',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

// Método virtual para calcular la tasa de éxito
UserStat.prototype.getSuccessRate = function() {
  if (this.total_tips === 0) return 0;
  return (this.successful_tips / this.total_tips) * 100;
};

module.exports = UserStat;