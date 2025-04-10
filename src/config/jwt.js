const jwt = require('jsonwebtoken');
require('dotenv').config();

/**
 * Genera un token JWT para un usuario
 * @param {Object} user - Datos del usuario a incluir en el token
 * @returns {String} Token JWT generado
 */
const generateToken = (user) => {
  const payload = {
    id: user.user_id,
    email: user.email,
    role: user.profile?.role_id || 3, // Valor por defecto: usuario regular
  };

  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRATION
  });
};

/**
 * Genera un token de refresco con mayor duración
 * @param {Object} user - Datos del usuario a incluir en el token
 * @returns {String} Token de refresco
 */
const generateRefreshToken = (user) => {
  const payload = {
    id: user.user_id,
    type: 'refresh'
  };

  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRATION
  });
};

/**
 * Verifica la validez de un token JWT
 * @param {String} token - Token JWT a verificar
 * @returns {Object|null} Payload del token si es válido, null en caso contrario
 */
const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return null;
  }
};

module.exports = {
  generateToken,
  generateRefreshToken,
  verifyToken
};