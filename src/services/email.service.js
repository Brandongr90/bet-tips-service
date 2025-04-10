const nodemailer = require('nodemailer');
const logger = require('../utils/logger');
require('dotenv').config();

// Crear transporter de Nodemailer
const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

/**
 * Envía un email de recuperación de contraseña
 * @param {string} to - Email del destinatario
 * @param {string} token - Token de recuperación
 * @returns {Promise<boolean>} - True si el email se envió correctamente
 */
const sendPasswordResetEmail = async (to, token) => {
  try {
    // URL para resetear contraseña (frontend)
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
    
    // Opciones del email
    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to,
      subject: 'Recuperación de contraseña - BetTips',
      html: `
        <h1>Recuperación de contraseña</h1>
        <p>Has solicitado restablecer tu contraseña.</p>
        <p>Haz clic en el siguiente enlace para crear una nueva contraseña:</p>
        <p><a href="${resetUrl}" target="_blank">Restablecer contraseña</a></p>
        <p>Si no solicitaste este cambio, ignora este correo.</p>
        <p>Este enlace expirará en 1 hora.</p>
        <p>Saludos,<br>Equipo de BetTips</p>
      `
    };

    // Enviar email
    await transporter.sendMail(mailOptions);
    logger.info(`Email de recuperación enviado a: ${to}`);
    return true;
  } catch (error) {
    logger.error('Error al enviar email de recuperación:', error);
    return false;
  }
};

/**
 * Envía un email de bienvenida al usuario
 * @param {string} to - Email del destinatario
 * @param {string} name - Nombre del usuario
 * @returns {Promise<boolean>} - True si el email se envió correctamente
 */
const sendWelcomeEmail = async (to, name) => {
  try {
    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to,
      subject: '¡Bienvenido a BetTips!',
      html: `
        <h1>¡Bienvenido a BetTips!</h1>
        <p>Hola ${name || 'Nuevo Usuario'},</p>
        <p>Gracias por registrarte en nuestra plataforma de tips deportivos.</p>
        <p>Con BetTips podrás:</p>
        <ul>
          <li>Acceder a los mejores pronósticos deportivos</li>
          <li>Seguir a los tipsters más exitosos</li>
          <li>Analizar estadísticas detalladas</li>
          <li>Mantenerte al día con los eventos deportivos</li>
        </ul>
        <p>Si tienes alguna pregunta, no dudes en contactarnos.</p>
        <p>¡Esperamos que disfrutes de la plataforma!</p>
        <p>Saludos,<br>Equipo de BetTips</p>
      `
    };

    await transporter.sendMail(mailOptions);
    logger.info(`Email de bienvenida enviado a: ${to}`);
    return true;
  } catch (error) {
    logger.error('Error al enviar email de bienvenida:', error);
    return false;
  }
};

module.exports = {
  sendPasswordResetEmail,
  sendWelcomeEmail
};