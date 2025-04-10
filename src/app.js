const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const routes = require('./routes');
const { notFoundHandler, errorHandler, sequelizeErrorHandler } = require('./middlewares/error.middleware');
const logger = require('./utils/logger');

// Crear aplicación Express
const app = express();

// Middlewares
app.use(helmet()); // Seguridad
app.use(cors()); // Habilitar CORS
app.use(express.json()); // Parsear JSON
app.use(express.urlencoded({ extended: true })); // Parsear URL-encoded

// Logging HTTP con Morgan
const morganFormat = process.env.NODE_ENV === 'production' ? 'combined' : 'dev';
app.use(morgan(morganFormat, {
  stream: {
    write: (message) => logger.http(message.trim())
  }
}));

// Rutas de la API
app.use('/api', routes);

// Manejo de errores
app.use(notFoundHandler);
app.use(sequelizeErrorHandler);
app.use(errorHandler);

module.exports = app;