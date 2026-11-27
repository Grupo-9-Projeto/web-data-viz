var joaoModel = require("../models/joaoModel")
var empresaModel = require("../models/empresaModel")


async function carregarDispositivosEmpresas(req, res){
    let infoUsuario = req.user;

    try {
        const resultado = await joaoModel.selectDispositivosMonitorados(infoUsuario.id);
        res.status(200).json(resultado);
    } catch (erro) {
        console.error(erro);
        res.status(500).json({
            "res": "Deu erro"
        });
    }
}

async function pegarAlertasEmpresa(req, res){
    let infoUsuario = req.user;

    let id_empresa = req.body.id_empresa;

    try {
        const verificarEmpresa = await empresaModel.verificarEmpresa(infoUsuario.id);
        let ids = false;
        verificarEmpresa.forEach(element => {
            if(id_empresa === element.id_empresa){
                ids = true
            }
        });
        
        if(!ids){
            res.status(400).json("Não pode ver essa empresa")
        }

        const resposta = await joaoModel.selectAlertasEmpresa(id_empresa, infoUsuario.id);

        if(resposta.length == 0){
            res.status(200).json("Não tem alertas")
        }
        res.status(200).json(resposta)

    } catch (erro) {
        console.error(erro);
        res.status(500).json({
            "res": "Deu erro"
        });
    }
}

async function pegarPorcentagemEmpresa(req, res){
    let infoUsuario = req.user;

    let id_empresa = req.body.id_empresa;

    try {
        const verificarEmpresa = await empresaModel.verificarEmpresa(infoUsuario.id);
        let ids = false;
        verificarEmpresa.forEach(element => {
            if(id_empresa === element.id_empresa){
                ids = true
            }
        });
        
        if(!ids){
            res.status(400).json("Não pode ver essa empresa")
        }

        const resposta = await joaoModel.porcentagemDisponibilidade(infoUsuario.id, id_empresa);

        if(resposta.length == 0){
            res.status(200).json("Não tem alertas")
        }
        res.status(200).json(resposta)

    } catch (erro) {
        console.error(erro);
        res.status(500).json({
            "res": "Deu erro"
        });
    }
}

async function pegarRankEquipamentos(req, res){
    let infoUsuario = req.user;

    try {

        const resposta = await joaoModel.rankEquipamentos(infoUsuario.id);

        if(resposta.length == 0){
            res.status(200).json("Não tem rank")
        }
        res.status(200).json(resposta)

    } catch (erro) {
        console.error(erro);
        res.status(500).json({
            "res": "Deu erro"
        });
    }
}

async function pegarEquipamentosEmpresa(req, res){
    let infoUsuario = req.user;

    let id_empresa = req.body.id_empresa;

    try {
        const verificarEmpresa = await empresaModel.verificarEmpresa(infoUsuario.id);
        let ids = false;
        verificarEmpresa.forEach(element => {
            if(id_empresa === element.id_empresa){
                ids = true
            }
        });
        
        if(!ids){
            res.status(400).json("Não pode ver essa empresa")
        }

        const resposta = await joaoModel.equipamentosEmpresa(infoUsuario.id, id_empresa);

        if(resposta.length == 0){
            res.status(200).json("Não tem alertas")
        }
        res.status(200).json(resposta)

    } catch (erro) {
        console.error(erro);
        res.status(500).json({
            "res": "Deu erro"
        });
    }
}



module.exports = {
    carregarDispositivosEmpresas,
    pegarAlertasEmpresa,
    pegarPorcentagemEmpresa,
    pegarRankEquipamentos,
    pegarEquipamentosEmpresa
}
