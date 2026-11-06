const e = require("express");
var database = require("../database/config");

function listarComponentes(id_dispositivo){
    let intrucao = `SELECT id_componente, dispositivo_id, nome_identificador, ativo FROM componente WHERE dispositivo_id = ?`;

    return database.executar(intrucao, id_dispositivo)
}

function listarTipoComponente(id){
  let instrucao = `SELECT * FROM tipo_componente WHERE id_tipo = ?`;

  return database.executar(instrucao, id)
}

function criarComponente(dispositivo_id,tipo_id, nome_identificador, capacidade, limiar_atencao, limiar_alto, limiar_critico ){
    let instrucao = `INSERT INTO componente (dispositivo_id, tipo_id, nome_identificador, capacidade, limiar_atencao, limiar_alto, limiar_critico) VALUES(?, ?, ?, ?, ?, ?, ?)`;

    return database.executar(instrucao, [dispositivo_id, tipo_id, nome_identificador, capacidade, limiar_atencao, limiar_alto, limiar_critico])
}

function editarComponente(tipo_id, nome_identificador, capacidade, limiar_atencao, limiar_alto, limiar_critico, id_componente, status){
    let instrucao = `UPDATE componente SET tipo_id = ?, nome_identificador = ?, capacidade = ?, limiar_atencao = ?, limiar_alto = ?, limiar_critico = ? , ativo = ? WHERE id_componente = ?`;

    return database.executar(instrucao, [tipo_id, nome_identificador, capacidade, limiar_atencao, limiar_alto, limiar_critico, status, id_componente])
}

function desativarComponente(id_compoente){
  let intrucao = `UPDATE componente SET ativo = 0 WHERE id_componente = ?`

  return database.executar(intrucao, id_compoente)
}

function listarInformacoesDispositivo(id_componente){
  let intrucao = `SELECT * FROM componente WHERE id_componente = ? `;

  return database.executar(intrucao, id_componente)
}

function criarTipoComponente(nome, unidade_medida){
  let instrucao = `INSERT INTO tipo_componente(nome, unidade_medida) VALUES(?, ?)`;

  return database.executar(instrucao, [nome, unidade_medida])
}

function listarTodosTiposComponentes(){
  let intrucao = `SELECT * FROM tipo_componente`;
  return database.executar(intrucao)
}


module.exports = {
  listarComponentes,
  listarTipoComponente,
  criarComponente,
  editarComponente,
  desativarComponente,
  listarInformacoesDispositivo,
  criarTipoComponente,
  listarTodosTiposComponentes
};