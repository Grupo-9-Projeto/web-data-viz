let express = require('express');
let router = express.Router();
let mariaController = require('../controllers/mariaController');
let authToken = require('../middleware/auth.js');

router.get("/previsao_semanas", function(req, res, next){
    authToken.authMiddlewareUser(req, res , next)
}, function(req, res){
    mariaController.previsaoSemanas(req, res);
})

router.get("/previsao_mapa_calor", function(req, res, next){
    authToken.authMiddlewareUser(req, res , next)
}, function(req, res){
    mariaController.previsaoMapaCalor(req, res);
})

router.get("/previsao_empresas", function(req, res, next){
    authToken.authMiddlewareUser(req, res , next)
}, function(req, res){
    mariaController.previsaoEmpresas(req, res);
})

router.get("/chamados", function(req, res, next){
    authToken.authMiddlewareUser(req, res , next)
}, function(req, res){
    mariaController.chamadosPrevisoes(req, res);
})

module.exports = router;
