var database = require("../database/config");

const SELECT_CHAMADO = `
SELECT
    vs.id_violacao,
    CONCAT('SLA-', LPAD(vs.id_violacao, 3, '0')) AS id,
    DATE_FORMAT(vs.ocorrido_em, '%Y-%m-%d') AS data,
    ec.nome_fantasia AS empresa,
    di.numero_serie AS equipamento,
    vs.tipo_sla,
    vs.prioridade,
    vs.status,
    vs.chamado_jira AS chamado_vinculado,
    vs.responsavel,
    vs.descricao
FROM violacao_sla AS vs
INNER JOIN dispositivo AS di ON di.id_dispositivo = vs.dispositivo_id
INNER JOIN empresa_cliente AS ec ON ec.id_empresa = di.empresa_id
INNER JOIN usuario_empresa AS ue ON ue.empresa_id = ec.id_empresa`;

function listarChamados(idUsuario, filtros) {
    let where = "WHERE ue.usuario_id = ?";
    let valores = [idUsuario];

    if (filtros.dataInicio) {
        where += " AND vs.ocorrido_em >= ?";
        valores.push(filtros.dataInicio);
    }
    if (filtros.dataFim) {
        where += " AND vs.ocorrido_em < DATE_ADD(?, INTERVAL 1 DAY)";
        valores.push(filtros.dataFim);
    }
    if (filtros.equipamento) {
        where += " AND di.numero_serie = ?";
        valores.push(filtros.equipamento);
    }

    let instrucao = `${SELECT_CHAMADO} ${where} ORDER BY DATE(vs.ocorrido_em) DESC, vs.id_violacao DESC`;

    return database.executar(instrucao, valores);
}

function contarChamados(idUsuario) {
    let instrucao = `
SELECT COUNT(*) AS total
FROM violacao_sla AS vs
INNER JOIN dispositivo AS di ON di.id_dispositivo = vs.dispositivo_id
INNER JOIN usuario_empresa AS ue ON ue.empresa_id = di.empresa_id
WHERE ue.usuario_id = ?`;

    return database.executar(instrucao, [idUsuario]);
}

function listarEquipamentos(idUsuario) {
    let instrucao = `
SELECT DISTINCT di.numero_serie AS equipamento
FROM violacao_sla AS vs
INNER JOIN dispositivo AS di ON di.id_dispositivo = vs.dispositivo_id
INNER JOIN usuario_empresa AS ue ON ue.empresa_id = di.empresa_id
WHERE ue.usuario_id = ?
ORDER BY di.numero_serie`;

    return database.executar(instrucao, [idUsuario]);
}

function buscarChamado(idUsuario, idViolacao) {
    let instrucao = `${SELECT_CHAMADO} WHERE ue.usuario_id = ? AND vs.id_violacao = ?`;

    return database.executar(instrucao, [idUsuario, idViolacao]);
}

module.exports = {
    listarChamados,
    contarChamados,
    listarEquipamentos,
    buscarChamado
};