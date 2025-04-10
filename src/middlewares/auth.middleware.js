const { verifyToken } = require('../config/jwt');
const { User, Profile, Role } = require('../models');
const logger = require('../utils/logger');

/**
 * Middleware para verificar si el usuario está autenticado
 */
const authenticate = async (req, res, next) => {
  try {
    // Obtener el token del header de autorización
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false, 
        message: 'Acceso no autorizado. Token no proporcionado' 
      });
    }

    // Extraer el token
    const token = authHeader.split(' ')[1];
    
    // Verificar el token
    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({ 
        success: false, 
        message: 'Token inválido o expirado'
      });
    }

    // Buscar al usuario en la base de datos
    const user = await User.findByPk(decoded.id, {
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
        message: 'Usuario no encontrado' 
      });
    }

    if (!user.is_active) {
      return res.status(403).json({ 
        success: false, 
        message: 'Cuenta de usuario desactivada' 
      });
    }

    // Agregar el usuario al objeto request
    req.user = {
      id: user.user_id,
      email: user.email,
      roleId: user.profile?.role_id,
      roleName: user.profile?.role?.name
    };

    next();
  } catch (error) {
    logger.error('Error en autenticación:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Error interno del servidor' 
    });
  }
};

/**
 * Middleware para verificar roles de usuario
 * @param {Array} roles - Array de IDs de roles permitidos
 */
const authorize = (roles = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Acceso no autorizado' 
      });
    }

    // Si no se especifican roles, permitir acceso a cualquier usuario autenticado
    if (roles.length === 0) {
      return next();
    }

    // Verificar si el rol del usuario está en la lista de roles permitidos
    if (!roles.includes(req.user.roleId)) {
      return res.status(403).json({ 
        success: false, 
        message: 'No tienes permiso para acceder a este recurso' 
      });
    }

    next();
  };
};

module.exports = {
  authenticate,
  authorize
};