const {
  Parlay,
  Tip,
  ParlayTip,
  User,
  Profile,
  Sport,
  League,
  Odds,
  Bookmaker,
} = require("../models");
const logger = require("../utils/logger");
const { sequelize } = require("../config/database");
const { Op } = require("sequelize");

/**
 * Obtiene todos los parlays con filtros opcionales y respetando suscripción
 */
const getParlays = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      status,
      creatorId,
      page = 1,
      limit = 10,
      sortBy = "created_at",
      sortDir = "DESC",
    } = req.query;

    // 1. Primero obtenemos todos los parlays a los que el usuario tiene acceso por suscripción
    const accessibleParlays = await sequelize.query(
      "SELECT parlay_id FROM get_accessible_parlays(:userId)",
      {
        replacements: { userId },
        type: sequelize.QueryTypes.SELECT,
      }
    );

    // Si no hay parlays accesibles, devolvemos array vacío
    if (!accessibleParlays || accessibleParlays.length === 0) {
      return res.json({
        success: true,
        data: {
          parlays: [],
          pagination: {
            total: 0,
            pages: 0,
            currentPage: parseInt(page),
            limit: parseInt(limit),
          },
        },
      });
    }

    // Extraer los IDs de parlays accesibles
    const accessibleParlayIds = accessibleParlays.map(
      (parlay) => parlay.parlay_id
    );

    // 2. Construir condiciones de filtrado manteniendo los filtros originales
    const where = {
      parlay_id: {
        [Op.in]: accessibleParlayIds, // Solo incluir los parlays accesibles
      },
    };

    if (status) where.status = status;
    if (creatorId) where.creator_id = creatorId;

    // Calcular offset para paginación
    const offset = (page - 1) * limit;

    // 3. Obtener parlays con relaciones, aplicando todos los filtros
    const { count, rows } = await Parlay.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: "creator",
          attributes: ["user_id", "email"],
          include: [
            {
              model: Profile,
              as: "profile",
              attributes: ["first_name", "last_name", "avatar_url"],
            },
          ],
        },
        {
          model: Tip,
          as: "tips",
          through: { attributes: [] },
          include: [
            {
              model: Sport,
              as: "sport",
              attributes: ["sport_id", "name"],
            },
            {
              model: League,
              as: "league",
              attributes: ["league_id", "name", "country"],
            },
            {
              model: Odds,
              as: "odds",
              include: [
                {
                  model: Bookmaker,
                  as: "bookmaker",
                  attributes: ["bookmaker_id", "name"],
                },
              ],
            },
          ],
        },
      ],
      order: [[sortBy, sortDir]],
      limit: parseInt(limit),
      offset,
    });

    // Calcular páginas totales
    const totalPages = Math.ceil(count / limit);

    res.json({
      success: true,
      data: {
        parlays: rows,
        pagination: {
          total: count,
          pages: totalPages,
          currentPage: parseInt(page),
          limit: parseInt(limit),
        },
      },
    });
  } catch (error) {
    logger.error("Error al obtener parlays:", error);
    res.status(500).json({
      success: false,
      message: "Error al obtener parlays",
      error: error.message,
    });
  }
};

/**
 * Obtiene un parlay por su ID
 */
const getParlayById = async (req, res) => {
  try {
    const { id } = req.params;

    const parlay = await Parlay.findByPk(id, {
      include: [
        {
          model: User,
          as: "creator",
          attributes: ["user_id", "email"],
          include: [
            {
              model: Profile,
              as: "profile",
              attributes: ["first_name", "last_name", "avatar_url"],
            },
          ],
        },
        {
          model: Tip,
          as: "tips",
          through: { attributes: [] },
          include: [
            {
              model: Sport,
              as: "sport",
              attributes: ["sport_id", "name"],
            },
            {
              model: League,
              as: "league",
              attributes: ["league_id", "name", "country"],
            },
            {
              model: Odds,
              as: "odds",
              include: [
                {
                  model: Bookmaker,
                  as: "bookmaker",
                  attributes: ["bookmaker_id", "name"],
                },
              ],
            },
          ],
        },
      ],
    });

    if (!parlay) {
      return res.status(404).json({
        success: false,
        message: "Parlay no encontrado",
      });
    }

    res.json({
      success: true,
      data: parlay,
    });
  } catch (error) {
    logger.error("Error al obtener parlay:", error);
    res.status(500).json({
      success: false,
      message: "Error al obtener parlay",
      error: error.message,
    });
  }
};

/**
 * Crea un nuevo parlay
 */
const createParlay = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const userId = req.user.id;
    const { title, description, tipIds, subscriptionLevel } = req.body;

    // Verificar que se proporcionaron tips
    if (!tipIds || !Array.isArray(tipIds) || tipIds.length < 2) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "Se requieren al menos 2 tips para crear un parlay",
      });
    }

    // Verificar que todos los tips existen
    const tips = await Tip.findAll({
      where: {
        tip_id: {
          [Op.in]: tipIds,
        },
      },
      include: [
        {
          model: Odds,
          as: "odds",
          where: { bookmaker_id: 1 }, // Casa de apuestas principal para calcular cuota total
          required: false,
        },
      ],
    });

    if (tips.length !== tipIds.length) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "Uno o más tips no existen",
      });
    }

    // Verificar que todos los tips están pendientes
    const nonPendingTips = tips.filter((tip) => tip.tip_status !== "pending");
    if (nonPendingTips.length > 0) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "Solo se pueden incluir tips pendientes en un parlay",
      });
    }

    // Calcular cuota total multiplicando las cuotas individuales
    let totalOdds = 1;
    for (const tip of tips) {
      if (tip.odds && tip.odds.length > 0) {
        totalOdds *= parseFloat(tip.odds[0].odds_value);
      }
    }

    // Crear parlay
    const parlay = await Parlay.create(
      {
        title,
        description,
        creator_id: userId,
        total_odds: totalOdds.toFixed(2),
        status: "pending",
        subscription_level: subscriptionLevel || 1,
      },
      { transaction }
    );

    // MODIFICACIÓN: Asegurarse de que parlay_id esté definido y loguear para depuración
    console.log("Parlay creado con ID:", parlay.parlay_id);

    if (!parlay.parlay_id) {
      await transaction.rollback();
      return res.status(500).json({
        success: false,
        message: "Error al crear parlay: No se generó un ID válido",
      });
    }

    // Crear relaciones con los tips
    const parlayTipsPromises = tipIds.map((tipId) =>
      ParlayTip.create(
        {
          parlay_id: parlay.parlay_id, // Aseguramos que este valor no sea nulo
          tip_id: tipId,
        },
        { transaction }
      )
    );

    await Promise.all(parlayTipsPromises);

    await transaction.commit();

    // Obtener el parlay completo con relaciones
    const createdParlay = await Parlay.findByPk(parlay.parlay_id, {
      include: [
        {
          model: Tip,
          as: "tips",
          through: { attributes: [] },
          include: [
            {
              model: Sport,
              as: "sport",
            },
            {
              model: League,
              as: "league",
            },
            {
              model: Odds,
              as: "odds",
              include: [
                {
                  model: Bookmaker,
                  as: "bookmaker",
                },
              ],
            },
          ],
        },
      ],
    });

    res.status(201).json({
      success: true,
      message: "Parlay creado exitosamente",
      data: createdParlay,
    });
  } catch (error) {
    await transaction.rollback();
    logger.error("Error al crear parlay:", error);
    res.status(500).json({
      success: false,
      message: "Error al crear parlay",
      error: error.message,
    });
  }
};

/**
 * Actualiza un parlay existente
 */
const updateParlay = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { title, description, tipIds, subscriptionLevel } = req.body;

    // Verificar que el parlay existe
    const parlay = await Parlay.findByPk(id);
    if (!parlay) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: "Parlay no encontrado",
      });
    }

    // Verificar que el usuario es el creador o un admin
    if (parlay.creator_id !== userId && req.user.roleId !== 1) {
      await transaction.rollback();
      return res.status(403).json({
        success: false,
        message: "No tienes permiso para actualizar este parlay",
      });
    }

    // Verificar que solo admin puede cambiar nivel de suscripción a un nivel superior
    if (subscriptionLevel && subscriptionLevel > parlay.subscription_level && req.user.roleId !== 1) {
      await transaction.rollback();
      return res.status(403).json({
        success: false,
        message: 'Solo los administradores pueden aumentar el nivel de suscripción requerido'
      });
    }

    // Verificar que el parlay está pendiente
    if (parlay.status !== "pending") {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "Solo se pueden actualizar parlays pendientes",
      });
    }

    // Actualizar propiedades básicas
    await parlay.update(
      {
        title: title || parlay.title,
        description: description || parlay.description,
        subscription_level: subscriptionLevel || parlay.subscription_level
      },
      { transaction }
    );

    // Si se proporcionaron nuevos tips, actualizar las relaciones
    if (tipIds && Array.isArray(tipIds) && tipIds.length >= 2) {
      // Verificar que todos los tips existen
      const tips = await Tip.findAll({
        where: {
          tip_id: {
            [Op.in]: tipIds,
          },
        },
        include: [
          {
            model: Odds,
            as: "odds",
            where: { bookmaker_id: 1 }, // Casa de apuestas principal para calcular cuota total
            required: false,
          },
        ],
      });

      if (tips.length !== tipIds.length) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: "Uno o más tips no existen",
        });
      }

      // Verificar que todos los tips están pendientes
      const nonPendingTips = tips.filter((tip) => tip.tip_status !== "pending");
      if (nonPendingTips.length > 0) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: "Solo se pueden incluir tips pendientes en un parlay",
        });
      }

      // Eliminar relaciones existentes
      await ParlayTip.destroy({
        where: { parlay_id: id },
        transaction,
      });

      // Crear nuevas relaciones
      const parlayTipsPromises = tipIds.map((tipId) =>
        ParlayTip.create(
          {
            parlay_id: id,
            tip_id: tipId,
          },
          { transaction }
        )
      );

      await Promise.all(parlayTipsPromises);

      // Calcular cuota total multiplicando las cuotas individuales
      let totalOdds = 1;
      for (const tip of tips) {
        if (tip.odds && tip.odds.length > 0) {
          totalOdds *= parseFloat(tip.odds[0].odds_value);
        }
      }

      // Actualizar cuota total
      await parlay.update(
        {
          total_odds: totalOdds.toFixed(2),
        },
        { transaction }
      );
    }

    await transaction.commit();

    // Obtener el parlay actualizado con relaciones
    const updatedParlay = await Parlay.findByPk(id, {
      include: [
        {
          model: Tip,
          as: "tips",
          through: { attributes: [] },
          include: [
            {
              model: Sport,
              as: "sport",
            },
            {
              model: League,
              as: "league",
            },
            {
              model: Odds,
              as: "odds",
              include: [
                {
                  model: Bookmaker,
                  as: "bookmaker",
                },
              ],
            },
          ],
        },
      ],
    });

    res.json({
      success: true,
      message: "Parlay actualizado exitosamente",
      data: updatedParlay,
    });
  } catch (error) {
    await transaction.rollback();
    logger.error("Error al actualizar parlay:", error);
    res.status(500).json({
      success: false,
      message: "Error al actualizar parlay",
      error: error.message,
    });
  }
};

/**
 * Elimina un parlay
 */
const deleteParlay = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Verificar que el parlay existe
    const parlay = await Parlay.findByPk(id);
    if (!parlay) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: "Parlay no encontrado",
      });
    }

    // Verificar que el usuario es el creador o un admin
    if (parlay.creator_id !== userId && req.user.roleId !== 1) {
      await transaction.rollback();
      return res.status(403).json({
        success: false,
        message: "No tienes permiso para eliminar este parlay",
      });
    }

    // Eliminar relaciones con tips
    await ParlayTip.destroy({
      where: { parlay_id: id },
      transaction,
    });

    // Eliminar parlay
    await parlay.destroy({ transaction });

    await transaction.commit();

    res.json({
      success: true,
      message: "Parlay eliminado exitosamente",
    });
  } catch (error) {
    await transaction.rollback();
    logger.error("Error al eliminar parlay:", error);
    res.status(500).json({
      success: false,
      message: "Error al eliminar parlay",
      error: error.message,
    });
  }
};

/**
 * Obtiene parlays populares o destacados respetando suscripción
 */
const getPopularParlays = async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 5 } = req.query;

    // 1. Primero obtenemos todos los parlays a los que el usuario tiene acceso por suscripción
    const accessibleParlays = await sequelize.query(
      "SELECT parlay_id FROM get_accessible_parlays(:userId)",
      {
        replacements: { userId },
        type: sequelize.QueryTypes.SELECT,
      }
    );

    // Si no hay parlays accesibles, devolvemos array vacío
    if (!accessibleParlays || accessibleParlays.length === 0) {
      return res.json({
        success: true,
        data: [],
      });
    }

    // Extraer los IDs de parlays accesibles
    const accessibleParlayIds = accessibleParlays.map(
      (parlay) => parlay.parlay_id
    );

    // Buscar parlays con mayores cuotas, que estén pendientes y que sean accesibles
    const parlays = await Parlay.findAll({
      where: {
        status: "pending",
        parlay_id: {
          [Op.in]: accessibleParlayIds,
        },
      },
      include: [
        {
          model: User,
          as: "creator",
          attributes: ["user_id", "email"],
          include: [
            {
              model: Profile,
              as: "profile",
              attributes: ["first_name", "last_name", "avatar_url"],
            },
          ],
        },
        {
          model: Tip,
          as: "tips",
          through: { attributes: [] },
          include: [
            {
              model: Sport,
              as: "sport",
              attributes: ["sport_id", "name"],
            },
            {
              model: League,
              as: "league",
              attributes: ["league_id", "name"],
            },
          ],
        },
      ],
      order: [["total_odds", "DESC"]],
      limit: parseInt(limit),
    });

    res.json({
      success: true,
      data: parlays,
    });
  } catch (error) {
    logger.error("Error al obtener parlays populares:", error);
    res.status(500).json({
      success: false,
      message: "Error al obtener parlays populares",
      error: error.message,
    });
  }
};

/**
 * Obtiene estadísticas de parlays
 */
const getParlayStats = async (req, res) => {
  try {
    // Obtener estadísticas generales de parlays
    const parlayStats = await sequelize.query(
      `
      SELECT 
        COUNT(*) as total_parlays,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_parlays,
        COUNT(CASE WHEN status = 'won' THEN 1 END) as won_parlays,
        COUNT(CASE WHEN status = 'lost' THEN 1 END) as lost_parlays,
        COUNT(CASE WHEN status = 'partial' THEN 1 END) as partial_parlays,
        AVG(total_odds) as average_odds,
        AVG(CASE WHEN status = 'won' THEN total_odds ELSE NULL END) as average_winning_odds,
        AVG(ARRAY_LENGTH(ARRAY(
          SELECT tip_id FROM parlay_tips WHERE parlay_id = p.parlay_id
        ), 1)) as average_tips_per_parlay
      FROM parlays p
    `,
      {
        type: sequelize.QueryTypes.SELECT,
      }
    );

    // Obtener estadísticas por usuario (top tipsters de parlays)
    const userParlayStats = await sequelize.query(
      `
      SELECT 
        u.user_id,
        u.email,
        CONCAT(pr.first_name, ' ', pr.last_name) as tipster_name,
        COUNT(*) as total_parlays,
        COUNT(CASE WHEN p.status = 'won' THEN 1 END) as won_parlays,
        COUNT(CASE WHEN p.status = 'lost' THEN 1 END) as lost_parlays,
        CASE WHEN COUNT(CASE WHEN p.status IN ('won', 'lost') THEN 1 END) > 0
          THEN (COUNT(CASE WHEN p.status = 'won' THEN 1 END)::FLOAT / 
                COUNT(CASE WHEN p.status IN ('won', 'lost') THEN 1 END)) * 100
          ELSE 0
        END as success_rate,
        AVG(p.total_odds) as average_odds
      FROM parlays p
      JOIN users u ON p.creator_id = u.user_id
      JOIN profiles pr ON u.user_id = pr.user_id
      GROUP BY u.user_id, u.email, tipster_name
      HAVING COUNT(*) >= 5
      ORDER BY success_rate DESC, total_parlays DESC
      LIMIT 10
    `,
      {
        type: sequelize.QueryTypes.SELECT,
      }
    );

    res.json({
      success: true,
      data: {
        global: parlayStats[0],
        topTipsters: userParlayStats,
      },
    });
  } catch (error) {
    logger.error("Error al obtener estadísticas de parlays:", error);
    res.status(500).json({
      success: false,
      message: "Error al obtener estadísticas de parlays",
      error: error.message,
    });
  }
};

module.exports = {
  getParlays,
  getParlayById,
  createParlay,
  updateParlay,
  deleteParlay,
  getPopularParlays,
  getParlayStats,
};
