const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Tip = sequelize.define('Tip', {
  tip_id: {
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
  sport_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'sports',
      key: 'sport_id'
    }
  },
  league_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'leagues',
      key: 'league_id'
    }
  },
  team1_name: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  team2_name: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  match_datetime: {
    type: DataTypes.DATE,
    allowNull: false
  },
  match_status: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'scheduled',
    validate: {
      isIn: [['scheduled', 'live', 'completed', 'cancelled']]
    }
  },
  match_result: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  prediction_type: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  prediction_value: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  confidence: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: {
      min: 1,
      max: 10
    }
  },
  tip_status: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'pending',
    validate: {
      isIn: [['pending', 'won', 'lost', 'cancelled']]
    }
  },
  creator_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'user_id'
    }
  }
}, {
  tableName: 'tips',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    { fields: ['sport_id'] },
    { fields: ['league_id'] },
    { fields: ['match_datetime'] },
    { fields: ['creator_id'] },
    { fields: ['match_status'] }
  ]
});

module.exports = Tip;