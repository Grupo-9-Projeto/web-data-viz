var express = require('express');
var router = express.Router();
var joaoController = require('../controllers/joaoController');
var authToken = require('../middleware/auth.js');

router.get("/equipamentos_monitorados", function(req, res, next){
    authToken.authMiddlewareUser(req, res , next)
}, function(req, res){
    joaoController.carregarDispositivosEmpresas(req, res);
})

router.post("/alertas_empresa", function(req, res, next){
    authToken.authMiddlewareUser(req, res , next)
}, function(req, res){
    joaoController.pegarAlertasEmpresa(req, res);
})

router.post("/porcentagem_empresa", function(req, res, next){
    authToken.authMiddlewareUser(req, res , next)
}, function(req, res){
    joaoController.pegarPorcentagemEmpresa(req, res);
})

router.post("/rankEquipamentos", function(req, res, next){
    authToken.authMiddlewareUser(req, res , next)
}, function(req, res){
    joaoController.pegarRankEquipamentos(req, res);
})

router.post("/equipamentos_empresa", function(req, res, next){
    authToken.authMiddlewareUser(req, res , next)
}, function(req, res){
    joaoController.pegarEquipamentosEmpresa(req, res);
})

module.exports = router;
