const express = require('express');
const router = express.Router();
const authRoutes = require('./auth.routes');
const tipRoutes = require('./tip.routes');
const sportRoutes = require('./sport.routes');
const leagueRoutes = require('./league.routes');
const bookmakerRoutes = require('./bookmaker.routes');
const userRoutes = require('./user.routes');
const parlayRoutes = require('./parlay.routes');
const subscriptionRoutes = require('./subscription.routes');

// Ruta de salud para verificar que la API está funcionando
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'API funcionando correctamente',
    timestamp: new Date()
  });
});

// Rutas principales
router.use('/auth', authRoutes);
router.use('/tips', tipRoutes);
router.use('/sports', sportRoutes);
router.use('/leagues', leagueRoutes);
router.use('/bookmakers', bookmakerRoutes);
router.use('/users', userRoutes);
router.use('/parlays', parlayRoutes);
router.use('/subscriptions', subscriptionRoutes);

module.exports = router;