var funcionarioModel = require("../models/funcionarioModel");
var usuarioModel = require("../models/usuarioModel")

async function listarFuncionarios(req, res) {
    let infoUsuario = req.user

    if (infoUsuario.role != "gerente") {

        res.status(403).json({
            "res": "Não permitido"
        })
        console.log("Deu erro, chefe")
        return false;
    }

    try {
        const resposta = await funcionarioModel.listarFuncionarios(infoUsuario.id);
        const arrayRes = [];
        if (resposta.length == 0) {
            res.status(404).json({
                "res": "Usuário não tem funcionarios"
            })
            return false;
        }

        for(let i = 0; i < resposta.length; i++){
            if(resposta[i].nome == null){
                continue

            }else{
                arrayRes.push(resposta[i])
            }
        }

        res.status(200).json(arrayRes)
        return true;
    } catch (erro) {
        res.status(500).json({
            "res": "Deu erro",
            "erro": erro
        })
        console.log(erro);
        return false;
    }
}



async function criarFuncionario(req, res) {
    let infoUsuario = req.user

    let email = req.body.email;

    if (infoUsuario.role != "gerente") {

        res.status(403).json({
            "res": "Não permitido"
        })
        console.log("Deu erro, chefe")
        return false;
    }

    if (!email) {
        res.status(400).json({
            "res": "faltando o email"
        })
        console.log("Deu erro, chefe")
        return false;
    }

    try {
        const resposta = await usuarioModel.autenticar(email);

        if(resposta.length != 0){
            res.status(400).json("Usuário já cadastrado");
            console.log("Usuário já existe")
            return;
        }

        fetch("http://localhost:3333/usuarios/criar-usuario", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                email: email,
                cargo: "analista",
                gestor_id: infoUsuario.id
            })
        }).then(response => {
            if (response.ok) {
                console.log("Criação de usuário realizado com sucesso! Um email já foi enviado com o token de acesso.");
                res.status(200).json({
                    "res": "Usuário analista criado com sucesso"
                })
                return true;
            } else {
                console.log("Houve um erro ao tentar realizar a criação de usuário. Verifique se o token é válido.");
                res.status(400).json({
                    "res": "Houve um erro ao tentar realizar a criação de usuário. Verifique se o token é válido."
                })
                return false;
            }
        })

    } catch (erro) {
        res.status(500).json({
            "res": "Deu erro",
            "erro": erro
        })
        console.log(erro);
        return false;
    }
}

async function editarFuncionario(req, res) {
    let infoUsuario = req.user;

    if (infoUsuario.role != "gerente") {

        res.status(403).json({
            "res": "Não permitido"
        })
        console.log("Deu erro, chefe")
        return false;
    }

    let email = req.body.email;
    let nome = req.body.nome;
    let id = req.body.id;


    if (!email || !nome) {
        res.status(400).json({
            "res": "faltando campo"
        })
        console.log("Deu erro, chefe. Olha o que deu aí")
        return false;
    }

    try {

        const respostaFunc = await funcionarioModel.verificarfuncionario(id);

        console.log(respostaFunc)
        if(respostaFunc[0].gestor_id != infoUsuario.id || respostaFunc.length == 0){
            res.status(400).json("Não pode mexer nesse funcionário")
            console.log("Não pode mexer nesse")
            return;
        }

        const resposta = await funcionarioModel.editarFuncionario(nome, email, id);

        if (resposta.affectedRows == 0) {
            res.status(404).json({
                "res": "deu algum erro"
            })
            console.log("Deu erro, chefe")
            return false;
        }

        res.status(200).json({
            "res": "Deu certo, funcionario editado!"
        })
        return true;
    } catch (erro) {
        res.status(500).json({
            "res": "Deu erro",
            "erro": erro
        })
        console.log(erro);
        return false;
    }
}

async function desativarFuncionario(req, res) {
    let infoUsuario = req.user;
    let id = req.body.id;

    console.log(req)

    if (infoUsuario.role != "gerente") {

        res.status(403).json({
            "res": "Não permitido"
        })
        console.log("Deu erro, chefe")
        return false;
    }

    if (!id) {

        res.status(403).json({
            "res": "Tà faltando campo"
        })
        console.log("Deu erro, chefe")
        return false;
    }

    try {

        const respostaFunc = await funcionarioModel.verificarfuncionario(id);

        console.log(respostaFunc)
        if(respostaFunc[0].gestor_id != infoUsuario.id || respostaFunc.length == 0){
            res.status(400).json("Não pode mexer nesse funcionário")
            console.log("Não pode mexer nesse")
            return;
        }

        const resposta = await funcionarioModel.desativarFuncionario(id);

        if (resposta[1].affectedRows == 0 || resposta[0].affectedRows == 0) {
            res.status(404).json({
                "res": "deu algum erro. Provavelmente o usuário já foi apagado"
            })
            console.log("Deu erro, chefe")
            return false;
        }

        res.status(200).json({
            "res": "Deu certo, usuario desativado!"
        })
        return true;
    } catch (erro) {
        res.status(500).json({
            "res": "Deu erro",
            "erro": erro
        })
        console.log(erro);
        return false;
    }
}

async function informacoesUsuario(req, res) {
    let infoUsuario = req.user;
    let id = req.body.id;

    if (infoUsuario.role != "gerente") {

        res.status(403).json({
            "res": "Não permitido"
        })
        console.log("Deu erro, chefe")
        return false;
    }

    if (!id) {
        res.status(403).json({
            "res": "Tà faltando campo"
        })
        console.log("Deu erro, chefe")
        return false;
    }

    try {

        const respostaFunc = await funcionarioModel.verificarfuncionario(id);

        console.log(respostaFunc)
        if(respostaFunc[0].gestor_id != infoUsuario.id || respostaFunc.length == 0){
            res.status(400).json("Não pode mexer nesse funcionário")
            console.log("Não pode mexer nesse")
            return;
        }

        const resposta = await funcionarioModel.informacoesFuncionario(id);

        if (resposta.length == 0) {
            res.status(404).json({
                "res": "deu algum erro"
            })
            console.log("Deu erro, chefe")
            return false;
        }

        res.status(200).json({
            "informacoes": resposta
        })
        console.log("Deu certo")
        return true;
    } catch (erro) {
        res.status(500).json({
            "res": "Deu erro",
            "erro": erro
        })
        console.log(erro);
        return false;
    }
}


module.exports = {
    listarFuncionarios,
    criarFuncionario,
    editarFuncionario,
    desativarFuncionario,
    informacoesUsuario
}
