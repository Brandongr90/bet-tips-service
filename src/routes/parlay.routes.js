const express = require('express');
const router = express.Router();
const { body, param, query } = require('express-validator');
const parlayController = require('../controllers/parlay.controller');
const { validateRequest } = require('../middlewares/validator.middleware');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

// Validaciones para crear/actualizar parlay
const parlayValidation = [
  body('title').notEmpty().withMessage('El título es requerido'),
  body('description').optional().isString().withMessage('La descripción debe ser texto'),
  body('tipIds').isArray({ min: 2 }).withMessage('Se requieren al menos 2 tips para un parlay'),
  body('tipIds.*').isUUID(4).withMessage('ID de tip inválido')
];

// Validaciones para filtros
const parlayFiltersValidation = [
  query('status').optional().isIn(['pending', 'won', 'lost', 'partial', 'cancelled']).withMessage('Estado de parlay inválido'),
  query('creatorId').optional().isUUID(4).withMessage('ID de creador inválido'),
  query('page').optional().isInt({ min: 1 }).withMessage('Página inválida'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Límite inválido'),
  query('sortBy').optional().isIn(['created_at', 'total_odds']).withMessage('Campo de ordenamiento inválido'),
  query('sortDir').optional().isIn(['ASC', 'DESC']).withMessage('Dirección de ordenamiento inválida')
];

// Rutas públicas
router.get('/', parlayFiltersValidation, validateRequest, parlayController.getParlays);
router.get('/popular', parlayController.getPopularParlays);
router.get('/stats', parlayController.getParlayStats);
router.get('/:id', param('id').isUUID(4).withMessage('ID de parlay inválido'), validateRequest, parlayController.getParlayById);

// Rutas protegidas - solo usuarios autenticados pueden crear parlays
router.post('/', 
  authenticate, 
  parlayValidation, 
  validateRequest, 
  parlayController.createParlay
);

router.put('/:id', 
  authenticate, 
  param('id').isUUID(4).withMessage('ID de parlay inválido'),
  parlayValidation, 
  validateRequest, 
  parlayController.updateParlay
);

router.delete('/:id', 
  authenticate, 
  param('id').isUUID(4).withMessage('ID de parlay inválido'),
  validateRequest, 
  parlayController.deleteParlay
);

module.exports = router;