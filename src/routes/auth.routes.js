const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const authController = require('../controllers/auth.controller');
const { validateRequest } = require('../middlewares/validator.middleware');
const { authenticate } = require('../middlewares/auth.middleware');

// Validaciones para registro
const registerValidation = [
  body('email').isEmail().withMessage('Email inválido'),
  body('password').isLength({ min: 6 }).withMessage('La contraseña debe tener al menos 6 caracteres'),
  body('firstName').notEmpty().withMessage('El nombre es requerido'),
  body('lastName').notEmpty().withMessage('El apellido es requerido')
];

// Validaciones para login
const loginValidation = [
  body('email').isEmail().withMessage('Email inválido'),
  body('password').notEmpty().withMessage('La contraseña es requerida')
];

// Validaciones para recuperación de contraseña
const forgotPasswordValidation = [
  body('email').isEmail().withMessage('Email inválido')
];

// Validaciones para restablecer contraseña
const resetPasswordValidation = [
  body('token').notEmpty().withMessage('Token es requerido'),
  body('newPassword').isLength({ min: 6 }).withMessage('La nueva contraseña debe tener al menos 6 caracteres')
];

// Validaciones para cambio de contraseña
const changePasswordValidation = [
  body('currentPassword').notEmpty().withMessage('La contraseña actual es requerida'),
  body('newPassword').isLength({ min: 6 }).withMessage('La nueva contraseña debe tener al menos 6 caracteres')
];

// Validaciones para actualización de perfil
const updateProfileValidation = [
  body('firstName').notEmpty().withMessage('El nombre es requerido'),
  body('lastName').notEmpty().withMessage('El apellido es requerido')
];

// Rutas públicas
router.post('/register', registerValidation, validateRequest, authController.register);
router.post('/login', loginValidation, validateRequest, authController.login);
router.post('/refresh-token', authController.refreshToken);
router.post('/forgot-password', forgotPasswordValidation, validateRequest, authController.forgotPassword);
router.post('/reset-password', resetPasswordValidation, validateRequest, authController.resetPassword);

// Rutas protegidas
router.get('/profile', authenticate, authController.getProfile);
router.put('/profile', authenticate, updateProfileValidation, validateRequest, authController.updateProfile);
router.post('/change-password', authenticate, changePasswordValidation, validateRequest, authController.changePassword);

module.exports = router;