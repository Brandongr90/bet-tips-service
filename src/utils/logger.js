const winston = require('winston');
const path = require('path');

// Configuración de formato para logs
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Crear directorio de logs si no existe
const logDir = 'logs';

// Configuración del logger
const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: logFormat,
  defaultMeta: { service: 'bet-tips-api' },
  transports: [
    // Guardar logs de error en error.log
    new winston.transports.File({ 
      filename: path.join(logDir, 'error.log'), 
      level: 'error'
    }),
    // Guardar todos los logs en combined.log
    new winston.transports.File({ 
      filename: path.join(logDir, 'combined.log')
    })
  ]
});

// Si no estamos en producción, imprimir en consola también
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

module.exports = logger;