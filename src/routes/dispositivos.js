var express = require("express");
var router = express.Router();

var dispositivoController = require("../controllers/dispositivosController.js");
var authToken = require("../middleware/auth.js");

router.post("/listar_dispositivos", function(req, res, next){
    authToken.authMiddlewareUser(req, res , next)
}, function(req, res){
    dispositivoController.listarEquipamentos(req, res);
})

router.post("/criar_dispositivo", function(req, res, next){
    authToken.authMiddlewareUser(req, res , next)
}, function(req, res){
    dispositivoController.criarDispositivo(req, res);
})

router.post("/editar_dispositivo", function(req, res, next){
    authToken.authMiddlewareUser(req, res , next)
}, function(req, res){
    dispositivoController.editarDispositivo(req, res);
})

router.delete("/desativar_dispositivo", function(req, res, next){
    authToken.authMiddlewareUser(req, res , next)
}, function(req, res){
    dispositivoController.desativarDispositivo(req, res);
})

router.post("/listar_informacoes_dispositivo", function(req, res, next){
    authToken.authMiddlewareUser(req, res , next)
}, function(req, res){
    dispositivoController.listarInformacoesDispositivo(req, res);
})

router.get("/listar_modelos", function(req, res, next){
    authToken.authMiddlewareUser(req, res , next)
}, function(req, res){
    dispositivoController.listarCategorias(req, res);
})

module.exports = router;