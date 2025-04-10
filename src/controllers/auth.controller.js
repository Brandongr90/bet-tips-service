const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const { User, Profile, Role } = require('../models');
const { generateToken, generateRefreshToken, verifyToken } = require('../config/jwt');
const { sendPasswordResetEmail, sendWelcomeEmail } = require('../services/email.service');
const logger = require('../utils/logger');
const { sequelize } = require('../config/database');

/**
 * Registra un nuevo usuario
 */
const register = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { email, password, firstName, lastName } = req.body;

    // Verificar si el usuario ya existe
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'El correo electrónico ya está registrado'
      });
    }

    // Crear usuario
    const user = await User.create({
      email,
      password
    }, { transaction });

    // Crear perfil de usuario
    await Profile.create({
      user_id: user.user_id,
      first_name: firstName,
      last_name: lastName,
      role_id: 3, // Role 'user' por defecto
      subscription_id: 1 // Suscripción 'Gratis' por defecto
    }, { transaction });

    await transaction.commit();

    // Enviar email de bienvenida
    await sendWelcomeEmail(email, firstName);

    // Generar tokens
    const token = generateToken(user);
    const refreshToken = generateRefreshToken(user);

    res.status(201).json({
      success: true,
      message: 'Usuario registrado exitosamente',
      data: {
        user: {
          id: user.user_id,
          email: user.email
        },
        token,
        refreshToken
      }
    });
  } catch (error) {
    await transaction.rollback();
    logger.error('Error en registro:', error);
    res.status(500).json({
      success: false,
      message: 'Error al registrar usuario',
      error: error.message
    });
  }
};

/**
 * Inicia sesión con un usuario existente
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Buscar usuario
    const user = await User.findOne({ 
      where: { email },
      include: [{
        model: Profile,
        as: 'profile',
        include: [{
          model: Role,
          as: 'role'
        }]
      }]
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Credenciales inválidas'
      });
    }

    // Verificar contraseña
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Credenciales inválidas'
      });
    }

    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        message: 'Esta cuenta está desactivada'
      });
    }

    // Actualizar último login
    await user.update({
      last_login: new Date()
    });

    // Generar tokens
    const token = generateToken(user);
    const refreshToken = generateRefreshToken(user);

    res.json({
      success: true,
      message: 'Inicio de sesión exitoso',
      data: {
        user: {
          id: user.user_id,
          email: user.email,
          role: user.profile?.role?.name,
          firstName: user.profile?.first_name,
          lastName: user.profile?.last_name
        },
        token,
        refreshToken
      }
    });
  } catch (error) {
    logger.error('Error en login:', error);
    res.status(500).json({
      success: false,
      message: 'Error al iniciar sesión',
      error: error.message
    });
  }
};

/**
 * Refresca el token JWT
 */
const refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: 'Refresh token es requerido'
      });
    }

    // Verificar refresh token
    const decoded = verifyToken(refreshToken);
    if (!decoded || decoded.type !== 'refresh') {
      return res.status(401).json({
        success: false,
        message: 'Refresh token inválido o expirado'
      });
    }

    // Buscar usuario
    const user = await User.findByPk(decoded.id, {
      include: [{
        model: Profile,
        as: 'profile'
      }]
    });

    if (!user || !user.is_active) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no válido'
      });
    }

    // Generar nuevo token
    const newToken = generateToken(user);
    const newRefreshToken = generateRefreshToken(user);

    res.json({
      success: true,
      message: 'Token refrescado exitosamente',
      data: {
        token: newToken,
        refreshToken: newRefreshToken
      }
    });
  } catch (error) {
    logger.error('Error al refrescar token:', error);
    res.status(500).json({
      success: false,
      message: 'Error al refrescar token',
      error: error.message
    });
  }
};

/**
 * Solicita restablecer contraseña
 */
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    // Buscar usuario por email
    const user = await User.findOne({ where: { email } });
    if (!user) {
      // Por seguridad, no revelamos si el email existe o no
      return res.json({
        success: true,
        message: 'Si la dirección existe, recibirás un correo con instrucciones'
      });
    }

    // Generar token de recuperación
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpires = new Date(Date.now() + 3600000); // 1 hora

    // Guardar token en la base de datos
    await user.update({
      reset_token: resetToken,
      reset_token_expires: resetTokenExpires
    });

    // Enviar email con token
    const emailSent = await sendPasswordResetEmail(user.email, resetToken);

    if (!emailSent) {
      return res.status(500).json({
        success: false,
        message: 'Error al enviar correo de recuperación'
      });
    }

    res.json({
      success: true,
      message: 'Correo de recuperación enviado'
    });
  } catch (error) {
    logger.error('Error en recuperación de contraseña:', error);
    res.status(500).json({
      success: false,
      message: 'Error al procesar la solicitud',
      error: error.message
    });
  }
};

/**
 * Restablece la contraseña con un token válido
 */
const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    // Buscar usuario con token válido
    const user = await User.findOne({
      where: {
        reset_token: token,
        reset_token_expires: {
          [Op.gt]: new Date() // Token no expirado
        }
      }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Token inválido o expirado'
      });
    }

    // Actualizar contraseña y eliminar token
    await user.update({
      password: newPassword,
      reset_token: null,
      reset_token_expires: null
    });

    res.json({
      success: true,
      message: 'Contraseña restablecida correctamente'
    });
  } catch (error) {
    logger.error('Error al restablecer contraseña:', error);
    res.status(500).json({
      success: false,
      message: 'Error al restablecer contraseña',
      error: error.message
    });
  }
};

/**
 * Obtiene el perfil del usuario actual
 */
const getProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await User.findByPk(userId, {
      attributes: ['user_id', 'email', 'is_active', 'last_login', 'created_at'],
      include: [{
        model: Profile,
        as: 'profile',
        include: [{
          model: Role,
          as: 'role',
          attributes: ['role_id', 'name', 'description']
        }]
      }]
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
    logger.error('Error al obtener perfil:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener perfil',
      error: error.message
    });
  }
};

/**
 * Actualiza el perfil del usuario actual
 */
const updateProfile = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const userId = req.user.id;
    const { firstName, lastName, bio, avatarUrl } = req.body;

    // Verificar si el usuario existe
    const user = await User.findByPk(userId);
    if (!user) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    // Buscar perfil existente
    let profile = await Profile.findOne({
      where: { user_id: userId }
    });

    // Actualizar o crear perfil
    if (profile) {
      await profile.update({
        first_name: firstName,
        last_name: lastName,
        bio,
        avatar_url: avatarUrl
      }, { transaction });
    } else {
      profile = await Profile.create({
        user_id: userId,
        first_name: firstName,
        last_name: lastName,
        bio,
        avatar_url: avatarUrl,
        role_id: 3, // Role 'user' por defecto
        subscription_id: 1 // Suscripción 'Gratis' por defecto
      }, { transaction });
    }

    await transaction.commit();

    res.json({
      success: true,
      message: 'Perfil actualizado correctamente',
      data: {
        user_id: userId,
        email: user.email,
        profile: {
          first_name: profile.first_name,
          last_name: profile.last_name,
          bio: profile.bio,
          avatar_url: profile.avatar_url
        }
      }
    });
  } catch (error) {
    await transaction.rollback();
    logger.error('Error al actualizar perfil:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar perfil',
      error: error.message
    });
  }
};

/**
 * Cambia la contraseña del usuario actual
 */
const changePassword = async (req, res) => {
  try {
    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;

    // Buscar usuario
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    // Verificar contraseña actual
    const isPasswordValid = await user.comparePassword(currentPassword);
    if (!isPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'La contraseña actual es incorrecta'
      });
    }

    // Actualizar contraseña
    await user.update({
      password: newPassword
    });

    res.json({
      success: true,
      message: 'Contraseña actualizada correctamente'
    });
  } catch (error) {
    logger.error('Error al cambiar contraseña:', error);
    res.status(500).json({
      success: false,
      message: 'Error al cambiar contraseña',
      error: error.message
    });
  }
};

module.exports = {
  register,
  login,
  refreshToken,
  forgotPassword,
  resetPassword,
  getProfile,
  updateProfile,
  changePassword
};