const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Sport = sequelize.define('Sport', {
  sport_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  icon_url: {
    type: DataTypes.STRING(255),
    allowNull: true
  }
}, {
  tableName: 'sports',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = Sport;