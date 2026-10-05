var express = require("express");
var router = express.Router();

var usuarioController = require("../controllers/empresasController.js");
var authToken = require("../middleware/auth.js");


router.get("/listar_empresas", function(req, res, next){
    authToken.authMiddlewareUser(req, res , next)
}, function(req, res){
    usuarioController.listarEmpresas(req, res);
})

router.post("/criar_empresa", function(req, res, next){
    authToken.authMiddlewareUser(req, res , next)
}, function(req, res){
    usuarioController.criarEmpresa(req, res);
})

router.post("/atualizar_empresa", function(req, res, next){
    authToken.authMiddlewareUser(req, res , next)
}, function(req, res){
    usuarioController.editarEmpresa(req, res);
})

router.delete("/deletar_empresa", function(req, res, next){
    authToken.authMiddlewareUser(req, res , next)
}, function(req, res){
    usuarioController.deletarEmpresa(req, res);
})

module.exports = router;