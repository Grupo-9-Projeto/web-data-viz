var express = require("express");
var router = express.Router();

var funcionarioController = require("../controllers/funcionarioController.js");
var authToken = require("../middleware/auth.js");


router.get("/listar_funcionarios", function(req, res, next){
    authToken.authMiddlewareUser(req, res , next)
}, function(req, res){
    funcionarioController.listarFuncionarios(req, res);
})

router.post("/criar_funcionario", function(req, res, next){
    authToken.authMiddlewareUser(req, res , next)
}, function(req, res){
    funcionarioController.criarFuncionario(req, res);
})

router.post("/atualizar_funcionario", function(req, res, next){
    authToken.authMiddlewareUser(req, res , next)
}, function(req, res){
    funcionarioController.editarFuncionario(req, res);
})

router.delete("/deletar_funcionario", function(req, res, next){
    authToken.authMiddlewareUser(req, res , next)
}, function(req, res){
    funcionarioController.desativarFuncionario(req, res);
})

router.post("/listar_funcionario", function(req, res, next){
    authToken.authMiddlewareUser(req, res , next)
}, function(req, res){
    funcionarioController.informacoesUsuario(req, res);
})

router.post("/listar_empresas_funcionario", function(req, res, next){
    authToken.authMiddlewareUser(req, res , next)
}, function(req, res){
    funcionarioController.listarEmpresasFuncionario(req, res);
})

router.post("/adicionar_empresa_funcionario", function(req, res, next){
    authToken.authMiddlewareUser(req, res , next)
}, function(req, res){
    funcionarioController.adicionarEmpresaFuncionario(req, res);
})

router.delete("/remover_empresa_funcionario", function(req, res, next){
    authToken.authMiddlewareUser(req, res , next)
}, function(req, res){
    funcionarioController.removerEmpresaFuncionario(req, res);
})

module.exports = router;