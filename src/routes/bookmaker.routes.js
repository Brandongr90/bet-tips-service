const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');
const bookmakerController = require('../controllers/bookmaker.controller');
const { validateRequest } = require('../middlewares/validator.middleware');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

// Validaciones para crear/actualizar casa de apuestas
const bookmakerValidation = [
  body('name').notEmpty().withMessage('El nombre es requerido'),
  body('websiteUrl').optional().isURL().withMessage('La URL del sitio web debe ser una URL válida'),
  body('logoUrl').optional().isURL().withMessage('La URL del logo debe ser una URL válida')
];

// Rutas públicas
router.get('/', bookmakerController.getBookmakers);
router.get('/stats', bookmakerController.getBookmakerStats);
router.get('/:id', param('id').isInt().withMessage('ID de casa de apuestas inválido'), validateRequest, bookmakerController.getBookmakerById);

// Rutas protegidas (solo admin)
router.post('/', 
  authenticate, 
  authorize([1]), // Solo admin
  bookmakerValidation, 
  validateRequest, 
  bookmakerController.createBookmaker
);

router.put('/:id', 
  authenticate, 
  authorize([1]), // Solo admin
  param('id').isInt().withMessage('ID de casa de apuestas inválido'),
  bookmakerValidation, 
  validateRequest, 
  bookmakerController.updateBookmaker
);

router.delete('/:id', 
  authenticate, 
  authorize([1]), // Solo admin
  param('id').isInt().withMessage('ID de casa de apuestas inválido'),
  validateRequest, 
  bookmakerController.deleteBookmaker
);

module.exports = router;