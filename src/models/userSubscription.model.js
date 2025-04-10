const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const UserSubscription = sequelize.define('UserSubscription', {
  user_subscription_id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'user_id'
    }
  },
  subscription_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'subscriptions',
      key: 'subscription_id'
    }
  },
  start_date: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  end_date: {
    type: DataTypes.DATE,
    allowNull: false
  },
  payment_id: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  payment_status: {
    type: DataTypes.STRING(50),
    allowNull: true
  }
}, {
  tableName: 'user_subscriptions',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['user_id']
    },
    {
      fields: ['subscription_id']
    },
    {
      fields: ['end_date']
    }
  ]
});

module.exports = UserSubscription;