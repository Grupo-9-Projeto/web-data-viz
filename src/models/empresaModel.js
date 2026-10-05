const e = require("express");
var database = require("../database/config")

function listarEmpresa(id) {
    let instrucao = `
    SELECT us.id_usuario AS id_usuario, us.cargo, e_c.id_empresa AS id_empresa, e_c.nome_fantasia AS nome_empresa FROM usuario_empresa AS us_em
    INNER JOIN usuario AS us ON us.id_usuario = us_em.usuario_id
    INNER JOIN empresa_cliente AS e_c ON us_em.empresa_id = e_c.id_empresa
    WHERE us.id_usuario = ?`

    return database.executar(instrucao, id)
}

function criarEmpresa(nome, cnpj) {
    let intrucao = `INSERT INTO empresa_cliente(
    nome_fantasia,
    cnpj
) VALUES (
    ?,
    ?
)`
    let lista = [nome, cnpj]
    return database.executar(intrucao, lista)
}

function associarEmpresa(id, empresa_id){
    let instrucao = `INSERT INTO usuario_empresa(usuario_id, empresa_id) VALUES (?, ?)`
    let valores = [id, empresa_id]

    return database.executar(instrucao, valores);
}

function editarEmpresa(nome, cnpj, id_empresa){
    let instrucao = `UPDATE empresa_cliente SET nome_fantasia = ?, cnpj = ? WHERE id_empresa = ?`;
    let valores = [nome, cnpj, id_empresa]

    return database.executar(instrucao, valores);
}

async function deletarEmpresa(id_usuario, id_empresa){
    let valores = [id_usuario, id_empresa]
    let deletarEmpresaUsuario = await database.executar("DELETE FROM usuario_empresa WHERE usuario_id = ? AND empresa_id = ?", valores);
    let deletarEmpresa = await database.executar("DELETE FROM empresa_cliente WHERE id_empresa = ?", id_empresa)
    let respostas = [deletarEmpresaUsuario, deletarEmpresa];
    return respostas;

}

module.exports = {
    listarEmpresa,
    criarEmpresa,
    associarEmpresa,
    editarEmpresa,
    deletarEmpresa
};