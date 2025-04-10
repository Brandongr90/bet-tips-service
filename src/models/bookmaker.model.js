const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Bookmaker = sequelize.define('Bookmaker', {
  bookmaker_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true
  },
  website_url: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  logo_url: {
    type: DataTypes.STRING(255),
    allowNull: true
  }
}, {
  tableName: 'bookmakers',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = Bookmaker;