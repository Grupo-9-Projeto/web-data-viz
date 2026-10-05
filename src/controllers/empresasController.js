var empresaModel = require("../models/empresaModel");

async function listarEmpresas(req, res) {
    let infoUsuario = req.user

    try {
        const resposta = await empresaModel.listarEmpresa(infoUsuario.id);

        if (resposta.length == 0) {
            res.status(404).json({
                "res": "Usuário não tem empresas"
            })
            return false;
        }

        res.status(200).json(resposta)
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

async function criarEmpresa(req, res) {
    let infoUsuario = req.user

    let nome = req.body.nome_empresa;
    let cnpj = req.body.cnpj;

    if (infoUsuario.role != "gerente") {

        res.status(403).json({
            "res": "Não permitido"
        })
        console.log("Deu erro, chefe")
        return false;
    }

    if (!nome || !cnpj) {
        res.status(400).json({
            "res": "faltando algum campo"
        })
        console.log("Deu erro, chefe")
        return false;
    }

    try {
        const resultadoCriacao = await empresaModel.criarEmpresa(nome, cnpj);

        if (resultadoCriacao.affectedRows == 0) {
            res.status(400).json({
                "res": "deu algum erro"
            })
            console.log("Deu erro, chefe")
            return false;
        }

        console.log("empresa criada com sucesso. Associando ela ao usuário...")

        const resultadoAssociacao = await empresaModel.associarEmpresa(infoUsuario.id, resultadoCriacao.insertId);
        console.log(resultadoAssociacao)
        console.log("Usuário associado com sucesso")
        res.status(201).json({
            "res": "Deu certo, empresa criada"
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

async function editarEmpresa(req, res) {
    let infoUsuario = req.user;

    let nome = req.body.nome_empresa;
    let cnpj = req.body.cnpj;
    let id = req.body.id_empresa;

    if (infoUsuario.role != "gerente") {

        res.status(403).json({
            "res": "Não permitido"
        })
        console.log("Deu erro, chefe")
        return false;
    }

    if (!nome || !cnpj) {
        res.status(400).json({
            "res": "faltando algum campo"
        })
        console.log("Deu erro, chefe")
        return false;
    }


    try {
        const resposta = await empresaModel.editarEmpresa(nome, cnpj, id);

        if (resposta.affectedRows == 0) {
            res.status(404).json({
                "res": "deu algum erro"
            })
            console.log("Deu erro, chefe")
            return false;
        }

        res.status(200).json({
            "res": "Deu certo, empresa editada!"
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

async function deletarEmpresa(req, res) {
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

    try{
        const resposta = await empresaModel.deletarEmpresa(infoUsuario.id, id);

        if(resposta.affectedRows == 0){
             res.status(404).json({
                "res": "deu algum erro, provavelmente a empresa não existe associada a esse usuário"
            })
            console.log("Deu erro, chefe")
            return false;
        }

        res.status(200).json({
            "res": "Deu certo, empresa apagada!"
        })
        return true;
    }catch(erro){
        res.status(500).json({
            "res": "Deu erro",
            "erro": erro
        })
        console.log(erro);
        return false;
    }
}

module.exports = {
    listarEmpresas,
    criarEmpresa,
    editarEmpresa,
    deletarEmpresa
}
