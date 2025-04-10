const { Bookmaker, Odds } = require('../models');
const logger = require('../utils/logger');
const { sequelize } = require('../config/database');

/**
 * Obtiene todas las casas de apuestas
 */
const getBookmakers = async (req, res) => {
  try {
    const bookmakers = await Bookmaker.findAll({
      order: [['name', 'ASC']]
    });

    res.json({
      success: true,
      data: bookmakers
    });
  } catch (error) {
    logger.error('Error al obtener casas de apuestas:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener casas de apuestas',
      error: error.message
    });
  }
};

/**
 * Obtiene una casa de apuestas por su ID
 */
const getBookmakerById = async (req, res) => {
  try {
    const { id } = req.params;

    const bookmaker = await Bookmaker.findByPk(id);

    if (!bookmaker) {
      return res.status(404).json({
        success: false,
        message: 'Casa de apuestas no encontrada'
      });
    }

    res.json({
      success: true,
      data: bookmaker
    });
  } catch (error) {
    logger.error('Error al obtener casa de apuestas:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener casa de apuestas',
      error: error.message
    });
  }
};

/**
 * Crea una nueva casa de apuestas (Solo admin)
 */
const createBookmaker = async (req, res) => {
  try {
    const { name, websiteUrl, logoUrl } = req.body;

    // Verificar si ya existe una casa de apuestas con ese nombre
    const existingBookmaker = await Bookmaker.findOne({
      where: { name }
    });

    if (existingBookmaker) {
      return res.status(400).json({
        success: false,
        message: 'Ya existe una casa de apuestas con ese nombre'
      });
    }

    // Crear nueva casa de apuestas
    const bookmaker = await Bookmaker.create({
      name,
      website_url: websiteUrl,
      logo_url: logoUrl
    });

    res.status(201).json({
      success: true,
      message: 'Casa de apuestas creada exitosamente',
      data: bookmaker
    });
  } catch (error) {
    logger.error('Error al crear casa de apuestas:', error);
    res.status(500).json({
      success: false,
      message: 'Error al crear casa de apuestas',
      error: error.message
    });
  }
};

/**
 * Actualiza una casa de apuestas existente (Solo admin)
 */
const updateBookmaker = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, websiteUrl, logoUrl } = req.body;

    // Verificar que la casa de apuestas existe
    const bookmaker = await Bookmaker.findByPk(id);

    if (!bookmaker) {
      return res.status(404).json({
        success: false,
        message: 'Casa de apuestas no encontrada'
      });
    }

    // Verificar que no exista otra casa de apuestas con el mismo nombre
    if (name && name !== bookmaker.name) {
      const existingBookmaker = await Bookmaker.findOne({
        where: { name }
      });

      if (existingBookmaker) {
        return res.status(400).json({
          success: false,
          message: 'Ya existe otra casa de apuestas con ese nombre'
        });
      }
    }

    // Actualizar casa de apuestas
    await bookmaker.update({
      name: name || bookmaker.name,
      website_url: websiteUrl || bookmaker.website_url,
      logo_url: logoUrl || bookmaker.logo_url
    });

    res.json({
      success: true,
      message: 'Casa de apuestas actualizada exitosamente',
      data: bookmaker
    });
  } catch (error) {
    logger.error('Error al actualizar casa de apuestas:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar casa de apuestas',
      error: error.message
    });
  }
};

/**
 * Elimina una casa de apuestas (Solo admin)
 */
const deleteBookmaker = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { id } = req.params;

    // Verificar que la casa de apuestas existe
    const bookmaker = await Bookmaker.findByPk(id);

    if (!bookmaker) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Casa de apuestas no encontrada'
      });
    }

    // Verificar si hay cuotas asociadas a esta casa de apuestas
    const hasOdds = await Odds.findOne({
      where: { bookmaker_id: id }
    });

    if (hasOdds) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'No se puede eliminar una casa de apuestas con cuotas asociadas'
      });
    }

    // Eliminar casa de apuestas
    await bookmaker.destroy({ transaction });

    await transaction.commit();

    res.json({
      success: true,
      message: 'Casa de apuestas eliminada exitosamente'
    });
  } catch (error) {
    await transaction.rollback();
    logger.error('Error al eliminar casa de apuestas:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar casa de apuestas',
      error: error.message
    });
  }
};

/**
 * Obtiene estadísticas de casas de apuestas
 */
const getBookmakerStats = async (req, res) => {
  try {
    // Consulta SQL nativa para obtener estadísticas de cuotas por casa de apuestas
    const bookmakerStats = await sequelize.query(`
      SELECT 
        b.bookmaker_id, 
        b.name, 
        COUNT(o.odds_id) as total_odds,
        AVG(o.odds_value) as average_odds,
        COUNT(DISTINCT t.tip_id) as total_tips,
        COUNT(DISTINCT CASE WHEN t.tip_status = 'won' THEN t.tip_id END) as won_tips,
        COUNT(DISTINCT CASE WHEN t.tip_status = 'lost' THEN t.tip_id END) as lost_tips
      FROM bookmakers b
      LEFT JOIN odds o ON b.bookmaker_id = o.bookmaker_id
      LEFT JOIN tips t ON o.tip_id = t.tip_id
      GROUP BY b.bookmaker_id, b.name
      ORDER BY total_odds DESC
    `, {
      type: sequelize.QueryTypes.SELECT
    });

    // Calcular porcentaje de éxito y formatear resultados
    const bookmarkersWithStats = bookmakerStats.map(bookmaker => {
      const completedTips = bookmaker.won_tips + bookmaker.lost_tips;
      const successRate = completedTips > 0 
        ? (bookmaker.won_tips / completedTips) * 100 
        : 0;
      
      return {
        ...bookmaker,
        average_odds: parseFloat(bookmaker.average_odds || 0).toFixed(2),
        success_rate: parseFloat(successRate.toFixed(2))
      };
    });

    res.json({
      success: true,
      data: bookmarkersWithStats
    });
  } catch (error) {
    logger.error('Error al obtener estadísticas de casas de apuestas:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener estadísticas de casas de apuestas',
      error: error.message
    });
  }
};

module.exports = {
  getBookmakers,
  getBookmakerById,
  createBookmaker,
  updateBookmaker,
  deleteBookmaker,
  getBookmakerStats
};