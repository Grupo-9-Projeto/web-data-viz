let database = require("../database/config");

function contarAlertasPorSemana(id_usuario, inicio, fim) {
    let instrucao = `
        SELECT
            DATEDIFF(al.registrado_em, ?) DIV 7 AS semana,
            COUNT(al.idAlerta) AS total
        FROM usuario_empresa AS ue
        INNER JOIN dispositivo AS di ON di.empresa_id = ue.empresa_id
        INNER JOIN componente AS co ON co.dispositivo_id = di.id_dispositivo
        INNER JOIN Alerta AS al ON al.fkComponente = co.id_componente
        WHERE ue.usuario_id = ?
        AND al.nivel_alerta IN ('critico', 'atencao')
        AND al.registrado_em >= ?
        AND al.registrado_em < ?
        GROUP BY semana
        ORDER BY semana
    `;

    return database.executar(instrucao, [inicio, id_usuario, inicio, fim]);
}


function contarAlertasPorSemanaEEmpresa(id_usuario, inicio, fim) {
    let instrucao = `
        SELECT
            ue.empresa_id AS id_empresa,
            DATEDIFF(al.registrado_em, ?) DIV 7 AS semana,
            COUNT(al.idAlerta) AS total
        FROM usuario_empresa AS ue
        INNER JOIN dispositivo AS di ON di.empresa_id = ue.empresa_id
        INNER JOIN componente AS co ON co.dispositivo_id = di.id_dispositivo
        INNER JOIN Alerta AS al ON al.fkComponente = co.id_componente
        WHERE ue.usuario_id = ?
        AND al.nivel_alerta IN ('critico', 'atencao')
        AND al.registrado_em >= ?
        AND al.registrado_em < ?
        GROUP BY ue.empresa_id, semana
        ORDER BY ue.empresa_id, semana
    `;

    return database.executar(instrucao, [inicio, id_usuario, inicio, fim]);
}


function contarAlertasPorDiaEHorario(id_usuario, inicio, fim) {
    let instrucao = `
        SELECT
            WEEKDAY(al.registrado_em) AS dia,
            HOUR(al.registrado_em) DIV 4 AS faixa,
            COUNT(al.idAlerta) AS total
        FROM usuario_empresa AS ue
        INNER JOIN dispositivo AS di ON di.empresa_id = ue.empresa_id
        INNER JOIN componente AS co ON co.dispositivo_id = di.id_dispositivo
        INNER JOIN Alerta AS al ON al.fkComponente = co.id_componente
        WHERE ue.usuario_id = ?
        AND al.nivel_alerta IN ('critico', 'atencao')
        AND al.registrado_em >= ?
        AND al.registrado_em < ?
        GROUP BY dia, faixa
        ORDER BY dia, faixa
    `;

    return database.executar(instrucao, [id_usuario, inicio, fim]);
}

function listarEmpresasComSla(id_usuario) {
    let instrucao = `
        SELECT
            ec.id_empresa,
            ec.nome_fantasia AS nome_empresa,
            cs.nivel_SLA AS nivel_sla,
            cs.limite_resposta
        FROM usuario_empresa AS ue
        INNER JOIN empresa_cliente AS ec ON ec.id_empresa = ue.empresa_id
        LEFT JOIN Contrato_SLA AS cs ON cs.fkEmpresa = ec.id_empresa
        WHERE ue.usuario_id = ?
        ORDER BY ec.nome_fantasia, cs.idContrato_SLA DESC
    `;

    return database.executar(instrucao, id_usuario);
}


function contarAnalistas(id_gerente) {
    let instrucao = `
        SELECT COUNT(id_usuario) AS total
        FROM usuario
        WHERE gestor_id = ?
        AND cargo = 'analista'
        AND ativo = 1
    `;

    return database.executar(instrucao, id_gerente);
}


function listarChamados(id_usuario, inicio, fim) {
    let instrucao = `
        SELECT
            al.idAlerta AS id,
            ec.nome_fantasia AS empresa,
            di.numero_serie AS equipamento,
            DATE_FORMAT(al.registrado_em, '%Y-%m-%dT%H:%i:%s') AS aberto_em,
            (
                SELECT DATE_FORMAT(MIN(al2.registrado_em), '%Y-%m-%dT%H:%i:%s')
                FROM Alerta AS al2
                WHERE al2.fkComponente = al.fkComponente
                AND al2.nivel_alerta = 'saudavel'
                AND al2.registrado_em > al.registrado_em
            ) AS concluido_em
        FROM usuario_empresa AS ue
        INNER JOIN empresa_cliente AS ec ON ec.id_empresa = ue.empresa_id
        INNER JOIN dispositivo AS di ON di.empresa_id = ec.id_empresa
        INNER JOIN componente AS co ON co.dispositivo_id = di.id_dispositivo
        INNER JOIN Alerta AS al ON al.fkComponente = co.id_componente
        WHERE ue.usuario_id = ?
        AND al.nivel_alerta IN ('critico', 'atencao')
        AND al.registrado_em >= ?
        AND al.registrado_em < ?
        ORDER BY al.registrado_em
    `;

    return database.executar(instrucao, [id_usuario, inicio, fim]);
}

function listarChamadosPorModelo(id_usuario, inicio, fim) {
    let instrucao = `
        SELECT
            t.modelo,
            COUNT(*) AS chamados,
            COUNT(t.concluido_em) AS concluidos,
            AVG(TIMESTAMPDIFF(SECOND, t.aberto_em, t.concluido_em)) / 3600 AS tempo_medio_horas
        FROM (
            SELECT
                mo.nome_modelo AS modelo,
                al.registrado_em AS aberto_em,
                (
                    SELECT MIN(al2.registrado_em)
                    FROM Alerta AS al2
                    WHERE al2.fkComponente = al.fkComponente
                    AND al2.nivel_alerta = 'saudavel'
                    AND al2.registrado_em > al.registrado_em
                ) AS concluido_em
            FROM usuario_empresa AS ue
            INNER JOIN dispositivo AS di ON di.empresa_id = ue.empresa_id
            INNER JOIN modelo AS mo ON mo.id_modelo = di.modelo_id
            INNER JOIN componente AS co ON co.dispositivo_id = di.id_dispositivo
            INNER JOIN Alerta AS al ON al.fkComponente = co.id_componente
            WHERE ue.usuario_id = ?
            AND al.nivel_alerta IN ('critico', 'atencao')
            AND al.registrado_em >= ?
            AND al.registrado_em < ?
        ) AS t
        GROUP BY t.modelo
        ORDER BY chamados DESC, t.modelo
    `;

    return database.executar(instrucao, [id_usuario, inicio, fim]);
}


function listarDispositivosPorModelo(id_usuario) {
    let instrucao = `
        SELECT
            mo.nome_modelo AS modelo,
            di.id_dispositivo,
            di.endereco_mac AS mac
        FROM usuario_empresa AS ue
        INNER JOIN dispositivo AS di ON di.empresa_id = ue.empresa_id
        INNER JOIN modelo AS mo ON mo.id_modelo = di.modelo_id
        WHERE ue.usuario_id = ?
        ORDER BY mo.nome_modelo, di.id_dispositivo
    `;

    return database.executar(instrucao, id_usuario);
}


module.exports = {
    contarAlertasPorSemana,
    contarAlertasPorSemanaEEmpresa,
    contarAlertasPorDiaEHorario,
    listarEmpresasComSla,
    contarAnalistas,
    listarChamados,
    listarChamadosPorModelo,
    listarDispositivosPorModelo
};