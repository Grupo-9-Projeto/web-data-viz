const e = require("express");
var database = require("../database/config")

function listarFuncionarios(id){
    let instrucao = `SELECT funcionario.nome, funcionario.email, funcionario.cargo, gerente.nome AS nome_gestor FROM usuario AS gerente
INNER JOIN usuario AS funcionario ON gerente.id_usuario = funcionario.gestor_id
WHERE gerente.id_usuario = ?`;

    return database.executar(instrucao, id);
}

function editarFuncionario(nome, email, id){
    let instrucao = `UPDATE usuario SET nome = ?, email = ? WHERE id_usuario = ?`;
    let lista = [nome, email, id]

    return database.executar(instrucao, lista);
}

function verificarfuncionario(id){
    let instrucao = `
SELECT us.id_usuario AS gestor_id, us.nome, us.cargo, us2.id_usuario AS id_funcionario, us2.nome FROM usuario AS us
INNER JOIN usuario AS us2 ON us.id_usuario = us2.gestor_id
WHERE us2.id_usuario = ?`

    return database.executar(instrucao, id);
}

async function desativarFuncionario(id){
    let instrucao = await database.executar(`DELETE FROM usuario_empresa WHERE usuario_id = ?`, id);
    let instrucao2 = await database.executar(`DELETE FROM usuario WHERE id_usuario = ?`, id);
    let respostas = [instrucao, instrucao2];
    return respostas
}

function informacoesFuncionario(id){
    let instrucao = `SELECT id_usuario AS id, nome, email, cargo, ativo, fk_empresa_fornecedora FROM usuario WHERE id_usuario = ?`;

    return database.executar(instrucao, id);
}

module.exports = {
   listarFuncionarios,
   editarFuncionario,
   desativarFuncionario,
   informacoesFuncionario,
   verificarfuncionario
};