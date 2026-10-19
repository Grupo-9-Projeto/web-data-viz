const e = require("express");
var database = require("../database/config")

async function autenticar(email) {
    let instrucao = `SELECT id_usuario ,gestor_id, nome, senha_hash , email, cargo, ativo, fk_empresa_fornecedora FROM usuario WHERE email = ?`;

    return database.executar(instrucao, email);
}

function inutilizarToken(email, token){
    let parametros = [email, token]
    let instrucao = "UPDATE usuario SET token = null WHERE email = ? AND token = ?";

    return database.executar(instrucao, parametros);
}


async function cadastrar(nome, email, senha, token) {
    console.log("ACESSEI O USUARIO MODEL \n \n function cadastrar():", nome, email, senha, token);
    let parametros = [nome, senha, token, email]
    var instrucaoSql = `
        UPDATE usuario 
        SET nome = ?, 
            senha_hash = ?, 
            ativo = true 
        WHERE token = ? AND email = ?;
    `;
    
    console.log("Executando a instrução SQL: \n" + instrucaoSql);
    let resultado = await database.executar(instrucaoSql, parametros); 
    return resultado
}

function editar(nome, email, senha, id){
    let instrucao = "UPDATE usuario SET nome = ?, email = ? , senha_hash = ? WHERE id_usuario = ?";
    let valores = [nome, email, senha, id];

    return database.executar(instrucao, valores);
}

function validarEmail(email, id){
    let instrucao = "SELECT email FROM usuario WHERE email = ? AND id_usuario != ?";
    let valores = [email, id]
    return database.executar(instrucao, valores);
}

async function deletarConta(id){
    let intrucao = `UPDATE usuario SET ativo = 0 WHERE id_usuario = ?`;
    
    return database.executar(intrucao, id);
}

function cadastrarSuperAdmin(senha){
    let instrucao = `INSERT INTO usuario (
    gestor_id,
    nome,
    email,
    senha_hash,
    cargo,
    fk_empresa_fornecedora,
    ativo
) VALUES
(NULL, 'admin', 'admin@cisco.com', ?, 'super', 1, 1)`;

    return database.executar(instrucao, senha)
}


module.exports = {
    autenticar,
    cadastrar,
    inutilizarToken,
    editar,
    validarEmail,
    deletarConta,
    cadastrarSuperAdmin
};