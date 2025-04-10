const express = require('express');
const router = express.Router();
const { body, param, query } = require('express-validator');
const userController = require('../controllers/user.controller');
const { validateRequest } = require('../middlewares/validator.middleware');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

// Validaciones para actualizar usuario
const userUpdateValidation = [
  body('email').optional().isEmail().withMessage('Email inválido'),
  body('firstName').optional().notEmpty().withMessage('El nombre no puede estar vacío'),
  body('lastName').optional().notEmpty().withMessage('El apellido no puede estar vacío'),
  body('isActive').optional().isBoolean().withMessage('El estado activo debe ser booleano'),
  body('roleId').optional().isInt({ min: 1, max: 3 }).withMessage('Rol inválido'),
  body('bio').optional().isString().withMessage('La biografía debe ser texto'),
  body('avatarUrl').optional().isURL().withMessage('La URL del avatar debe ser una URL válida')
];

// Validaciones para filtros
const userFiltersValidation = [
  query('roleId').optional().isInt({ min: 1 }).withMessage('ID de rol inválido'),
  query('isActive').optional().isBoolean().withMessage('Estado activo debe ser booleano'),
  query('search').optional().isString().withMessage('Término de búsqueda inválido'),
  query('page').optional().isInt({ min: 1 }).withMessage('Página inválida'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Límite inválido'),
  query('sortBy').optional().isIn(['created_at', 'email', 'last_login']).withMessage('Campo de ordenamiento inválido'),
  query('sortDir').optional().isIn(['ASC', 'DESC']).withMessage('Dirección de ordenamiento inválida')
];

// Rutas protegidas
router.get('/', 
  authenticate, 
  authorize([1]), // Solo admin
  userFiltersValidation, 
  validateRequest, 
  userController.getUsers
);

router.get('/top-tipsters', userController.getTopTipsters);

router.get('/:id', 
  authenticate,
  param('id').isUUID(4).withMessage('ID de usuario inválido'), 
  validateRequest, 
  userController.getUserById
);

router.get('/:id/stats', 
  param('id').isUUID(4).withMessage('ID de usuario inválido'), 
  validateRequest, 
  userController.getUserStats
);

router.put('/:id', 
  authenticate,
  param('id').isUUID(4).withMessage('ID de usuario inválido'),
  userUpdateValidation,
  validateRequest,
  userController.updateUser
);

router.delete('/:id', 
  authenticate,
  authorize([1]), // Solo admin
  param('id').isUUID(4).withMessage('ID de usuario inválido'),
  validateRequest,
  userController.deleteUser
);

module.exports = router;