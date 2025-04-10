const { Sport, League, Tip } = require('../models');
const logger = require('../utils/logger');
const { sequelize } = require('../config/database');

/**
 * Obtiene todos los deportes
 */
const getSports = async (req, res) => {
  try {
    const sports = await Sport.findAll({
      order: [['name', 'ASC']]
    });

    res.json({
      success: true,
      data: sports
    });
  } catch (error) {
    logger.error('Error al obtener deportes:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener deportes',
      error: error.message
    });
  }
};

/**
 * Obtiene un deporte por su ID
 */
const getSportById = async (req, res) => {
  try {
    const { id } = req.params;

    const sport = await Sport.findByPk(id, {
      include: [
        {
          model: League,
          as: 'leagues'
        }
      ]
    });

    if (!sport) {
      return res.status(404).json({
        success: false,
        message: 'Deporte no encontrado'
      });
    }

    res.json({
      success: true,
      data: sport
    });
  } catch (error) {
    logger.error('Error al obtener deporte:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener deporte',
      error: error.message
    });
  }
};

/**
 * Crea un nuevo deporte (Solo admin)
 */
const createSport = async (req, res) => {
  try {
    const { name, description, iconUrl } = req.body;

    // Verificar si ya existe un deporte con ese nombre
    const existingSport = await Sport.findOne({
      where: { name }
    });

    if (existingSport) {
      return res.status(400).json({
        success: false,
        message: 'Ya existe un deporte con ese nombre'
      });
    }

    // Crear nuevo deporte
    const sport = await Sport.create({
      name,
      description,
      icon_url: iconUrl
    });

    res.status(201).json({
      success: true,
      message: 'Deporte creado exitosamente',
      data: sport
    });
  } catch (error) {
    logger.error('Error al crear deporte:', error);
    res.status(500).json({
      success: false,
      message: 'Error al crear deporte',
      error: error.message
    });
  }
};

/**
 * Actualiza un deporte existente (Solo admin)
 */
const updateSport = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, iconUrl } = req.body;

    // Verificar que el deporte existe
    const sport = await Sport.findByPk(id);

    if (!sport) {
      return res.status(404).json({
        success: false,
        message: 'Deporte no encontrado'
      });
    }

    // Verificar que no exista otro deporte con el mismo nombre
    if (name && name !== sport.name) {
      const existingSport = await Sport.findOne({
        where: { name }
      });

      if (existingSport) {
        return res.status(400).json({
          success: false,
          message: 'Ya existe otro deporte con ese nombre'
        });
      }
    }

    // Actualizar deporte
    await sport.update({
      name: name || sport.name,
      description: description || sport.description,
      icon_url: iconUrl || sport.icon_url
    });

    res.json({
      success: true,
      message: 'Deporte actualizado exitosamente',
      data: sport
    });
  } catch (error) {
    logger.error('Error al actualizar deporte:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar deporte',
      error: error.message
    });
  }
};

/**
 * Elimina un deporte (Solo admin)
 */
const deleteSport = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { id } = req.params;

    // Verificar que el deporte existe
    const sport = await Sport.findByPk(id);

    if (!sport) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Deporte no encontrado'
      });
    }

    // Verificar si hay tips asociados a este deporte
    const hasTips = await Tip.findOne({
      where: { sport_id: id }
    });

    if (hasTips) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'No se puede eliminar un deporte con tips asociados'
      });
    }

    // Eliminar ligas asociadas al deporte
    await League.destroy({
      where: { sport_id: id },
      transaction
    });

    // Eliminar deporte
    await sport.destroy({ transaction });

    await transaction.commit();

    res.json({
      success: true,
      message: 'Deporte y sus ligas eliminados exitosamente'
    });
  } catch (error) {
    await transaction.rollback();
    logger.error('Error al eliminar deporte:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar deporte',
      error: error.message
    });
  }
};

/**
 * Obtiene estadísticas por deporte
 */
const getSportStats = async (req, res) => {
  try {
    // Consulta SQL nativa para obtener estadísticas
    const sportStats = await sequelize.query(`
      SELECT 
        s.sport_id, 
        s.name, 
        COUNT(t.tip_id) as total_tips,
        COUNT(CASE WHEN t.tip_status = 'won' THEN 1 END) as won_tips,
        COUNT(CASE WHEN t.tip_status = 'lost' THEN 1 END) as lost_tips,
        COUNT(CASE WHEN t.tip_status = 'pending' THEN 1 END) as pending_tips,
        COUNT(DISTINCT l.league_id) as total_leagues
      FROM sports s
      LEFT JOIN tips t ON s.sport_id = t.sport_id
      LEFT JOIN leagues l ON s.sport_id = l.sport_id
      GROUP BY s.sport_id, s.name
      ORDER BY total_tips DESC
    `, {
      type: sequelize.QueryTypes.SELECT
    });

    // Calcular porcentaje de éxito
    const sportsWithSuccess = sportStats.map(sport => {
      const completedTips = sport.won_tips + sport.lost_tips;
      const successRate = completedTips > 0 
        ? (sport.won_tips / completedTips) * 100 
        : 0;
      
      return {
        ...sport,
        success_rate: parseFloat(successRate.toFixed(2))
      };
    });

    res.json({
      success: true,
      data: sportsWithSuccess
    });
  } catch (error) {
    logger.error('Error al obtener estadísticas por deporte:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener estadísticas por deporte',
      error: error.message
    });
  }
};

module.exports = {
  getSports,
  getSportById,
  createSport,
  updateSport,
  deleteSport,
  getSportStats
};