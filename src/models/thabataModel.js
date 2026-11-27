const database = require("../database/config");

function buscarEmpresasMenorEquipe(idGerente) {
    const id = Number(idGerente);

    const instrucao = `
        SELECT
            ec.nome_fantasia AS nome,
            COUNT(ue.usuario_id) AS funcionarios,
            'Ativa' AS status
        FROM empresa_cliente ec
        INNER JOIN usuario_empresa ger
            ON ger.empresa_id = ec.id_empresa
            AND ger.usuario_id = ${id}
        LEFT JOIN usuario_empresa ue ON ue.empresa_id = ec.id_empresa
        GROUP BY ec.id_empresa, ec.nome_fantasia
        ORDER BY funcionarios ASC, ec.nome_fantasia ASC
    `;
    return database.executar(instrucao);
}

function buscarResumoChamados() {
    const instrucao = `
        SELECT
            nivel_alerta,
            fim_indisp
        FROM Alerta a
        LEFT JOIN componente c ON c.id_componente = a.fkComponente
        LEFT JOIN indisponibilidade i ON i.fk_dispositivo = c.dispositivo_id
    `;
    return database.executar(instrucao);
}

function buscarResumoSlas() {
    const instrucao = `
        SELECT
            i.idindisponibilidade,
            i.inicio_indisp,
            i.fim_indisp,
            p.prazo_tac,
            p.prazo_rma,
            p.janela_onsite
        FROM indisponibilidade i
        LEFT JOIN dispositivo d ON d.id_dispositivo = i.fk_dispositivo
        LEFT JOIN Contrato_SLA cs ON cs.idContrato_SLA = d.fk_contrato_sla
        LEFT JOIN plano_sla p ON p.id_plano = cs.fkPlano
    `;
    return database.executar(instrucao);
}

module.exports = {
    buscarEmpresasMenorEquipe,
    buscarResumoChamados,
    buscarResumoSlas
};