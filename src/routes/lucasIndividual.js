var express = require("express");
var router = express.Router();
var authToken = require("../middleware/auth.js");
var lucasController = require("../controllers/lucasController.js");

router.get("/equipamento/:idDispositivo", function (req, res, next) {
    authToken.authMiddlewareUser(req, res, next);
}, function (req, res) {
    lucasController.obterDadosEquipamento(req, res);
});

module.exports = router;