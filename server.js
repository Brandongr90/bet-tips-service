const app = require('./src/app');
const { testConnection } = require('./src/config/database');
const logger = require('./src/utils/logger');
require('dotenv').config();

// Puerto
const PORT = process.env.PORT || 3000;

// Iniciar servidor
const startServer = async () => {
  try {
    // Probar conexión a la base de datos
    const dbConnected = await testConnection();
    
    if (!dbConnected) {
      logger.error('No se pudo conectar a la base de datos. Deteniendo la aplicación.');
      process.exit(1);
    }
    
    // Iniciar servidor Express
    app.listen(PORT, () => {
      logger.info(`Servidor ejecutándose en el puerto ${PORT}`);
      logger.info(`Entorno: ${process.env.NODE_ENV}`);
    });
  } catch (error) {
    logger.error('Error al iniciar el servidor:', error);
    process.exit(1);
  }
};

// Manejo de errores no capturados
process.on('uncaughtException', (err) => {
  logger.error('Excepción no capturada:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Rechazo de promesa no manejado:', reason);
  process.exit(1);
});

// Iniciar la aplicación
startServer();