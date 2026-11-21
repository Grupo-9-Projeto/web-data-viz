let express = require("express");
let router = express.Router();
let thabataController = require("../controllers/thabataController");
let authToken = require("../middleware/auth.js");

router.get("/home", function (req, res, next) {
    authToken.authMiddlewareUser(req, res, next);
}, function (req, res) {
    thabataController.obterDadosHome(req, res);
});

module.exports = router;