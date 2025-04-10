const { Subscription, UserSubscription, Profile } = require('../models');
const logger = require('../utils/logger');
const { sequelize } = require('../config/database');
const { Op } = require('sequelize');

/**
 * Obtiene todas las suscripciones disponibles
 */
const getSubscriptions = async (req, res) => {
  try {
    const subscriptions = await Subscription.findAll({
      order: [['price', 'ASC']]
    });

    res.json({
      success: true,
      data: subscriptions
    });
  } catch (error) {
    logger.error('Error al obtener suscripciones:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener suscripciones',
      error: error.message
    });
  }
};

/**
 * Obtiene una suscripción por su ID
 */
const getSubscriptionById = async (req, res) => {
  try {
    const { id } = req.params;

    const subscription = await Subscription.findByPk(id);

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Suscripción no encontrada'
      });
    }

    res.json({
      success: true,
      data: subscription
    });
  } catch (error) {
    logger.error('Error al obtener suscripción:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener suscripción',
      error: error.message
    });
  }
};

/**
 * Crear una nueva suscripción (Solo admin)
 */
const createSubscription = async (req, res) => {
  try {
    const { name, description, price, durationDays, features } = req.body;

    // Verificar si ya existe una suscripción con ese nombre
    const existingSubscription = await Subscription.findOne({
      where: { name }
    });

    if (existingSubscription) {
      return res.status(400).json({
        success: false,
        message: 'Ya existe una suscripción con ese nombre'
      });
    }

    // Crear nueva suscripción
    const subscription = await Subscription.create({
      name,
      description,
      price,
      duration_days: durationDays,
      features
    });

    res.status(201).json({
      success: true,
      message: 'Suscripción creada exitosamente',
      data: subscription
    });
  } catch (error) {
    logger.error('Error al crear suscripción:', error);
    res.status(500).json({
      success: false,
      message: 'Error al crear suscripción',
      error: error.message
    });
  }
};

/**
 * Actualizar una suscripción existente (Solo admin)
 */
const updateSubscription = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, price, durationDays, features } = req.body;

    // Verificar que la suscripción existe
    const subscription = await Subscription.findByPk(id);

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Suscripción no encontrada'
      });
    }

    // Verificar que no exista otra suscripción con el mismo nombre
    if (name && name !== subscription.name) {
      const existingSubscription = await Subscription.findOne({
        where: { name }
      });

      if (existingSubscription) {
        return res.status(400).json({
          success: false,
          message: 'Ya existe otra suscripción con ese nombre'
        });
      }
    }

    // Actualizar suscripción
    await subscription.update({
      name: name || subscription.name,
      description: description || subscription.description,
      price: price || subscription.price,
      duration_days: durationDays || subscription.duration_days,
      features: features || subscription.features
    });

    res.json({
      success: true,
      message: 'Suscripción actualizada exitosamente',
      data: subscription
    });
  } catch (error) {
    logger.error('Error al actualizar suscripción:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar suscripción',
      error: error.message
    });
  }
};

/**
 * Eliminar una suscripción (Solo admin)
 */
const deleteSubscription = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { id } = req.params;

    // Verificar que la suscripción existe
    const subscription = await Subscription.findByPk(id);

    if (!subscription) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Suscripción no encontrada'
      });
    }

    // Verificar si hay usuarios activos con esta suscripción
    const activeSubscriptions = await UserSubscription.findOne({
      where: {
        subscription_id: id,
        end_date: {
          [Op.gt]: new Date()
        }
      }
    });

    if (activeSubscriptions) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'No se puede eliminar una suscripción con usuarios activos'
      });
    }

    // Actualizar perfiles que usan esta suscripción a la suscripción gratuita
    await Profile.update(
      { subscription_id: 1 }, // ID de la suscripción gratuita
      { 
        where: { subscription_id: id },
        transaction
      }
    );

    // Eliminar suscripción
    await subscription.destroy({ transaction });

    await transaction.commit();

    res.json({
      success: true,
      message: 'Suscripción eliminada exitosamente'
    });
  } catch (error) {
    await transaction.rollback();
    logger.error('Error al eliminar suscripción:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar suscripción',
      error: error.message
    });
  }
};

/**
 * Suscribir un usuario a un plan (compra)
 */
const subscribeUser = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const userId = req.user.id;
    const { subscriptionId, paymentId, paymentStatus } = req.body;

    // Verificar que la suscripción existe
    const subscription = await Subscription.findByPk(subscriptionId);
    if (!subscription) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Suscripción no encontrada'
      });
    }

    // Calcular fecha de finalización
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + subscription.duration_days);

    // Crear suscripción del usuario
    const userSubscription = await UserSubscription.create({
      user_id: userId,
      subscription_id: subscriptionId,
      start_date: startDate,
      end_date: endDate,
      payment_id: paymentId,
      payment_status: paymentStatus
    }, { transaction });

    // Actualizar el perfil del usuario con la nueva suscripción
    await Profile.update(
      { subscription_id: subscriptionId },
      { 
        where: { user_id: userId },
        transaction
      }
    );

    await transaction.commit();

    res.status(201).json({
      success: true,
      message: 'Suscripción realizada exitosamente',
      data: {
        subscription: userSubscription,
        expiresAt: endDate
      }
    });
  } catch (error) {
    await transaction.rollback();
    logger.error('Error al suscribir usuario:', error);
    res.status(500).json({
      success: false,
      message: 'Error al procesar la suscripción',
      error: error.message
    });
  }
};

/**
 * Obtener historial de suscripciones del usuario actual
 */
const getUserSubscriptions = async (req, res) => {
  try {
    const userId = req.user.id;

    const subscriptions = await UserSubscription.findAll({
      where: {
        user_id: userId
      },
      include: [
        {
          model: Subscription,
          as: 'subscription'
        }
      ],
      order: [['start_date', 'DESC']]
    });

    res.json({
      success: true,
      data: subscriptions
    });
  } catch (error) {
    logger.error('Error al obtener historial de suscripciones:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener historial de suscripciones',
      error: error.message
    });
  }
};

/**
 * Verificar suscripción activa del usuario
 */
const checkActiveSubscription = async (req, res) => {
  try {
    const userId = req.user.id;

    // Buscar suscripción activa
    const activeSubscription = await UserSubscription.findOne({
      where: {
        user_id: userId,
        end_date: {
          [Op.gt]: new Date()
        }
      },
      include: [
        {
          model: Subscription,
          as: 'subscription'
        }
      ],
      order: [['end_date', 'DESC']]
    });

    if (!activeSubscription) {
      return res.json({
        success: true,
        hasActiveSubscription: false,
        data: null
      });
    }

    res.json({
      success: true,
      hasActiveSubscription: true,
      data: {
        subscription: activeSubscription.subscription,
        expiresAt: activeSubscription.end_date
      }
    });
  } catch (error) {
    logger.error('Error al verificar suscripción activa:', error);
    res.status(500).json({
      success: false,
      message: 'Error al verificar suscripción activa',
      error: error.message
    });
  }
};

/**
 * Cancelar suscripción de usuario
 */
const cancelSubscription = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const userId = req.user.id;
    const { subscriptionId } = req.params;

    // Buscar la suscripción activa del usuario
    const activeSubscription = await UserSubscription.findOne({
      where: {
        user_id: userId,
        subscription_id: subscriptionId,
        end_date: {
          [Op.gt]: new Date()
        }
      }
    });

    if (!activeSubscription) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'No se encontró una suscripción activa con el ID proporcionado'
      });
    }

    // Actualizar fecha de finalización a la fecha actual (cancelar)
    await activeSubscription.update({
      end_date: new Date()
    }, { transaction });

    // Cambiar la suscripción del perfil a la gratuita
    await Profile.update(
      { subscription_id: 1 }, // ID de la suscripción gratuita
      { 
        where: { user_id: userId },
        transaction
      }
    );

    await transaction.commit();

    res.json({
      success: true,
      message: 'Suscripción cancelada exitosamente'
    });
  } catch (error) {
    await transaction.rollback();
    logger.error('Error al cancelar suscripción:', error);
    res.status(500).json({
      success: false,
      message: 'Error al cancelar suscripción',
      error: error.message
    });
  }
};

module.exports = {
  getSubscriptions,
  getSubscriptionById,
  createSubscription,
  updateSubscription,
  deleteSubscription,
  subscribeUser,
  getUserSubscriptions,
  checkActiveSubscription,
  cancelSubscription
};