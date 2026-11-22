var database = require("../database/config");

function buscarRelatorioAlerta(idAlerta, idUsuario) {

    var instrucaoSql = `
        SELECT
            -- ALERTA
            a.idAlerta,
            a.registrado_em,
            a.nivel_alerta,
            a.valor_registrado,
            a.unidade_medida,
            a.descricao,
            a.jira_key,
            a.status_jira,

            -- COMPONENTE
            c.id_componente,
            c.nome_identificador,
            c.capacidade,
            c.limiar_atencao,
            c.limiar_alto,
            c.limiar_critico,
            tc.nome AS tipo_componente,

            -- DISPOSITIVO
            d.id_dispositivo,
            d.nome_dispositivo,
            d.ip,
            d.endereco_mac,
            d.numero_serie,
            d.status_dispositivo,

            -- MODELO E CATEGORIA
            m.nome_modelo,
            cat.nome AS categoria,

            -- EMPRESA
            ec.id_empresa,
            ec.nome_fantasia

        FROM Alerta a

        INNER JOIN componente c
            ON a.fkComponente = c.id_componente

        INNER JOIN tipo_componente tc
            ON c.tipo_id = tc.id_tipo

        INNER JOIN dispositivo d
            ON c.dispositivo_id = d.id_dispositivo

        INNER JOIN modelo m
            ON d.modelo_id = m.id_modelo

        INNER JOIN categoria cat
            ON m.categoria_id = cat.id_categoria

        INNER JOIN empresa_cliente ec
            ON d.empresa_id = ec.id_empresa

        INNER JOIN usuario_empresa ue
            ON ue.empresa_id = ec.id_empresa

        WHERE
            a.idAlerta = ?
            AND ue.usuario_id = ?;
    `;

    return database.executar(instrucaoSql, [idAlerta, idUsuario]);
}

module.exports = {
    buscarRelatorioAlerta
};