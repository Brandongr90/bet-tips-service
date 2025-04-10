const { User, Profile, Role, UserStat, UserSubscription, Subscription, Tip } = require('../models');
const logger = require('../utils/logger');
const { sequelize } = require('../config/database');
const { Op } = require('sequelize');

/**
 * Obtiene todos los usuarios (solo admin)
 */
const getUsers = async (req, res) => {
  try {
    const { 
      roleId, 
      isActive, 
      search, 
      page = 1, 
      limit = 10,
      sortBy = 'created_at',
      sortDir = 'DESC'
    } = req.query;

    // Construir condiciones de filtrado
    const where = {};
    
    if (roleId) {
      where['$profile.role_id$'] = roleId;
    }
    
    if (isActive !== undefined) {
      where.is_active = isActive === 'true';
    }
    
    if (search) {
      where[Op.or] = [
        { email: { [Op.iLike]: `%${search}%` } },
        { '$profile.first_name$': { [Op.iLike]: `%${search}%` } },
        { '$profile.last_name$': { [Op.iLike]: `%${search}%` } }
      ];
    }

    // Calcular offset para paginación
    const offset = (page - 1) * limit;

    // Obtener usuarios con relaciones
    const { count, rows } = await User.findAndCountAll({
      where,
      attributes: ['user_id', 'email', 'is_active', 'last_login', 'created_at'],
      include: [
        {
          model: Profile,
          as: 'profile',
          include: [
            {
              model: Role,
              as: 'role'
            },
            {
              model: Subscription,
              as: 'subscription'
            }
          ]
        },
        {
          model: UserStat,
          as: 'stats'
        }
      ],
      order: [[sortBy, sortDir]],
      limit: parseInt(limit),
      offset,
      subQuery: false
    });

    // Calcular páginas totales
    const totalPages = Math.ceil(count / limit);

    res.json({
      success: true,
      data: {
        users: rows,
        pagination: {
          total: count,
          pages: totalPages,
          currentPage: parseInt(page),
          limit: parseInt(limit)
        }
      }
    });
  } catch (error) {
    logger.error('Error al obtener usuarios:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener usuarios',
      error: error.message
    });
  }
};

/**
 * Obtiene un usuario por su ID
 */
const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const requesterId = req.user.id;
    const requesterRole = req.user.roleId;
    
    // Solo el propio usuario o un admin pueden ver detalles de usuario
    if (id !== requesterId && requesterRole !== 1) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permiso para ver este usuario'
      });
    }

    const user = await User.findByPk(id, {
      attributes: ['user_id', 'email', 'is_active', 'last_login', 'created_at'],
      include: [
        {
          model: Profile,
          as: 'profile',
          include: [
            {
              model: Role,
              as: 'role'
            },
            {
              model: Subscription,
              as: 'subscription'
            }
          ]
        },
        {
          model: UserStat,
          as: 'stats'
        },
        {
          model: UserSubscription,
          as: 'subscriptions',
          include: [
            {
              model: Subscription,
              as: 'subscription'
            }
          ],
          where: {
            end_date: {
              [Op.gt]: new Date()
            }
          },
          required: false,
          limit: 1,
          order: [['end_date', 'DESC']]
        }
      ]
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    logger.error('Error al obtener usuario:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener usuario',
      error: error.message
    });
  }
};

/**
 * Actualiza un usuario (admin o el propio usuario)
 */
const updateUser = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { id } = req.params;
    const requesterId = req.user.id;
    const requesterRole = req.user.roleId;
    const { email, isActive, roleId, firstName, lastName, bio, avatarUrl } = req.body;
    
    // Solo el propio usuario o un admin pueden actualizar un usuario
    if (id !== requesterId && requesterRole !== 1) {
      await transaction.rollback();
      return res.status(403).json({
        success: false,
        message: 'No tienes permiso para actualizar este usuario'
      });
    }

    // Verificar que el usuario existe
    const user = await User.findByPk(id);
    if (!user) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    // Si se intenta cambiar el email, verificar que no esté en uso
    if (email && email !== user.email) {
      const existingUser = await User.findOne({ where: { email } });
      if (existingUser) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'El correo electrónico ya está en uso'
        });
      }
      
      // Solo admin puede cambiar email
      if (requesterRole !== 1) {
        await transaction.rollback();
        return res.status(403).json({
          success: false,
          message: 'No tienes permiso para cambiar el email'
        });
      }
    }

    // Solo admin puede cambiar el estado activo o el rol
    if ((isActive !== undefined || roleId) && requesterRole !== 1) {
      await transaction.rollback();
      return res.status(403).json({
        success: false,
        message: 'No tienes permiso para cambiar el estado activo o el rol'
      });
    }

    // Actualizar usuario
    const userUpdates = {};
    if (email) userUpdates.email = email;
    if (isActive !== undefined) userUpdates.is_active = isActive;

    if (Object.keys(userUpdates).length > 0) {
      await user.update(userUpdates, { transaction });
    }

    // Buscar perfil existente
    let profile = await Profile.findOne({
      where: { user_id: id }
    });

    // Actualizar o crear perfil
    const profileUpdates = {};
    if (firstName) profileUpdates.first_name = firstName;
    if (lastName) profileUpdates.last_name = lastName;
    if (bio) profileUpdates.bio = bio;
    if (avatarUrl) profileUpdates.avatar_url = avatarUrl;
    if (roleId && requesterRole === 1) profileUpdates.role_id = roleId;

    if (profile) {
      if (Object.keys(profileUpdates).length > 0) {
        await profile.update(profileUpdates, { transaction });
      }
    } else {
      profileUpdates.user_id = id;
      profileUpdates.role_id = roleId || 3; // 'user' por defecto
      profileUpdates.subscription_id = 1; // 'Gratis' por defecto
      profile = await Profile.create(profileUpdates, { transaction });
    }

    await transaction.commit();

    // Obtener usuario actualizado
    const updatedUser = await User.findByPk(id, {
      attributes: ['user_id', 'email', 'is_active', 'last_login', 'created_at'],
      include: [
        {
          model: Profile,
          as: 'profile',
          include: [
            {
              model: Role,
              as: 'role'
            }
          ]
        }
      ]
    });

    res.json({
      success: true,
      message: 'Usuario actualizado exitosamente',
      data: updatedUser
    });
  } catch (error) {
    await transaction.rollback();
    logger.error('Error al actualizar usuario:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar usuario',
      error: error.message
    });
  }
};

/**
 * Elimina un usuario (solo admin)
 */
const deleteUser = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { id } = req.params;

    // Verificar que el usuario existe
    const user = await User.findByPk(id);
    if (!user) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    // Verificar si el usuario tiene tips
    const userTips = await Tip.count({
      where: { creator_id: id }
    });

    if (userTips > 0) {
      // Si tiene tips, desactivar en lugar de eliminar
      await user.update({ is_active: false }, { transaction });
      
      await transaction.commit();
      
      return res.json({
        success: true,
        message: 'Usuario desactivado exitosamente. No se puede eliminar porque tiene tips asociados'
      });
    }

    // Si no tiene tips, eliminar usuario y todos sus datos asociados
    await sequelize.query(`
      DELETE FROM profiles WHERE user_id = :userId;
      DELETE FROM user_stats WHERE user_id = :userId;
      DELETE FROM user_subscriptions WHERE user_id = :userId;
      DELETE FROM tip_views WHERE viewer_id = :userId;
      DELETE FROM users WHERE user_id = :userId;
    `, {
      replacements: { userId: id },
      type: sequelize.QueryTypes.DELETE,
      transaction
    });

    await transaction.commit();

    res.json({
      success: true,
      message: 'Usuario y todos sus datos eliminados exitosamente'
    });
  } catch (error) {
    await transaction.rollback();
    logger.error('Error al eliminar usuario:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar usuario',
      error: error.message
    });
  }
};

/**
 * Obtiene las estadísticas de un usuario
 */
const getUserStats = async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar que el usuario existe
    const user = await User.findByPk(id, {
      include: [
        {
          model: Profile,
          as: 'profile',
          include: [
            {
              model: Role,
              as: 'role'
            }
          ]
        },
        {
          model: UserStat,
          as: 'stats'
        }
      ]
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    // Estadísticas detalladas de tips
    const tipStats = await sequelize.query(`
      SELECT 
        COUNT(*) as total_tips,
        COUNT(CASE WHEN tip_status = 'won' THEN 1 END) as won_tips,
        COUNT(CASE WHEN tip_status = 'lost' THEN 1 END) as lost_tips,
        COUNT(CASE WHEN tip_status = 'pending' THEN 1 END) as pending_tips,
        COUNT(CASE WHEN match_status = 'live' THEN 1 END) as live_tips,
        COUNT(DISTINCT sport_id) as sports_count,
        COUNT(DISTINCT league_id) as leagues_count,
        CASE WHEN COUNT(CASE WHEN tip_status IN ('won', 'lost') THEN 1 END) > 0
          THEN (COUNT(CASE WHEN tip_status = 'won' THEN 1 END)::FLOAT / 
                COUNT(CASE WHEN tip_status IN ('won', 'lost') THEN 1 END)) * 100
          ELSE 0
        END as success_rate,
        AVG(confidence) as avg_confidence
      FROM tips
      WHERE creator_id = :userId
    `, {
      replacements: { userId: id },
      type: sequelize.QueryTypes.SELECT
    });

    // Estadísticas por deporte
    const sportStats = await sequelize.query(`
      SELECT 
        s.sport_id,
        s.name as sport_name,
        COUNT(t.tip_id) as total_tips,
        COUNT(CASE WHEN t.tip_status = 'won' THEN 1 END) as won_tips,
        COUNT(CASE WHEN t.tip_status = 'lost' THEN 1 END) as lost_tips,
        CASE WHEN COUNT(CASE WHEN t.tip_status IN ('won', 'lost') THEN 1 END) > 0
          THEN (COUNT(CASE WHEN t.tip_status = 'won' THEN 1 END)::FLOAT / 
                COUNT(CASE WHEN t.tip_status IN ('won', 'lost') THEN 1 END)) * 100
          ELSE 0
        END as success_rate
      FROM tips t
      JOIN sports s ON t.sport_id = s.sport_id
      WHERE t.creator_id = :userId
      GROUP BY s.sport_id, s.name
      ORDER BY total_tips DESC
    `, {
      replacements: { userId: id },
      type: sequelize.QueryTypes.SELECT
    });

    res.json({
      success: true,
      data: {
        user: {
          id: user.user_id,
          email: user.email,
          firstName: user.profile?.first_name,
          lastName: user.profile?.last_name,
          role: user.profile?.role?.name,
          isActive: user.is_active,
          avatarUrl: user.profile?.avatar_url
        },
        stats: {
          ...user.stats?.dataValues,
          successRate: user.stats ? user.stats.getSuccessRate() : 0,
          detailedStats: tipStats[0],
          sportStats
        }
      }
    });
  } catch (error) {
    logger.error('Error al obtener estadísticas de usuario:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener estadísticas de usuario',
      error: error.message
    });
  }
};

/**
 * Obtiene los mejores tipsters
 */
const getTopTipsters = async (req, res) => {
  try {
    const { limit = 10, minTips = 10 } = req.query;

    // Consulta SQL para obtener los mejores tipsters
    const topTipsters = await sequelize.query(`
      SELECT 
        u.user_id,
        u.email,
        pr.first_name,
        pr.last_name,
        pr.avatar_url,
        us.total_tips,
        us.successful_tips,
        CASE WHEN us.total_tips > 0 
          THEN (us.successful_tips::FLOAT / us.total_tips) * 100 
          ELSE 0 
        END AS success_rate
      FROM users u
      JOIN profiles pr ON u.user_id = pr.user_id
      JOIN user_stats us ON u.user_id = us.user_id
      WHERE pr.role_id = 2 AND us.total_tips >= :minTips
      ORDER BY success_rate DESC, us.total_tips DESC
      LIMIT :limit
    `, {
      replacements: { 
        minTips: parseInt(minTips),
        limit: parseInt(limit)
      },
      type: sequelize.QueryTypes.SELECT
    });

    res.json({
      success: true,
      data: topTipsters
    });
  } catch (error) {
    logger.error('Error al obtener mejores tipsters:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener mejores tipsters',
      error: error.message
    });
  }
};

module.exports = {
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
  getUserStats,
  getTopTipsters
};