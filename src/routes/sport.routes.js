const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');
const sportController = require('../controllers/sport.controller');
const { validateRequest } = require('../middlewares/validator.middleware');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

// Validaciones para crear/actualizar deporte
const sportValidation = [
  body('name').notEmpty().withMessage('El nombre es requerido'),
  body('description').optional().isString().withMessage('La descripción debe ser texto'),
  body('iconUrl').optional().isURL().withMessage('La URL del icono debe ser una URL válida')
];

// Rutas públicas
router.get('/', sportController.getSports);
router.get('/stats', sportController.getSportStats);
router.get('/:id', param('id').isInt().withMessage('ID de deporte inválido'), validateRequest, sportController.getSportById);

// Rutas protegidas (solo admin)
router.post('/', 
  authenticate, 
  authorize([1]), // Solo admin
  sportValidation, 
  validateRequest, 
  sportController.createSport
);

router.put('/:id', 
  authenticate, 
  authorize([1]), // Solo admin
  param('id').isInt().withMessage('ID de deporte inválido'),
  sportValidation, 
  validateRequest, 
  sportController.updateSport
);

router.delete('/:id', 
  authenticate, 
  authorize([1]), // Solo admin
  param('id').isInt().withMessage('ID de deporte inválido'),
  validateRequest, 
  sportController.deleteSport
);

module.exports = router;