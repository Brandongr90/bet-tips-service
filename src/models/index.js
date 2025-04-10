const User = require('./user.model');
const Role = require('./role.model');
const Profile = require('./profile.model');
const Subscription = require('./subscription.model');
const Sport = require('./sport.model');
const League = require('./league.model');
const Tip = require('./tip.model');
const Odds = require('./odds.model');
const Bookmaker = require('./bookmaker.model');
const Parlay = require('./parlay.model');
const ParlayTip = require('./parlayTip.model');
const UserSubscription = require('./userSubscription.model');
const UserStat = require('./userStat.model');
const TipStat = require('./tipStat.model');
const TipView = require('./tipView.model');

// Asociaciones de User
User.hasOne(Profile, { foreignKey: 'user_id', as: 'profile' });
User.hasOne(UserStat, { foreignKey: 'user_id', as: 'stats' });
User.hasMany(Tip, { foreignKey: 'creator_id', as: 'tips' });
User.hasMany(Parlay, { foreignKey: 'creator_id', as: 'parlays' });
User.hasMany(UserSubscription, { foreignKey: 'user_id', as: 'subscriptions' });
User.hasMany(TipView, { foreignKey: 'viewer_id', as: 'viewedTips' });

// Asociaciones de Role
Role.hasMany(Profile, { foreignKey: 'role_id', as: 'profiles' });

// Asociaciones de Profile
Profile.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
Profile.belongsTo(Role, { foreignKey: 'role_id', as: 'role' });
Profile.belongsTo(Subscription, { foreignKey: 'subscription_id', as: 'subscription' });

// Asociaciones de Subscription
Subscription.hasMany(Profile, { foreignKey: 'subscription_id', as: 'profiles' });
Subscription.hasMany(UserSubscription, { foreignKey: 'subscription_id', as: 'subscribers' });

// Asociaciones de Sport
Sport.hasMany(League, { foreignKey: 'sport_id', as: 'leagues' });
Sport.hasMany(Tip, { foreignKey: 'sport_id', as: 'tips' });

// Asociaciones de League
League.belongsTo(Sport, { foreignKey: 'sport_id', as: 'sport' });
League.hasMany(Tip, { foreignKey: 'league_id', as: 'tips' });

// Asociaciones de Tip
Tip.belongsTo(User, { foreignKey: 'creator_id', as: 'creator' });
Tip.belongsTo(Sport, { foreignKey: 'sport_id', as: 'sport' });
Tip.belongsTo(League, { foreignKey: 'league_id', as: 'league' });
Tip.hasMany(Odds, { foreignKey: 'tip_id', as: 'odds' });
Tip.hasOne(TipStat, { foreignKey: 'tip_id', as: 'stats' });
Tip.hasMany(TipView, { foreignKey: 'tip_id', as: 'views' });
Tip.belongsToMany(Parlay, { through: ParlayTip, foreignKey: 'tip_id', otherKey: 'parlay_id', as: 'parlays' });

// Asociaciones de Odds
Odds.belongsTo(Tip, { foreignKey: 'tip_id', as: 'tip' });
Odds.belongsTo(Bookmaker, { foreignKey: 'bookmaker_id', as: 'bookmaker' });

// Asociaciones de Bookmaker
Bookmaker.hasMany(Odds, { foreignKey: 'bookmaker_id', as: 'odds' });

// Asociaciones de Parlay
Parlay.belongsTo(User, { foreignKey: 'creator_id', as: 'creator' });
Parlay.belongsToMany(Tip, { through: ParlayTip, foreignKey: 'parlay_id', otherKey: 'tip_id', as: 'tips' });

// Otras asociaciones
UserSubscription.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
UserSubscription.belongsTo(Subscription, { foreignKey: 'subscription_id', as: 'subscription' });

UserStat.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

TipStat.belongsTo(Tip, { foreignKey: 'tip_id', as: 'tip' });

TipView.belongsTo(Tip, { foreignKey: 'tip_id', as: 'tip' });
TipView.belongsTo(User, { foreignKey: 'viewer_id', as: 'viewer' });

module.exports = {
  User,
  Role,
  Profile,
  Subscription,
  Sport,
  League,
  Tip,
  Odds,
  Bookmaker,
  Parlay,
  ParlayTip,
  UserSubscription,
  UserStat,
  TipStat,
  TipView
};