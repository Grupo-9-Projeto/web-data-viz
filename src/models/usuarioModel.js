var database = require("../database/config")

function autenticar(email, senha) {
    console.log("ACESSEI O USUARIO MODEL \n \n\t\t >> Se aqui der erro de 'Error: connect ECONNREFUSED',\n \t\t >> verifique suas credenciais de acesso ao banco\n \t\t >> e se o servidor de seu BD está rodando corretamente. \n\n function entrar(): ", email, senha)
    var instrucaoSql = `
        SELECT id_usuario, nome, email, cargo FROM usuario WHERE email = '${email}' AND senha_hash = '${senha}' AND ativo = 1;
    `;
    console.log("Executando a instrução SQL: \n" + instrucaoSql);
    return database.executar(instrucaoSql);
}

// Coloque os mesmos parâmetros aqui. Vá para a var instrucaoSql
function cadastrar(nome, email, senha, token) {
    console.log("ACESSEI O USUARIO MODEL \n \n function cadastrar():", nome, email, senha, token);
    var instrucaoSql = `
        UPDATE usuario 
        SET nome = '${nome}', 
            email = '${email}', 
            senha_hash = '${senha}', 
            ativo = true 
        WHERE token = '${token}';
    `;
    
    console.log("Executando a instrução SQL: \n" + instrucaoSql);
    return database.executar(instrucaoSql);
}
function criarUsuario(empresa_id, nome, email, token) {
    let instrucao = `
        insert into usuario (empresa_id, nome, email, token)
        values (${empresa_id},'${nome}', '${email}', '${token}');
    `

    return database.executar(instrucao)
}


module.exports = {
    autenticar,
    cadastrar,
    criarUsuario
};