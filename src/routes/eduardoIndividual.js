
var express = require("express");
var router = express.Router();

var relatorioController = require("../controllers/relatorioController");
var authToken = require("../middlewares/authToken");

// Buscar relatório de um alerta específico
router.get(
    "/alerta/:idAlerta",
    authToken.authMiddlewareUser,
    relatorioController.buscarRelatorioAlerta
);

module.exports = router;
