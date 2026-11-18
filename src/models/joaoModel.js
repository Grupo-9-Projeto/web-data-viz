var database = require("../database/config");

function selectDispositivosMonitorados(id_usuario){
    let consulta = `SELECT  ec.id_empresa ,us.id_usuario ,ec.nome_fantasia AS nome_empresa, COUNT(di.id_dispositivo) AS dispositivos_monitorados FROM usuario AS us 
INNER JOIN usuario_empresa AS ue ON us.id_usuario = ue.usuario_id
INNER JOIN empresa_cliente AS ec ON ue.empresa_id = ec.id_empresa
INNER JOIN dispositivo AS di ON ec.id_empresa = di.empresa_id
WHERE us.id_usuario = ?
GROUP BY us.id_usuario,ec.nome_fantasia, ec.id_empresa
ORDER BY us.id_usuario`;

    return database.executar(consulta, id_usuario)
}

function selectAlertasEmpresa(id_empresa, id_usuario){
    let consulta = `SELECT
    COUNT(DISTINCT CASE
        WHEN al.nivel_alerta = 'critico'
        THEN al.idAlerta
    END) AS alerta_critico,

    COUNT(DISTINCT CASE
        WHEN al.nivel_alerta = 'atencao'
        THEN al.idAlerta
    END) AS alerta_atencao,

    COUNT(DISTINCT CASE
        WHEN al.nivel_alerta = 'saudavel'
        THEN al.idAlerta
    END) AS alerta_saudavel

FROM usuario AS us
INNER JOIN usuario_empresa AS ue
    ON us.id_usuario = ue.usuario_id
INNER JOIN empresa_cliente AS ec
    ON ue.empresa_id = ec.id_empresa
LEFT JOIN dispositivo AS di
    ON ec.id_empresa = di.empresa_id
LEFT JOIN componente AS co
    ON di.id_dispositivo = co.dispositivo_id
LEFT JOIN alerta AS al
    ON co.id_componente = al.fkComponente

WHERE us.id_usuario = ?
  AND ec.id_empresa = ?`;

  return database.executar(consulta, [id_usuario, id_empresa])
}


function porcentagemDisponibilidade(id_usuario, id_empresa){
    let consulta = `SELECT ec.nome_fantasia ,(SUM(CASE WHEN di.status_dispositivo = "ativo" THEN 1 ELSE 0 END) * 100) / COUNT(di.id_dispositivo)AS porcentagem FROM usuario AS us 
INNER JOIN usuario_empresa AS ue ON us.id_usuario = ue.usuario_id
INNER JOIN empresa_cliente AS ec ON ue.empresa_id = ec.id_empresa
INNER JOIN dispositivo AS di ON ec.id_empresa = di.empresa_id
WHERE us.id_usuario = ? AND ec.id_empresa = ?
GROUP BY ec.nome_fantasia`;

    return database.executar(consulta, [id_usuario, id_empresa])
}

function rankEquipamentos(id_usuario){
    let consulta = `SELECT di.endereco_mac AS endereco_mac, ca.nome AS categoria, di.status_dispositivo AS status, COUNT(
																														CASE WHEN al.nivel_alerta = 'critico' THEN al.idAlerta END
) AS alertas_criticos FROM usuario AS us 
INNER JOIN usuario_empresa AS ue ON us.id_usuario = ue.usuario_id
INNER JOIN empresa_cliente AS ec ON ue.empresa_id = ec.id_empresa
INNER JOIN dispositivo AS di ON ec.id_empresa = di.empresa_id
INNER JOIN componente AS co ON di.id_dispositivo = co.dispositivo_id
INNER JOIN alerta AS al ON co.id_componente = al.fkComponente
INNER JOIN modelo AS mo ON di.modelo_id = mo.id_modelo
INNER JOIN categoria AS ca ON mo.categoria_id = ca.id_categoria
WHERE us.id_usuario = ?
GROUP BY di.endereco_mac
ORDER BY alertas_criticos DESC`;

    return database.executar(consulta,id_usuario )
}

function equipamentosEmpresa(id_usuario, id_empresa){
    let consulta = `SELECT ec.nome_fantasia ,di.endereco_mac AS endereco_mac, ca.nome AS categoria, di.status_dispositivo AS status, 
(
        SELECT nivel_alerta FROM alerta AS al2
        INNER JOIN componente AS co2 ON al2.fkComponente = co2.id_componente 
        WHERE co2.dispositivo_id = di.id_dispositivo
        ORDER BY al2.registrado_em DESC, al2.idAlerta
        LIMIT 1
    ) AS ultimo_alerta
FROM usuario AS us 
INNER JOIN usuario_empresa AS ue ON us.id_usuario = ue.usuario_id
INNER JOIN empresa_cliente AS ec ON ue.empresa_id = ec.id_empresa
INNER JOIN dispositivo AS di ON ec.id_empresa = di.empresa_id
INNER JOIN modelo AS mo ON di.modelo_id = mo.id_modelo
INNER JOIN categoria AS ca ON mo.categoria_id = ca.id_categoria
WHERE us.id_usuario = ? AND ec.id_empresa = ?`

    return database.executar(consulta, [id_usuario, id_empresa])
}

module.exports = {
   selectDispositivosMonitorados,
   selectAlertasEmpresa,
   porcentagemDisponibilidade,
   rankEquipamentos,
   equipamentosEmpresa
};