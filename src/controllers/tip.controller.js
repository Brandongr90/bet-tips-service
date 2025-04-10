const { Tip, Sport, League, User, Profile, Odds, Bookmaker, TipStat, TipView } = require('../models');
const logger = require('../utils/logger');
const { sequelize } = require('../config/database');
const { Op } = require('sequelize');

/**
 * Obtiene todos los tips con filtros opcionales
 */
const getTips = async (req, res) => {
  try {
    const { 
      sportId, 
      leagueId, 
      status, 
      matchStatus, 
      startDate, 
      endDate, 
      creatorId,
      page = 1,
      limit = 10,
      sortBy = 'match_datetime',
      sortDir = 'DESC'
    } = req.query;

    // Construir condiciones de filtrado
    const where = {};
    
    if (sportId) where.sport_id = sportId;
    if (leagueId) where.league_id = leagueId;
    if (status) where.tip_status = status;
    if (matchStatus) where.match_status = matchStatus;
    if (creatorId) where.creator_id = creatorId;
    
    // Filtro de fechas
    if (startDate || endDate) {
      where.match_datetime = {};
      if (startDate) where.match_datetime[Op.gte] = new Date(startDate);
      if (endDate) where.match_datetime[Op.lte] = new Date(endDate);
    }

    // Calcular offset para paginación
    const offset = (page - 1) * limit;

    // Obtener tips con relaciones
    const { count, rows } = await Tip.findAndCountAll({
      where,
      include: [
        {
          model: Sport,
          as: 'sport',
          attributes: ['sport_id', 'name']
        },
        {
          model: League,
          as: 'league',
          attributes: ['league_id', 'name', 'country']
        },
        {
          model: User,
          as: 'creator',
          attributes: ['user_id', 'email'],
          include: [
            {
              model: Profile,
              as: 'profile',
              attributes: ['first_name', 'last_name', 'avatar_url']
            }
          ]
        },
        {
          model: Odds,
          as: 'odds',
          include: [
            {
              model: Bookmaker,
              as: 'bookmaker',
              attributes: ['bookmaker_id', 'name']
            }
          ]
        },
        {
          model: TipStat,
          as: 'stats',
          attributes: ['views', 'likes', 'shares']
        }
      ],
      order: [[sortBy, sortDir]],
      limit: parseInt(limit),
      offset
    });

    // Calcular páginas totales
    const totalPages = Math.ceil(count / limit);

    res.json({
      success: true,
      data: {
        tips: rows,
        pagination: {
          total: count,
          pages: totalPages,
          currentPage: parseInt(page),
          limit: parseInt(limit)
        }
      }
    });
  } catch (error) {
    logger.error('Error al obtener tips:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener tips',
      error: error.message
    });
  }
};

/**
 * Obtiene un tip por su ID
 */
const getTipById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id; // Puede ser undefined si el endpoint es público

    const tip = await Tip.findByPk(id, {
      include: [
        {
          model: Sport,
          as: 'sport'
        },
        {
          model: League,
          as: 'league'
        },
        {
          model: User,
          as: 'creator',
          include: [
            {
              model: Profile,
              as: 'profile'
            }
          ]
        },
        {
          model: Odds,
          as: 'odds',
          include: [
            {
              model: Bookmaker,
              as: 'bookmaker'
            }
          ]
        },
        {
          model: TipStat,
          as: 'stats'
        }
      ]
    });

    if (!tip) {
      return res.status(404).json({
        success: false,
        message: 'Tip no encontrado'
      });
    }

    // Registrar vista si el usuario está autenticado
    if (userId) {
      // Llamar a la función personalizada en PostgreSQL
      await sequelize.query(
        'SELECT increment_tip_view(:tipId, :userId)',
        {
          replacements: { tipId: id, userId },
          type: sequelize.QueryTypes.SELECT
        }
      );
    }

    res.json({
      success: true,
      data: tip
    });
  } catch (error) {
    logger.error('Error al obtener tip:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener tip',
      error: error.message
    });
  }
};

/**
 * Crea un nuevo tip
 */
const createTip = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const userId = req.user.id;
    const {
      title,
      description,
      sportId,
      leagueId,
      team1Name,
      team2Name,
      matchDatetime,
      predictionType,
      predictionValue,
      confidence,
      odds
    } = req.body;

    // Crear el tip
    const tip = await Tip.create({
      title,
      description,
      sport_id: sportId,
      league_id: leagueId,
      team1_name: team1Name,
      team2_name: team2Name,
      match_datetime: new Date(matchDatetime),
      prediction_type: predictionType,
      prediction_value: predictionValue,
      confidence,
      creator_id: userId
    }, { transaction });

    // Crear estadísticas del tip
    await TipStat.create({
      tip_id: tip.tip_id
    }, { transaction });

    // Crear las cuotas/momios si existen
    if (odds && odds.length > 0) {
      const oddsPromises = odds.map(odd => 
        Odds.create({
          tip_id: tip.tip_id,
          bookmaker_id: odd.bookmakerId,
          odds_value: odd.value
        }, { transaction })
      );
      
      await Promise.all(oddsPromises);
    }

    await transaction.commit();

    // Obtener el tip completo con relaciones
    const createdTip = await Tip.findByPk(tip.tip_id, {
      include: [
        {
          model: Sport,
          as: 'sport'
        },
        {
          model: League,
          as: 'league'
        },
        {
          model: Odds,
          as: 'odds',
          include: [
            {
              model: Bookmaker,
              as: 'bookmaker'
            }
          ]
        }
      ]
    });

    res.status(201).json({
      success: true,
      message: 'Tip creado exitosamente',
      data: createdTip
    });
  } catch (error) {
    await transaction.rollback();
    logger.error('Error al crear tip:', error);
    res.status(500).json({
      success: false,
      message: 'Error al crear tip',
      error: error.message
    });
  }
};

/**
 * Actualiza un tip existente
 */
const updateTip = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const {
      title,
      description,
      predictionType,
      predictionValue,
      confidence,
      matchStatus,
      matchResult,
      tipStatus,
      odds
    } = req.body;

    // Verificar que el tip existe
    const tip = await Tip.findByPk(id);
    if (!tip) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Tip no encontrado'
      });
    }

    // Verificar que el usuario es el creador o un admin
    if (tip.creator_id !== userId && req.user.roleId !== 1) {
      await transaction.rollback();
      return res.status(403).json({
        success: false,
        message: 'No tienes permiso para actualizar este tip'
      });
    }

    // Verificar que el tip no está completado o cancelado
    if (tip.match_status === 'completed' || tip.match_status === 'cancelled') {
      if (req.user.roleId !== 1) { // Solo admins pueden modificar tips completados
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'No se puede modificar un tip completado o cancelado'
        });
      }
    }

    // Actualizar el tip
    await tip.update({
      title: title || tip.title,
      description: description || tip.description,
      prediction_type: predictionType || tip.prediction_type,
      prediction_value: predictionValue || tip.prediction_value,
      confidence: confidence || tip.confidence,
      match_status: matchStatus || tip.match_status,
      match_result: matchResult || tip.match_result,
      tip_status: tipStatus || tip.tip_status
    }, { transaction });

    // Actualizar cuotas si existen
    if (odds && odds.length > 0) {
      // Eliminar cuotas existentes
      await Odds.destroy({
        where: { tip_id: id },
        transaction
      });

      // Crear nuevas cuotas
      const oddsPromises = odds.map(odd => 
        Odds.create({
          tip_id: id,
          bookmaker_id: odd.bookmakerId,
          odds_value: odd.value
        }, { transaction })
      );
      
      await Promise.all(oddsPromises);
    }

    await transaction.commit();

    // Obtener el tip actualizado con relaciones
    const updatedTip = await Tip.findByPk(id, {
      include: [
        {
          model: Sport,
          as: 'sport'
        },
        {
          model: League,
          as: 'league'
        },
        {
          model: Odds,
          as: 'odds',
          include: [
            {
              model: Bookmaker,
              as: 'bookmaker'
            }
          ]
        }
      ]
    });

    res.json({
      success: true,
      message: 'Tip actualizado exitosamente',
      data: updatedTip
    });
  } catch (error) {
    await transaction.rollback();
    logger.error('Error al actualizar tip:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar tip',
      error: error.message
    });
  }
};

/**
 * Elimina un tip
 */
const deleteTip = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Verificar que el tip existe
    const tip = await Tip.findByPk(id);
    if (!tip) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Tip no encontrado'
      });
    }

    // Verificar que el usuario es el creador o un admin
    if (tip.creator_id !== userId && req.user.roleId !== 1) {
      await transaction.rollback();
      return res.status(403).json({
        success: false,
        message: 'No tienes permiso para eliminar este tip'
      });
    }

    // Eliminar cuotas asociadas
    await Odds.destroy({
      where: { tip_id: id },
      transaction
    });

    // Eliminar estadísticas
    await TipStat.destroy({
      where: { tip_id: id },
      transaction
    });

    // Eliminar vistas
    await TipView.destroy({
      where: { tip_id: id },
      transaction
    });

    // Eliminar tip
    await tip.destroy({ transaction });

    await transaction.commit();

    res.json({
      success: true,
      message: 'Tip eliminado exitosamente'
    });
  } catch (error) {
    await transaction.rollback();
    logger.error('Error al eliminar tip:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar tip',
      error: error.message
    });
  }
};

/**
 * Obtiene tips populares (más vistos, más likes, etc.)
 */
const getPopularTips = async (req, res) => {
  try {
    const { limit = 5, type = 'views' } = req.query;

    // Determinar por qué campo ordenar
    let orderField;
    switch (type) {
      case 'likes':
        orderField = 'likes';
        break;
      case 'shares':
        orderField = 'shares';
        break;
      case 'views':
      default:
        orderField = 'views';
        break;
    }

    const tips = await Tip.findAll({
      include: [
        {
          model: Sport,
          as: 'sport'
        },
        {
          model: League,
          as: 'league'
        },
        {
          model: User,
          as: 'creator',
          include: [
            {
              model: Profile,
              as: 'profile'
            }
          ]
        },
        {
          model: TipStat,
          as: 'stats',
          required: true
        }
      ],
      order: [
        [{ model: TipStat, as: 'stats' }, orderField, 'DESC']
      ],
      limit: parseInt(limit)
    });

    res.json({
      success: true,
      data: tips
    });
  } catch (error) {
    logger.error('Error al obtener tips populares:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener tips populares',
      error: error.message
    });
  }
};

/**
 * Obtiene tips activos (en vivo)
 */
const getLiveTips = async (req, res) => {
  try {
    const tips = await Tip.findAll({
      where: {
        match_status: 'live'
      },
      include: [
        {
          model: Sport,
          as: 'sport'
        },
        {
          model: League,
          as: 'league'
        },
        {
          model: User,
          as: 'creator',
          include: [
            {
              model: Profile,
              as: 'profile'
            }
          ]
        },
        {
          model: Odds,
          as: 'odds',
          include: [
            {
              model: Bookmaker,
              as: 'bookmaker'
            }
          ]
        }
      ],
      order: [['match_datetime', 'ASC']]
    });

    res.json({
      success: true,
      data: tips
    });
  } catch (error) {
    logger.error('Error al obtener tips en vivo:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener tips en vivo',
      error: error.message
    });
  }
};

/**
 * Obtiene tips próximos (programados)
 */
const getUpcomingTips = async (req, res) => {
  try {
    const { hours = 24, limit = 10 } = req.query;
    
    const endDate = new Date();
    endDate.setHours(endDate.getHours() + parseInt(hours));

    const tips = await Tip.findAll({
      where: {
        match_status: 'scheduled',
        match_datetime: {
          [Op.gt]: new Date(),
          [Op.lt]: endDate
        }
      },
      include: [
        {
          model: Sport,
          as: 'sport'
        },
        {
          model: League,
          as: 'league'
        },
        {
          model: User,
          as: 'creator',
          include: [
            {
              model: Profile,
              as: 'profile'
            }
          ]
        },
        {
          model: Odds,
          as: 'odds',
          include: [
            {
              model: Bookmaker,
              as: 'bookmaker'
            }
          ]
        }
      ],
      order: [['match_datetime', 'ASC']],
      limit: parseInt(limit)
    });

    res.json({
      success: true,
      data: tips
    });
  } catch (error) {
    logger.error('Error al obtener tips próximos:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener tips próximos',
      error: error.message
    });
  }
};

module.exports = {
  getTips,
  getTipById,
  createTip,
  updateTip,
  deleteTip,
  getPopularTips,
  getLiveTips,
  getUpcomingTips
};