const { validationResult } = require('express-validator');
const logger = require('../utils/logger');

/**
 * Middleware para validar las solicitudes utilizando express-validator
 * Verifica si hay errores de validación y responde con un mensaje de error si es necesario
 */
const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    logger.debug('Errores de validación:', errors.array());
    
    // Formatear errores en un objeto más amigable
    const formattedErrors = {};
    errors.array().forEach(error => {
      formattedErrors[error.path] = error.msg;
    });
    
    return res.status(400).json({
      success: false,
      message: 'Error de validación',
      errors: formattedErrors
    });
  }
  
  next();
};

module.exports = {
  validateRequest
};