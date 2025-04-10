const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const League = sequelize.define('League', {
  league_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  sport_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'sports',
      key: 'sport_id'
    }
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  country: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  icon_url: {
    type: DataTypes.STRING(255),
    allowNull: true
  }
}, {
  tableName: 'leagues',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      unique: true,
      fields: ['sport_id', 'name']
    }
  ]
});

module.exports = League;