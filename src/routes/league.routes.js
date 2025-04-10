const express = require('express');
const router = express.Router();
const { body, param, query } = require('express-validator');
const leagueController = require('../controllers/league.controller');
const { validateRequest } = require('../middlewares/validator.middleware');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

// Validaciones para crear/actualizar liga
const leagueValidation = [
  body('sportId').isInt({ min: 1 }).withMessage('ID de deporte inválido'),
  body('name').notEmpty().withMessage('El nombre es requerido'),
  body('country').optional().isString().withMessage('El país debe ser texto'),
  body('iconUrl').optional().isURL().withMessage('La URL del icono debe ser una URL válida')
];

// Validaciones para filtros
const leagueFiltersValidation = [
  query('sportId').optional().isInt({ min: 1 }).withMessage('ID de deporte inválido')
];

// Rutas públicas
router.get('/', leagueFiltersValidation, validateRequest, leagueController.getLeagues);
router.get('/stats', leagueFiltersValidation, validateRequest, leagueController.getLeagueStats);
router.get('/:id', param('id').isInt().withMessage('ID de liga inválido'), validateRequest, leagueController.getLeagueById);

// Rutas protegidas (solo admin)
router.post('/', 
  authenticate, 
  authorize([1]), // Solo admin
  leagueValidation, 
  validateRequest, 
  leagueController.createLeague
);

router.put('/:id', 
  authenticate, 
  authorize([1]), // Solo admin
  param('id').isInt().withMessage('ID de liga inválido'),
  leagueValidation, 
  validateRequest, 
  leagueController.updateLeague
);

router.delete('/:id', 
  authenticate, 
  authorize([1]), // Solo admin
  param('id').isInt().withMessage('ID de liga inválido'),
  validateRequest, 
  leagueController.deleteLeague
);

module.exports = router;