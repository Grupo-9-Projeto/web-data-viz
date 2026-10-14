var express = require("express");
var router = express.Router();

var authToken = require("../middleware/auth.js");
var componentesController = require("../controllers/componentesController.js")

router.post("/listar_componentes", function(req, res, next){
    authToken.authMiddlewareUser(req, res , next)
}, function(req, res){
    componentesController.listarComponentes(req, res);
})

router.post("/criar_componente", function(req, res, next){
    authToken.authMiddlewareUser(req, res , next)
}, function(req, res){
    componentesController.criarComponente(req, res);
})


router.post("/editar_componente", function(req, res, next){
    authToken.authMiddlewareUser(req, res , next)
}, function(req, res){
    componentesController.editarComponente(req, res);
})

router.delete("/desativar_componente", function(req, res, next){
    authToken.authMiddlewareUser(req, res , next)
}, function(req, res){
    componentesController.desativarComponente(req, res);
})

router.post("/listar_componente", function(req, res, next){
    authToken.authMiddlewareUser(req, res , next)
}, function(req, res){
    componentesController.listarInformacoesComponente(req, res);
})

module.exports = router;