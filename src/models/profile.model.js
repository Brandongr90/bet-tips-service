const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Profile = sequelize.define('Profile', {
  profile_id: {
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
  first_name: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  last_name: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  role_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 3, // 'user' por defecto
    references: {
      model: 'roles',
      key: 'role_id'
    }
  },
  subscription_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 1, // 'Gratis' por defecto
    references: {
      model: 'subscriptions',
      key: 'subscription_id'
    }
  },
  bio: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  avatar_url: {
    type: DataTypes.STRING(255),
    allowNull: true
  }
}, {
  tableName: 'profiles',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = Profile;