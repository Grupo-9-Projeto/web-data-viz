var express = require("express");
var router = express.Router();

var pedroController = require("../controllers/pedroController");
var authToken = require("../middleware/auth.js");

router.get("/chamados", function (req, res, next) {
    authToken.authMiddlewareUser(req, res, next)
}, function (req, res) {
    pedroController.listarChamados(req, res);
})

router.get("/chamados/:id", function (req, res, next) {
    authToken.authMiddlewareUser(req, res, next)
}, function (req, res) {
    pedroController.buscarChamado(req, res);
})

module.exports = router;