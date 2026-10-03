var express = require("express");
var router = express.Router();

var usuarioController = require("../controllers/usuarioController");
var authToken = require("../middleware/auth.js");

//Recebendo os dados do html e direcionando para a função cadastrar de usuarioController.js
router.post("/cadastrar", function (req, res) {
    usuarioController.cadastrar(req, res);
})

router.post("/autenticar", function (req, res) {
    usuarioController.autenticar(req, res);
});

router.post("/editar_conta", function(req, res, next){
    authToken.authMiddlewareUser(req, res , next)
}, function(req, res){
    usuarioController.editarConta(req, res);
})

router.delete("/deletar_conta", function(req, res, next){
    authToken.authMiddlewareUser(req, res , next)
}, function(req, res){
    usuarioController.deletarConta(req, res);
})

module.exports = router;