var componenteModel = require("../models/componentesModel");
var dispositivoModel = require("../models/dispositivosModel");
var empresaModel = require("../models/empresaModel");

async function listarComponentes(req, res) {
    let inforUsuario = req.user
    let id_dispositivo = req.body.idDispositivo;
    let empresa_id = req.body.empresa_id;

    if (!id_dispositivo || !empresa_id) {
        res.status(400).json({
            "Resposta": "Tá faltando campo"
        })
        console.log("tá faltnado campo")
        return false;
    }


    try {
        const empresas = await empresaModel.verificarEmpresa(inforUsuario.id)
        let ids = [];

        for (let i = 0; i < empresas.length; i++) {
            ids.push(empresas[i].id_empresa)
        }
        if (!ids.includes(empresa_id)) {
            res.status(400).json({
                "res": "Não pode mexer nessa empresa"
            })
            console.log("Não pode mexer aqui")
            return;
        }

        const dispositivos = await dispositivoModel.verificarDispositivo(empresa_id);
        let idsDispositivos = [];

        for (let i = 0; i < dispositivos.length; i++) {
            idsDispositivos.push(dispositivos[i].id_dispositivo)
        }

        if (!idsDispositivos.includes(id_dispositivo)) {
            res.status(400).json("Não pode mexer nesse dispositivo")
            console.log("não pode mexer aqui")
            return false;
        }

        const resposta = await componenteModel.listarComponentes(id_dispositivo)

        if (resposta.length == 0) {
            res.status(400).json("Não tem componentes")
            console.log("Não tem componentes")
            return false;
        }

        res.status(200).json(resposta)
        console.log(resposta)
        return true;
    } catch (erro) {
        res.status(500).json({
            "res": "Deu erro"
        })
        console.log(erro);
        return false;
    }

}

async function criarComponente(req, res) {
    let inforUsuario = req.user

    let id_dispositivo = req.body.idDispositivo;
    let empresa_id = req.body.empresa_id;

    let id_tipo = req.body.tipo_id;
    let nome_identificador = req.body.nome_identificador;
    let capacidade = req.body.capacidade
    let limiar_atencao = req.body.limiar_atencao;
    let limiar_alto = req.body.limiar_alto
    let limiar_critico = req.body.limiar_critico


    if (!id_dispositivo || !empresa_id || !id_tipo || !nome_identificador || !capacidade || !limiar_alto || !limiar_atencao || !limiar_critico) {
        res.status(400).json({
            "Resposta": "Tá faltando campo"
        })
        console.log("tá faltnado campo")
        return false;
    }


    try {
        const empresas = await empresaModel.verificarEmpresa(inforUsuario.id)
        let ids = [];

        for (let i = 0; i < empresas.length; i++) {
            ids.push(empresas[i].id_empresa)
        }
        if (!ids.includes(empresa_id)) {
            res.status(400).json({
                "res": "Não pode mexer nessa empresa"
            })
            console.log("Não pode mexer aqui")
            return;
        }

        const dispositivos = await dispositivoModel.verificarDispositivo(empresa_id);
        let idsDispositivos = [];

        for (let i = 0; i < dispositivos.length; i++) {
            idsDispositivos.push(dispositivos[i].id_dispositivo)
        }

        if (!idsDispositivos.includes(id_dispositivo)) {
            res.status(400).json("Não pode mexer nesse dispositivo")
            console.log("não pode mexer aqui")
            return false;
        }

        const componente = componenteModel.criarComponente(id_dispositivo, id_tipo, nome_identificador, capacidade, limiar_atencao, limiar_alto, limiar_critico)

        if (componente.affectedRows == 0) {
            res.status(500).json("Não foi criado")
            console.log("Não criou o compnente")
            return false;
        }

        res.status(201).json("COmponente criado com sucesso")
        console.log("Criou o componente")
        return true;
    } catch (erro) {
        res.status(500).json({
            "res": "Deu erro"
        })
        console.log(erro);
        return false;
    }
}

async function editarComponente(req, res) {
    let inforUsuario = req.user

    let id_dispositivo = req.body.idDispositivo;
    let empresa_id = req.body.empresa_id;

    let componte_id = req.body.componente_id;
    let id_tipo = req.body.tipo_id;
    let nome_identificador = req.body.nome_identificador;
    let capacidade = req.body.capacidade
    let limiar_atencao = req.body.limiar_atencao;
    let limiar_alto = req.body.limiar_alto
    let limiar_critico = req.body.limiar_critico


    if (!id_dispositivo || !empresa_id || !id_tipo || !nome_identificador || !capacidade || !limiar_alto || !limiar_atencao || !limiar_critico || !componte_id) {
        res.status(400).json({
            "Resposta": "Tá faltando campo"
        })
        console.log("tá faltnado campo")
        return false;
    }


    try {
        const empresas = await empresaModel.verificarEmpresa(inforUsuario.id)
        let ids = [];

        for (let i = 0; i < empresas.length; i++) {
            ids.push(empresas[i].id_empresa)
        }
        if (!ids.includes(empresa_id)) {
            res.status(400).json({
                "res": "Não pode mexer nessa empresa"
            })
            console.log("Não pode mexer aqui")
            return;
        }

        const dispositivos = await dispositivoModel.verificarDispositivo(empresa_id);
        let idsDispositivos = [];

        for (let i = 0; i < dispositivos.length; i++) {
            idsDispositivos.push(dispositivos[i].id_dispositivo)
        }

        if (!idsDispositivos.includes(id_dispositivo)) {
            res.status(400).json("Não pode mexer nesse dispositivo")
            console.log("não pode mexer aqui")
            return false;
        }

        const componentes = await componenteModel.listarComponentes(id_dispositivo)
        let idsComponentes = [];
        for(let i = 0; i < componentes.length; i++){
            idsComponentes.push(componentes[i].id_componente)
        }

        if(!idsComponentes.includes(componte_id)){
            res.status(400).json("Não pode mexer nesse componente")
            console.log("não pode mexer aqui")
            return false;
        }
        const editarComponente = await componenteModel.editarComponente(id_tipo, nome_identificador, capacidade, limiar_atencao, limiar_alto, limiar_critico, componte_id)

        if (editarComponente.affectedRows == 0) {
            res.status(500).json("Não foi editado")
            console.log("Não editou o compnente")
            return false;
        }

        res.status(201).json("COmponente editado com sucesso")
        console.log("editou o componente")
        return true;
    } catch (erro) {
        res.status(500).json({
            "res": "Deu erro"
        })
        console.log(erro);
        return false;
    }
}

async function desativarComponente(req, res){
     let inforUsuario = req.user

    let id_dispositivo = req.body.idDispositivo;
    let empresa_id = req.body.empresa_id;
    let componte_id = req.body.componente_id;
  


    if (!id_dispositivo || !empresa_id || !componte_id) {
        res.status(400).json({
            "Resposta": "Tá faltando campo"
        })
        console.log("tá faltnado campo")
        return false;
    }


    try {
        const empresas = await empresaModel.verificarEmpresa(inforUsuario.id)
        let ids = [];

        for (let i = 0; i < empresas.length; i++) {
            ids.push(empresas[i].id_empresa)
        }
        if (!ids.includes(empresa_id)) {
            res.status(400).json({
                "res": "Não pode mexer nessa empresa"
            })
            console.log("Não pode mexer aqui")
            return;
        }

        const dispositivos = await dispositivoModel.verificarDispositivo(empresa_id);
        let idsDispositivos = [];

        for (let i = 0; i < dispositivos.length; i++) {
            idsDispositivos.push(dispositivos[i].id_dispositivo)
        }

        if (!idsDispositivos.includes(id_dispositivo)) {
            res.status(400).json("Não pode mexer nesse dispositivo")
            console.log("não pode mexer aqui")
            return false;
        }

        const componentes = await componenteModel.listarComponentes(id_dispositivo)
        let idsComponentes = [];
        for(let i = 0; i < componentes.length; i++){
            idsComponentes.push(componentes[i].id_componente)
        }

        if(!idsComponentes.includes(componte_id)){
            res.status(400).json("Não pode mexer nesse componente")
            console.log("não pode mexer aqui")
            return false;
        }
        const editarComponente = await componenteModel.desativarComponente(componte_id)

        if (editarComponente.affectedRows == 0) {
            res.status(500).json("Não foi desativado")
            console.log("Não desativou o compnente")
            return false;
        }

        res.status(201).json("COmponente desativado com sucesso")
        console.log("desativou o componente")
        return true;
    } catch (erro) {
        res.status(500).json({
            "res": "Deu erro"
        })
        console.log(erro);
        return false;
    }
}

async function listarInformacoesComponente(req, res){
    let inforUsuario = req.user

    let id_dispositivo = req.body.idDispositivo;
    let empresa_id = req.body.empresa_id;
    let componte_id = req.body.componente_id;
  


    if (!id_dispositivo || !empresa_id || !componte_id) {
        res.status(400).json({
            "Resposta": "Tá faltando campo"
        })
        console.log("tá faltnado campo")
        return false;
    }


    try {
        const empresas = await empresaModel.verificarEmpresa(inforUsuario.id)
        let ids = [];

        for (let i = 0; i < empresas.length; i++) {
            ids.push(empresas[i].id_empresa)
        }
        if (!ids.includes(empresa_id)) {
            res.status(400).json({
                "res": "Não pode mexer nessa empresa"
            })
            console.log("Não pode mexer aqui")
            return;
        }

        const dispositivos = await dispositivoModel.verificarDispositivo(empresa_id);
        let idsDispositivos = [];

        for (let i = 0; i < dispositivos.length; i++) {
            idsDispositivos.push(dispositivos[i].id_dispositivo)
        }

        if (!idsDispositivos.includes(id_dispositivo)) {
            res.status(400).json("Não pode mexer nesse dispositivo")
            console.log("não pode mexer aqui")
            return false;
        }

        const componentes = await componenteModel.listarComponentes(id_dispositivo)
        let idsComponentes = [];
        for(let i = 0; i < componentes.length; i++){
            idsComponentes.push(componentes[i].id_componente)
        }

        if(!idsComponentes.includes(componte_id)){
            res.status(400).json("Não pode mexer nesse componente")
            console.log("não pode mexer aqui")
            return false;
        }
        const resposta = await componenteModel.listarInformacoesDispositivo(componte_id)

        if (editarComponente.length == 0) {
            res.status(500).json("Não tem informações")
            console.log("Não tem informações desse dispositivo")
            return false;
        }

        res.status(201).json(resposta)
        console.log(resposta)
        return true;
    } catch (erro) {
        res.status(500).json({
            "res": "Deu erro"
        })
        console.log(erro);
        return false;
    }
}


module.exports = {
    listarComponentes,
    criarComponente,
    editarComponente,
    desativarComponente,
    listarInformacoesComponente
}
