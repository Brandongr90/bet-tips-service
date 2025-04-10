const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Odds = sequelize.define('Odds', {
  odds_id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  tip_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'tips',
      key: 'tip_id'
    }
  },
  bookmaker_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'bookmakers',
      key: 'bookmaker_id'
    }
  },
  odds_value: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  }
}, {
  tableName: 'odds',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['tip_id']
    },
    {
      unique: true,
      fields: ['tip_id', 'bookmaker_id']
    }
  ]
});

module.exports = Odds;