const { League, Sport, Tip } = require('../models');
const logger = require('../utils/logger');
const { sequelize } = require('../config/database');
const { Op } = require('sequelize');

/**
 * Obtiene todas las ligas, opcionalmente filtradas por deporte
 */
const getLeagues = async (req, res) => {
  try {
    const { sportId } = req.query;
    
    // Filtro opcional por deporte
    const where = {};
    if (sportId) {
      where.sport_id = sportId;
    }

    const leagues = await League.findAll({
      where,
      include: [
        {
          model: Sport,
          as: 'sport',
          attributes: ['sport_id', 'name']
        }
      ],
      order: [
        ['country', 'ASC'],
        ['name', 'ASC']
      ]
    });

    res.json({
      success: true,
      data: leagues
    });
  } catch (error) {
    logger.error('Error al obtener ligas:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener ligas',
      error: error.message
    });
  }
};

/**
 * Obtiene una liga por su ID
 */
const getLeagueById = async (req, res) => {
  try {
    const { id } = req.params;

    const league = await League.findByPk(id, {
      include: [
        {
          model: Sport,
          as: 'sport'
        }
      ]
    });

    if (!league) {
      return res.status(404).json({
        success: false,
        message: 'Liga no encontrada'
      });
    }

    res.json({
      success: true,
      data: league
    });
  } catch (error) {
    logger.error('Error al obtener liga:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener liga',
      error: error.message
    });
  }
};

/**
 * Crea una nueva liga (Solo admin)
 */
const createLeague = async (req, res) => {
  try {
    const { sportId, name, country, iconUrl } = req.body;

    // Verificar que el deporte existe
    const sport = await Sport.findByPk(sportId);
    if (!sport) {
      return res.status(404).json({
        success: false,
        message: 'Deporte no encontrado'
      });
    }

    // Verificar si ya existe una liga con ese nombre en ese deporte
    const existingLeague = await League.findOne({
      where: { 
        sport_id: sportId,
        name
      }
    });

    if (existingLeague) {
      return res.status(400).json({
        success: false,
        message: 'Ya existe una liga con ese nombre en ese deporte'
      });
    }

    // Crear nueva liga
    const league = await League.create({
      sport_id: sportId,
      name,
      country,
      icon_url: iconUrl
    });

    res.status(201).json({
      success: true,
      message: 'Liga creada exitosamente',
      data: league
    });
  } catch (error) {
    logger.error('Error al crear liga:', error);
    res.status(500).json({
      success: false,
      message: 'Error al crear liga',
      error: error.message
    });
  }
};

/**
 * Actualiza una liga existente (Solo admin)
 */
const updateLeague = async (req, res) => {
  try {
    const { id } = req.params;
    const { sportId, name, country, iconUrl } = req.body;

    // Verificar que la liga existe
    const league = await League.findByPk(id);
    if (!league) {
      return res.status(404).json({
        success: false,
        message: 'Liga no encontrada'
      });
    }

    // Si cambia el deporte, verificar que el nuevo deporte existe
    if (sportId && sportId !== league.sport_id) {
      const sport = await Sport.findByPk(sportId);
      if (!sport) {
        return res.status(404).json({
          success: false,
          message: 'Deporte no encontrado'
        });
      }
    }

    // Verificar que no exista otra liga con el mismo nombre en el mismo deporte
    if (name && (name !== league.name || (sportId && sportId !== league.sport_id))) {
      const existingLeague = await League.findOne({
        where: { 
          sport_id: sportId || league.sport_id,
          name,
          league_id: { [Op.ne]: id }
        }
      });

      if (existingLeague) {
        return res.status(400).json({
          success: false,
          message: 'Ya existe otra liga con ese nombre en ese deporte'
        });
      }
    }

    // Actualizar liga
    await league.update({
      sport_id: sportId || league.sport_id,
      name: name || league.name,
      country: country || league.country,
      icon_url: iconUrl || league.icon_url
    });

    res.json({
      success: true,
      message: 'Liga actualizada exitosamente',
      data: league
    });
  } catch (error) {
    logger.error('Error al actualizar liga:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar liga',
      error: error.message
    });
  }
};

/**
 * Elimina una liga (Solo admin)
 */
const deleteLeague = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { id } = req.params;

    // Verificar que la liga existe
    const league = await League.findByPk(id);
    if (!league) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Liga no encontrada'
      });
    }

    // Verificar si hay tips asociados a esta liga
    const hasTips = await Tip.findOne({
      where: { league_id: id }
    });

    if (hasTips) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'No se puede eliminar una liga con tips asociados'
      });
    }

    // Eliminar liga
    await league.destroy({ transaction });

    await transaction.commit();

    res.json({
      success: true,
      message: 'Liga eliminada exitosamente'
    });
  } catch (error) {
    await transaction.rollback();
    logger.error('Error al eliminar liga:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar liga',
      error: error.message
    });
  }
};

/**
 * Obtiene estadísticas por liga
 */
const getLeagueStats = async (req, res) => {
  try {
    const { sportId } = req.query;
    
    // Filtro opcional por deporte
    const where = sportId ? `WHERE l.sport_id = ${sportId}` : '';

    // Consulta SQL nativa para obtener estadísticas
    const leagueStats = await sequelize.query(`
      SELECT 
        l.league_id, 
        l.name as league_name,
        l.country,
        s.sport_id,
        s.name as sport_name,
        COUNT(t.tip_id) as total_tips,
        COUNT(CASE WHEN t.tip_status = 'won' THEN 1 END) as won_tips,
        COUNT(CASE WHEN t.tip_status = 'lost' THEN 1 END) as lost_tips,
        COUNT(CASE WHEN t.tip_status = 'pending' THEN 1 END) as pending_tips,
        COUNT(DISTINCT t.creator_id) as unique_tipsters,
        COUNT(DISTINCT CASE WHEN t.match_status = 'scheduled' AND t.match_datetime > NOW() THEN t.tip_id END) as upcoming_tips
      FROM leagues l
      JOIN sports s ON l.sport_id = s.sport_id
      LEFT JOIN tips t ON l.league_id = t.league_id
      ${where}
      GROUP BY l.league_id, l.name, l.country, s.sport_id, s.name
      ORDER BY total_tips DESC
    `, {
      type: sequelize.QueryTypes.SELECT
    });

    // Calcular porcentaje de éxito
    const leaguesWithSuccess = leagueStats.map(league => {
      const completedTips = league.won_tips + league.lost_tips;
      const successRate = completedTips > 0 
        ? (league.won_tips / completedTips) * 100 
        : 0;
      
      return {
        ...league,
        success_rate: parseFloat(successRate.toFixed(2))
      };
    });

    res.json({
      success: true,
      data: leaguesWithSuccess
    });
  } catch (error) {
    logger.error('Error al obtener estadísticas por liga:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener estadísticas por liga',
      error: error.message
    });
  }
};

module.exports = {
  getLeagues,
  getLeagueById,
  createLeague,
  updateLeague,
  deleteLeague,
  getLeagueStats
};