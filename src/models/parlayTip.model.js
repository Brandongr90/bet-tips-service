const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ParlayTip = sequelize.define('ParlayTip', {
  parlay_id: {
    type: DataTypes.UUID,
    primaryKey: true,
    references: {
      model: 'parlays',
      key: 'parlay_id'
    }
  },
  tip_id: {
    type: DataTypes.UUID,
    primaryKey: true,
    references: {
      model: 'tips',
      key: 'tip_id'
    }
  }
}, {
  tableName: 'parlay_tips',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false, // No incluye updated_at
  indexes: [
    {
      fields: ['parlay_id']
    },
    {
      fields: ['tip_id']
    }
  ]
});

module.exports = ParlayTip;