var express = require("express");
var router = express.Router();

var empresaController = require("../controllers/empresasController.js");
var authToken = require("../middleware/auth.js");


router.get("/listar_empresas", function(req, res, next){
    authToken.authMiddlewareUser(req, res , next)
}, function(req, res){
    empresaController.listarEmpresas(req, res);
})

router.post("/criar_empresa", function(req, res, next){
    authToken.authMiddlewareUser(req, res , next)
}, function(req, res){
    empresaController.criarEmpresa(req, res);
})

router.post("/atualizar_empresa", function(req, res, next){
    authToken.authMiddlewareUser(req, res , next)
}, function(req, res){
    empresaController.editarEmpresa(req, res);
})

router.delete("/deletar_empresa", function(req, res, next){
    authToken.authMiddlewareUser(req, res , next)
}, function(req, res){
    empresaController.deletarEmpresa(req, res);
})

router.post("/informacoes_empresa", function(req, res, next){
    authToken.authMiddlewareUser(req, res , next)
}, function(req, res){
    empresaController.listarInformacoesEmpresa(req, res);
})

module.exports = router;