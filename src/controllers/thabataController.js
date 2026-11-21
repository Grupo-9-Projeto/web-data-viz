const thabataModel = require("../models/thabataModel");

async function obterDadosHome(req, res) {
    try {
        const empresasRows = await thabataModel.buscarEmpresasMenorEquipe();
        const chamadosRows = await thabataModel.buscarResumoChamados();
        const slasRows = await thabataModel.buscarResumoSlas();

        let emAberto = 0;
        let emAtendimento = 0;
        let resolvidos = 0;
        let criticosEmAberto = 0;

        for (const item of chamadosRows) {
            const nivel = String(item.nivel_alerta || "").toLowerCase();
            const emAbertoFlag = item.fim_indisp === null || item.fim_indisp === undefined;

            if (nivel === "critico") {
                if (emAbertoFlag) {
                    emAberto++;
                    criticosEmAberto++;
                } else {
                    resolvidos++;
                }
            } else if (nivel === "atencao" || nivel === "alto") {
                if (emAbertoFlag) {
                    emAtendimento++;
                } else {
                    resolvidos++;
                }
            } else {
                resolvidos++;
            }
        }

        let disponibilidade = 0;
        let resolucao = 0;
        let tempoResposta = 0;

        for (const sla of slasRows) {
            if (sla.fim_indisp === null || sla.fim_indisp === undefined) {
                disponibilidade++;
            } else if (sla.prazo_rma && !String(sla.prazo_rma).toLowerCase().includes("não")) {
                resolucao++;
            } else {
                tempoResposta++;
            }
        }

        return res.status(200).json({
            ok: true,
            dados: {
                empresasPoucosFuncionarios: empresasRows.map(emp => ({
                    nome: emp.nome,
                    funcionarios: Number(emp.funcionarios),
                    status: emp.status
                })),
                chamados: {
                    emAberto,
                    emAtendimento,
                    resolvidos,
                    criticosEmAberto
                },
                slas: {
                    disponibilidade,
                    resolucao,
                    tempoResposta
                }
            }
        });
    } catch (erro) {
        console.error("Erro ao obter dados da home:", erro);
        return res.status(500).json({
            ok: false,
            mensagem: "Erro ao carregar os indicadores da home."
        });
    }
}

module.exports = {
    obterDadosHome
};