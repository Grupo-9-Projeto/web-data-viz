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
        res.status(500).json({
            "Token não fornecido": erro.message
        })
        console.log("Token não fornecido", erro)
    }
}

module.exports = {
    authMiddlewareUser
}