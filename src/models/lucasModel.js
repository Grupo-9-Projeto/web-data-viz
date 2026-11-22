var database = require("../database/config");

function verificarAcessoDispositivo(idUsuario, idDispositivo) {
    let instrucao = `
        SELECT d.id_dispositivo
        FROM dispositivo AS d
        INNER JOIN usuario_empresa AS ue ON d.empresa_id = ue.empresa_id
        WHERE ue.usuario_id = ? AND d.id_dispositivo = ?
    `;
    return database.executar(instrucao, [idUsuario, idDispositivo]);
}

function buscarDispositivoPorId(idDispositivo) {
    let instrucao = `
        SELECT
            d.id_dispositivo,
            d.ip,
            d.endereco_mac,
            d.numero_serie,
            d.status_dispositivo,
            ec.id_empresa,
            ec.nome_fantasia AS empresa,
            m.nome_modelo AS modelo,
            cat.nome AS categoria
        FROM dispositivo AS d
        INNER JOIN empresa_cliente AS ec ON d.empresa_id = ec.id_empresa
        INNER JOIN modelo AS m ON d.modelo_id = m.id_modelo
        INNER JOIN categoria AS cat ON m.categoria_id = cat.id_categoria
        WHERE d.id_dispositivo = ?
    `;
    return database.executar(instrucao, [idDispositivo]);
}

function listarComponentesDispositivo(idDispositivo) {
    let instrucao = `
        SELECT
            c.id_componente,
            c.nome_identificador,
            c.capacidade,
            c.limiar_atencao,
            c.limiar_alto,
            c.limiar_critico,
            t.nome AS tipo_nome,
            t.unidade_medida
        FROM componente AS c
        INNER JOIN tipo_componente AS t ON c.tipo_id = t.id_tipo
        WHERE c.dispositivo_id = ? AND c.ativo = 1
    `;
    return database.executar(instrucao, [idDispositivo]);
}

function listarAlertasDispositivo(idDispositivo) {
    let instrucao = `
        SELECT
            a.idAlerta,
            a.registrado_em,
            a.nivel_alerta,
            a.valor_registrado,
            a.unidade_medida,
            a.descricao,
            a.jira_key,
            a.status_jira,
            c.nome_identificador AS componente,
            t.nome AS tipo_nome,
            c.limiar_critico
        FROM alerta AS a
        INNER JOIN componente AS c ON a.fkComponente = c.id_componente
        INNER JOIN tipo_componente AS t ON c.tipo_id = t.id_tipo
        WHERE c.dispositivo_id = ?
        ORDER BY a.registrado_em DESC
    `;
    return database.executar(instrucao, [idDispositivo]);
}

module.exports = {
    verificarAcessoDispositivo,
    buscarDispositivoPorId,
    listarComponentesDispositivo,
    listarAlertasDispositivo
};