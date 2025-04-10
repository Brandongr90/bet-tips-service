const logger = require('../utils/logger');

/**
 * Middleware para manejar peticiones a rutas no encontradas
 */
const notFoundHandler = (req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Ruta no encontrada: ${req.originalUrl}`
  });
};

/**
 * Middleware para capturar y manejar errores globales
 */
const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  
  // Loguear el error
  logger.error(`Error ${statusCode}: ${err.message}`, {
    stack: err.stack,
    path: req.path,
    method: req.method,
    ip: req.ip
  });
  
  // Respuesta para el cliente
  const response = {
    success: false,
    message: statusCode === 500 ? 'Error interno del servidor' : err.message
  };
  
  // En desarrollo, incluir stack de error
  if (process.env.NODE_ENV !== 'production') {
    response.stack = err.stack;
  }
  
  res.status(statusCode).json(response);
};

/**
 * Middleware para manejar errores de Sequelize
 */
const sequelizeErrorHandler = (err, req, res, next) => {
  if (err.name === 'SequelizeValidationError' || err.name === 'SequelizeUniqueConstraintError') {
    const errors = {};
    
    err.errors.forEach((error) => {
      let message;
      switch (error.type) {
        case 'unique violation':
          message = `${error.path} ya está en uso`;
          break;
        case 'notNull Violation':
          message = `${error.path} es requerido`;
          break;
        default:
          message = error.message;
      }
      errors[error.path] = message;
    });
    
    return res.status(400).json({
      success: false,
      message: 'Error de validación en la base de datos',
      errors
    });
  }
  
  next(err);
};

module.exports = {
  notFoundHandler,
  errorHandler,
  sequelizeErrorHandler
};