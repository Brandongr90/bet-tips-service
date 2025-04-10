const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');
const subscriptionController = require('../controllers/subscription.controller');
const { validateRequest } = require('../middlewares/validator.middleware');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

// Validaciones para crear/actualizar suscripción
const subscriptionValidation = [
  body('name').notEmpty().withMessage('El nombre es requerido'),
  body('price').isFloat({ min: 0 }).withMessage('El precio debe ser un número válido mayor o igual a 0'),
  body('durationDays').isInt({ min: 1 }).withMessage('La duración debe ser un número entero mayor a 0'),
  body('features').optional().isObject().withMessage('Las características deben ser un objeto JSON válido')
];

// Validaciones para suscribir a un usuario
const subscribeUserValidation = [
  body('subscriptionId').isInt({ min: 1 }).withMessage('ID de suscripción inválido'),
  body('paymentId').optional().isString().withMessage('ID de pago inválido'),
  body('paymentStatus').optional().isString().withMessage('Estado de pago inválido')
];

// Rutas públicas
router.get('/', subscriptionController.getSubscriptions);
router.get('/:id', param('id').isInt().withMessage('ID de suscripción inválido'), validateRequest, subscriptionController.getSubscriptionById);

// Rutas protegidas
router.post('/', 
  authenticate, 
  authorize([1]), // Solo admin
  subscriptionValidation, 
  validateRequest, 
  subscriptionController.createSubscription
);

router.put('/:id', 
  authenticate, 
  authorize([1]), // Solo admin
  param('id').isInt().withMessage('ID de suscripción inválido'),
  subscriptionValidation, 
  validateRequest, 
  subscriptionController.updateSubscription
);

router.delete('/:id', 
  authenticate, 
  authorize([1]), // Solo admin
  param('id').isInt().withMessage('ID de suscripción inválido'),
  validateRequest, 
  subscriptionController.deleteSubscription
);

// Suscripciones de usuario
router.post('/subscribe', 
  authenticate,
  subscribeUserValidation,
  validateRequest,
  subscriptionController.subscribeUser
);

router.get('/user/history', 
  authenticate,
  subscriptionController.getUserSubscriptions
);

router.get('/user/active', 
  authenticate,
  subscriptionController.checkActiveSubscription
);

router.post('/cancel/:subscriptionId', 
  authenticate,
  param('subscriptionId').isInt().withMessage('ID de suscripción inválido'),
  validateRequest,
  subscriptionController.cancelSubscription
);

module.exports = router;