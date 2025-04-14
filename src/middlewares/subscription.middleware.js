const { sequelize } = require('../config/database');
const logger = require('../utils/logger');

// Middleware para verificar acceso a un tip específico
const checkTipAccess = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const tipId = req.params.id;
    
    // Verificar si el tip es accesible para el usuario
    const accessibleTips = await sequelize.query(
      'SELECT * FROM get_accessible_tips(:userId) WHERE tip_id = :tipId',
      {
        replacements: { userId, tipId },
        type: sequelize.QueryTypes.SELECT
      }
    );
    
    if (!accessibleTips || accessibleTips.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'No tienes acceso a este tip. Actualiza tu suscripción para ver más contenido.'
      });
    }
    
    next();
  } catch (error) {
    logger.error('Error al verificar acceso a tip:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al verificar acceso a tip',
      error: error.message
    });
  }
};

// Middleware para verificar acceso a un parlay específico
const checkParlayAccess = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const parlayId = req.params.id;
    
    // Verificar si el parlay es accesible para el usuario
    const accessibleParlays = await sequelize.query(
      'SELECT * FROM get_accessible_parlays(:userId) WHERE parlay_id = :parlayId',
      {
        replacements: { userId, parlayId },
        type: sequelize.QueryTypes.SELECT
      }
    );
    
    if (!accessibleParlays || accessibleParlays.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'No tienes acceso a este parlay. Actualiza tu suscripción para ver más contenido.'
      });
    }
    
    next();
  } catch (error) {
    logger.error('Error al verificar acceso a parlay:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al verificar acceso a parlay',
      error: error.message
    });
  }
};

module.exports = { checkTipAccess, checkParlayAccess };