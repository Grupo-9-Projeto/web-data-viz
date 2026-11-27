var jwt = require("jsonwebtoken")

function authMiddlewareUser(req, res, next) {
    const authHeader = req.headers["authorization"];

    if (!authHeader) {
        res.status(401).json("precisa de um token")
        return false;
    }
    try {
        const [aux, token] = authHeader.split(" ");

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        req.user = decoded;
        next();
    } catch (erro) {
        res.status(401).json({
            "res": "Token inválido ou expirado"
        })
        console.log("Token inválido ou expirado:", erro.message)
    }
}

module.exports = {
    authMiddlewareUser
}