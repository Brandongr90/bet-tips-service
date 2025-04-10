const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const TipView = sequelize.define('TipView', {
  tip_view_id: {
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
  viewer_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'user_id'
    }
  },
  viewed_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'tip_views',
  timestamps: false,
  indexes: [
    {
      fields: ['tip_id']
    },
    {
      fields: ['viewer_id']
    },
    {
      fields: ['viewer_id', 'viewed_at']
    }
  ]
});

module.exports = TipView;