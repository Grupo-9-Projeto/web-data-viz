
var express = require("express");
var router = express.Router();

var relatorioController = require("../controllers/eduardoController");
var authToken = require("../middleware/auth");

// Buscar relatório de um alerta específico
router.get(
    "/alerta/:idAlerta",
    authToken.authMiddlewareUser,
    relatorioController.buscarRelatorioAlerta
);

module.exports = router;
