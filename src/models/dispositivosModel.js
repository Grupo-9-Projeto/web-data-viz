const e = require("express");
var database = require("../database/config");
const { informacoesFuncionario } = require("./funcionarioModel");

function listarDispositivos(idEmpresa, idUsuario){
    let instrucao = `
SELECT ec.nome_fantasia, ue.usuario_id, ec.id_empresa,di.id_dispositivo ,di.endereco_mac, di.numero_serie AS nome, di.status_dispositivo, mo.nome_modelo, ca.nome AS nome_categoria FROM usuario AS us
INNER JOIN usuario_empresa AS ue ON us.id_usuario = ue.usuario_id
INNER JOIN empresa_cliente AS ec ON ec.id_empresa = ue.empresa_id
INNER JOIN dispositivo AS di ON di.empresa_id = ec.id_empresa
INNER JOIN modelo AS mo ON di.modelo_id = mo.id_modelo
INNER JOIN categoria AS ca ON mo.categoria_id = ca.id_categoria
WHERE ue.empresa_id = ? AND ue.usuario_id = ?`;

    return database.executar(instrucao, [idEmpresa, idUsuario]);
}

function listarCategorias(){
    let instrucao = `SELECT * FROM categoria`

    return database.executar(instrucao);
}

function criarModelo(categoria_id, nome_modelo){
    let instrucao = `INSERT INTO modelo(categoria_id, nome_modelo) VALUES(?, ?)`;

    return database.executar(instrucao, [categoria_id, nome_modelo]);
}

function criarDispositivo(empresa_id, modelo_id, ip, endereco_mac, numero_serie){
    let instrucao = `INSERT INTO dispositivo(empresa_id, modelo_id, ip, endereco_mac, numero_serie) VALUES(?, ?, ?, ?, ?)`;


    return database.executar(instrucao, [empresa_id, modelo_id, ip, endereco_mac, numero_serie])
}

function editarDispositivo(empresa_id, dispositivo_id, ip, endereco_mac, numero_serie){
    let instrucao = `
    UPDATE dispositivo SET ip = ?, endereco_mac = ?, numero_serie = ? WHERE id_dispositivo = ? AND empresa_id = ?
    `;

    return database.executar(instrucao, [ip, endereco_mac, numero_serie, dispositivo_id, empresa_id])
}

function desativarDispositivo(id_dispositivo){
    let instrucao = `
    UPDATE dispositivo SET status_dispositivo = "desativado" WHERE id_dispositivo = ?
    `;

    return database.executar(instrucao, id_dispositivo)
}

function listarInformacoesDispositivo(id_dispositivo){
    let instrucao = `SELECT * FROM dispositivo WHERE id_dispositivo = ?`;

    return database.executar(instrucao, id_dispositivo)
}

function verificarDispositivo(id){
    let instrucao = `SELECT ec.id_empresa, di.id_dispositivo FROM empresa_cliente AS ec
INNER JOIN dispositivo AS di ON ec.id_empresa = di.empresa_id WHERE ec.id_empresa = ?`;

    return database.executar(instrucao, id)
}

module.exports = {
   listarDispositivos,
   listarCategorias,
   criarModelo,
   criarDispositivo,
   editarDispositivo,
   desativarDispositivo,
   listarInformacoesDispositivo,
   verificarDispositivo
};