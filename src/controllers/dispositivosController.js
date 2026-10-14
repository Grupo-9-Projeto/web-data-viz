var dispositivoModel = require("../models/dispositivosModel");
var empresaModel = require("../models/empresaModel");


async function listarEquipamentos(req, res) {
    let infoUser = req.user
    let idEmpresa = req.body.idEmpresa;

    if (!idEmpresa) {
        res.status(400).json({
            "Resposta": "Tá faltando campo"
        })
        console.log("tá faltnado campo")
        return false;
    }
    try {

        const empresas = await empresaModel.verificarEmpresa(infoUser.id)
        let ids = [];
        for (let i = 0; i < empresas.length; i++) {
            ids.push(empresas[i].id_empresa)
        }
        if (!ids.includes(idEmpresa)) {
            res.status(400).json({
                "res": "Não pode mexer nessa empresa"
            })
            console.log("Não pode mexer aqui")
            return;
        }


        const resposta = await dispositivoModel.listarDispositivos(idEmpresa, infoUser.id)

        if (resposta.length == 0) {
            res.status(400).json("Não tem dispositivos")
            console.log("Nenhuma empresa encontrada")
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

async function criarDispositivo(req, res) {
    let infoUser = req.user;

    let nomeModelo = req.body.nomeModelo;
    let idCategoria = req.body.categoria_id;

    let idEmpresa = req.body.empresa_id;
    let ip = req.body.ip;
    let endereco_mac = req.body.endereco_mac;
    let numero_serie = req.body.numero_serie;


    if (infoUser.role != "gerente") {

        res.status(403).json({
            "res": "Não permitido"
        })
        console.log("Deu erro, chefe")
        return false;
    }

    if (!nomeModelo || !idCategoria || !idEmpresa || !ip || !endereco_mac || !numero_serie) {
        res.status(400).json({
            "Resposta": "Tá faltando campo"
        })
        console.log("tá faltnado campo")
        return false;
    }

    try {
        const modelos = await dispositivoModel.listarModelo(idCategoria);
        const dispositivos = await dispositivoModel.listarDispositivos(idEmpresa, infoUser.id)
        const empresas = await empresaModel.verificarEmpresa(infoUser.id)
        let ids = [];

        for (let i = 0; i < modelos.length; i++) {
            if (modelos[i].nome_modelo.toLowerCase() == nomeModelo.toLowerCase()) {
                res.status(400).json("Já existe um modelo com esse nome")
                console.log("Já existe um modelo com esse nome")
                return false;
            }
        }
        for (let i = 0; i < dispositivos.length; i++) {
            if (dispositivos[i].endereco_mac.toLowerCase() == endereco_mac.toLowerCase()) {
                res.status(400).json("Já existe um equipamento com esse endereco")
                console.log("Já existe um equipamento com esse endereco")
                return false;
            }
        }
        for (let i = 0; i < empresas.length; i++) {
            ids.push(empresas[i].id_empresa)
        }
        if (!ids.includes(idEmpresa)) {
            res.status(400).json({
                "res": "Não pode mexer nessa empresa"
            })
            console.log("Não pode mexer aqui")
            return;
        }

        const criarModelo = await dispositivoModel.criarModelo(idCategoria, nomeModelo)

        const criarDispositivo = await dispositivoModel.criarDispositivo(idEmpresa, criarModelo.insertId, ip, endereco_mac, numero_serie)

        res.status(201).json("Dispositivo criado com sucesso")
        console.log("dispositivo criado")
        return true;

    } catch (erro) {
        res.status(500).json({
            "res": "Deu erro"
        })
        console.log(erro);
        return false;
    }
}

async function editarDispositivo(req, res) {
    let infoUser = req.user;

    let empresa_id = req.body.empresa_id;
    let dispositivo_id = req.body.dispositivo_id;
    let ip = req.body.ip;
    let endereco_mac = req.body.endereco_mac;
    let numero_serie = req.body.numero_serie;

    if (infoUser.role != "gerente") {

        res.status(403).json({
            "res": "Não permitido"
        })
        console.log("Deu erro, chefe")
        return false;
    }

    if (!empresa_id || !dispositivo_id || !ip || !endereco_mac || !numero_serie) {
        res.status(400).json({
            "Resposta": "Tá faltando campo"
        })
        console.log("tá faltnado campo")
        return false;
    }

    try {
        const dispositivos = await dispositivoModel.listarDispositivos(empresa_id, infoUser.id)
        const empresas = await empresaModel.verificarEmpresa(infoUser.id)
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
        for (let i = 0; i < dispositivos.length; i++) {
            if (dispositivos[i].endereco_mac.toLowerCase() == endereco_mac.toLowerCase()) {
                res.status(400).json("Já existe um equipamento com esse endereco")
                console.log("Já existe um equipamento com esse endereco")
                return false;
            }
        }
        const dispositivosRes = await dispositivoModel.verificarDispositivo(empresa_id);
        let idsDispositivos = [];

        for(let i = 0; i < dispositivosRes.length; i++){
            idsDispositivos.push(dispositivosRes[i].id_dispositivo)
        }
        
        if(!idsDispositivos.includes(dispositivo_id)){
            res.status(400).json("Não pode mexer nesse dispositivo")
            console.log("não pode mexer aqui")
            return false;
        }

        const editarDispo = await dispositivoModel.editarDispositivo(empresa_id, dispositivo_id, ip, endereco_mac, numero_serie)

        res.status(201).json("Dispositivo editado com sucesso")
        console.log("dispositivo editado")
        return true;
    } catch (erro) {
        res.status(500).json({
            "res": "Deu erro"
        })
        console.log(erro);
        return false;
    }
}

async function desativarDispositivo(req, res) {
    let infoUser = req.user;

    let dispositivo_id = req.body.dispositivo_id;
    let empresa_id = req.body.empresa_id;

    if (infoUser.role != "gerente") {

        res.status(403).json({
            "res": "Não permitido"
        })
        console.log("Deu erro, chefe")
        return false;
    }

    if(!dispositivo_id || !empresa_id){
          res.status(400).json({
            "Resposta": "Tá faltando campo"
        })
        console.log("tá faltnado campo")
        return false;
    }

    try {
        const empresas = await empresaModel.verificarEmpresa(infoUser.id)
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

        for(let i = 0; i < dispositivos.length; i++){
            idsDispositivos.push(dispositivos[i].id_dispositivo)
        }
        
        if(!idsDispositivos.includes(dispositivo_id)){
            res.status(400).json("Não pode mexer nesse dispositivo")
            console.log("não pode mexer aqui")
            return false;
        }

        const desativarDispositivo = await dispositivoModel.desativarDispositivo(dispositivo_id)
        res.status(201).json("Dispositivo desativado com sucesso")
        console.log("dispositivo desativado")
        return true;
    } catch (erro) {
        res.status(500).json({
            "res": "Deu erro"
        })
        console.log(erro);
        return false;
    }
}

async function listarInformacoesDispositivo(req, res) {
    let infoUser = req.user;

    let dispositivo_id = req.body.dispositivo_id;
    let empresa_id = req.body.id_empresa

    if (infoUser.role != "gerente") {

        res.status(403).json({
            "res": "Não permitido"
        })
        console.log("Deu erro, chefe")
        return false;
    }

    try {
        const empresas = await empresaModel.verificarEmpresa(infoUser.id)
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

        for(let i = 0; i < dispositivos.length; i++){
            idsDispositivos.push(dispositivos[i].id_dispositivo)
        }
        
        if(!idsDispositivos.includes(dispositivo_id)){
            res.status(400).json("Não pode mexer nesse dispositivo")
            console.log("não pode mexer aqui")
            return false;
        }

        const resposta = await dispositivoModel.listarInformacoesDispositivo(dispositivo_id)

        res.status(201).json(resposta)
        return true;
    } catch (erro) {
        res.status(500).json({
            "res": "Deu erro"
        })
        console.log(erro);
        return false;
    }
}

async function listarCategorias(req, res){
    let infoUser = req.user;

    if (infoUser.role != "gerente") {

        res.status(403).json({
            "res": "Não permitido"
        })
        console.log("Deu erro, chefe")
        return false;
    }

    try {
        const resposta = await dispositivoModel.listarCategorias();

        if(resposta.length == 0){
            res.status(400).json("Não tem categorias")
            console.log("Não tem categorias")
            return false;
        }

        res.status(200).json(resposta)
        console.log("Deu certo pegar as categorias")
        return false;
    } catch (erro) {
        res.status(500).json({
            "res": "Deu erro"
        })
        console.log(erro);
        return false;
    }
}

module.exports = {
    listarEquipamentos,
    criarDispositivo,
    editarDispositivo,
    desativarDispositivo,
    listarInformacoesDispositivo,
    listarCategorias
}
