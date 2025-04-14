const express = require("express");
const router = express.Router();
const { body, param, query } = require("express-validator");
const tipController = require("../controllers/tip.controller");
const { validateRequest } = require("../middlewares/validator.middleware");
const { authenticate, authorize } = require("../middlewares/auth.middleware");
const { checkTipAccess } = require("../middlewares/subscription.middleware");

// Validaciones para crear tip
const createTipValidation = [
  body("title").notEmpty().withMessage("El título es requerido"),
  body("sportId").isInt().withMessage("ID de deporte inválido"),
  body("leagueId").isInt().withMessage("ID de liga inválido"),
  body("team1Name").notEmpty().withMessage("Nombre del equipo 1 es requerido"),
  body("team2Name").notEmpty().withMessage("Nombre del equipo 2 es requerido"),
  body("subscriptionLevel")
    .optional()
    .isInt({ min: 1, max: 3 })
    .withMessage("Nivel de suscripción debe estar entre 1 y 3"),
  body("matchDatetime")
    .isISO8601()
    .toDate()
    .withMessage("Fecha de partido inválida"),
  body("predictionType")
    .notEmpty()
    .withMessage("Tipo de predicción es requerido"),
  body("predictionValue")
    .notEmpty()
    .withMessage("Valor de predicción es requerido"),
  body("confidence")
    .optional()
    .isInt({ min: 1, max: 10 })
    .withMessage("Confianza debe ser un número entre 1 y 10"),
  body("odds").optional().isArray().withMessage("Cuotas debe ser un array"),
  body("odds.*.bookmakerId")
    .optional()
    .isInt()
    .withMessage("ID de casa de apuestas inválido"),
  body("odds.*.value")
    .optional()
    .isFloat({ min: 1 })
    .withMessage("Valor de cuota inválido"),
];

// Validaciones para actualizar tip
const updateTipValidation = [
  param("id").isUUID(4).withMessage("ID de tip inválido"),
  body("title")
    .optional()
    .notEmpty()
    .withMessage("El título no puede estar vacío"),
  body("predictionType")
    .optional()
    .notEmpty()
    .withMessage("Tipo de predicción no puede estar vacío"),
  body("predictionValue")
    .optional()
    .notEmpty()
    .withMessage("Valor de predicción no puede estar vacío"),
  body("confidence")
    .optional()
    .isInt({ min: 1, max: 10 })
    .withMessage("Confianza debe ser un número entre 1 y 10"),
  body("matchStatus")
    .optional()
    .isIn(["scheduled", "live", "completed", "cancelled"])
    .withMessage("Estado de partido inválido"),
  body("tipStatus")
    .optional()
    .isIn(["pending", "won", "lost", "cancelled"])
    .withMessage("Estado de tip inválido"),
  body("odds").optional().isArray().withMessage("Cuotas debe ser un array"),
  body("odds.*.bookmakerId")
    .optional()
    .isInt()
    .withMessage("ID de casa de apuestas inválido"),
  body("odds.*.value")
    .optional()
    .isFloat({ min: 1 })
    .withMessage("Valor de cuota inválido"),
];

// Validaciones para obtener tips
const getTipsValidation = [
  query("sportId").optional().isInt().withMessage("ID de deporte inválido"),
  query("leagueId").optional().isInt().withMessage("ID de liga inválido"),
  query("status")
    .optional()
    .isIn(["pending", "won", "lost", "cancelled"])
    .withMessage("Estado de tip inválido"),
  query("matchStatus")
    .optional()
    .isIn(["scheduled", "live", "completed", "cancelled"])
    .withMessage("Estado de partido inválido"),
  query("startDate")
    .optional()
    .isISO8601()
    .toDate()
    .withMessage("Fecha de inicio inválida"),
  query("endDate")
    .optional()
    .isISO8601()
    .toDate()
    .withMessage("Fecha de fin inválida"),
  query("creatorId").optional().isUUID(4).withMessage("ID de creador inválido"),
  query("page").optional().isInt({ min: 1 }).withMessage("Página inválida"),
  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Límite inválido"),
  query("sortBy")
    .optional()
    .isIn(["match_datetime", "created_at", "confidence"])
    .withMessage("Campo de ordenamiento inválido"),
  query("sortDir")
    .optional()
    .isIn(["ASC", "DESC"])
    .withMessage("Dirección de ordenamiento inválida"),
];

// Rutas públicas
router.get(
  "/",
  authenticate,
  getTipsValidation,
  validateRequest,
  tipController.getTips
);
router.get("/popular", authenticate, tipController.getPopularTips);
router.get("/live", authenticate, tipController.getLiveTips);
router.get("/upcoming", authenticate, tipController.getUpcomingTips);

// Ruta de detalles con middleware de verificación de suscripción
router.get(
  "/:id",
  authenticate,
  param("id").isUUID(4).withMessage("ID de tip inválido"),
  validateRequest,
  checkTipAccess, // Este middleware verifica el acceso por suscripción
  tipController.getTipById
);

// Rutas protegidas - solo tipsters y admins pueden crear tips
router.post(
  "/",
  authenticate,
  authorize([1, 2]), // admin y tipster
  createTipValidation,
  validateRequest,
  tipController.createTip
);

router.put(
  "/:id",
  authenticate,
  updateTipValidation,
  validateRequest,
  tipController.updateTip
);

router.delete(
  "/:id",
  authenticate,
  param("id").isUUID(4).withMessage("ID de tip inválido"),
  validateRequest,
  tipController.deleteTip
);

module.exports = router;
