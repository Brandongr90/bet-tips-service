const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const TipStat = sequelize.define('TipStat', {
  tip_id: {
    type: DataTypes.UUID,
    primaryKey: true,
    references: {
      model: 'tips',
      key: 'tip_id'
    }
  },
  views: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  likes: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  shares: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  }
}, {
  tableName: 'tip_stats',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = TipStat;