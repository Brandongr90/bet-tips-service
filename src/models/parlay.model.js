const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Parlay = sequelize.define('Parlay', {
  parlay_id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  title: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  creator_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'user_id'
    }
  },
  total_odds: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  status: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'pending',
    validate: {
      isIn: [['pending', 'won', 'lost', 'partial', 'cancelled']]
    }
  }
}, {
  tableName: 'parlays',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['creator_id']
    },
    {
      fields: ['status']
    }
  ]
});

module.exports = Parlay;