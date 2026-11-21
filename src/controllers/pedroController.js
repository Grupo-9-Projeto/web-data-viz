var pedroModel = require("../models/pedroModel");

const PRIORIDADES = { critico: "Crítico", alto: "Alto", medio: "Médio" };
const STATUS = { aberto: "Em Aberto", em_atendimento: "Em atendimento", resolvido: "Resolvido" };
const TIPOS_SLA = { disponibilidade: "Disponibilidade", resolucao: "Resolução", tempo_resposta: "Tempo de Resposta" };

const STATUS_ACEITOS = {
    "todos": "todos",
    "aberto": "aberto",
    "em aberto": "aberto",
    "em_atendimento": "em_atendimento",
    "em atendimento": "em_atendimento",
    "resolvido": "resolvido"
};

function percentual(parte, total) {
    return total === 0 ? 0 : Math.round((parte / total) * 100);
}

function dataValida(texto) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(texto)) return false;
    const d = new Date(texto + "T00:00:00Z");
    return !isNaN(d.getTime()) && d.toISOString().slice(0, 10) === texto;
}

function formatarChamado(linha) {
    return {
        id: linha.id,
        id_violacao: linha.id_violacao,
        data: linha.data,
        empresa: linha.empresa,
        equipamento: linha.equipamento,
        tipo_sla: TIPOS_SLA[linha.tipo_sla] || linha.tipo_sla,
        prioridade: PRIORIDADES[linha.prioridade] || linha.prioridade,
        status: STATUS[linha.status] || linha.status,
        chamado_vinculado: linha.chamado_vinculado || "—",
        responsavel: linha.responsavel || "Não atribuído",
        descricao: linha.descricao || ""
    };
}

// KPIs 
function calcularResumo(linhas) {
    const total = linhas.length;
    const contar = (campo, valor) => linhas.filter(l => l[campo] === valor).length;

    const aberto = contar("status", "aberto");
    const emAtendimento = contar("status", "em_atendimento");
    const resolvido = contar("status", "resolvido");

    const prioridades = Object.keys(PRIORIDADES).map(codigo => {
        const quantidade = contar("prioridade", codigo);
        return { nome: PRIORIDADES[codigo], quantidade: quantidade, percentual: percentual(quantidade, total) };
    });

    const criticosPendentes = linhas.filter(l => l.prioridade === "critico" && l.status !== "resolvido").length;

    // fica o chamad mais antigo
    const porEquipamento = {};
    [...linhas].sort((a, b) => a.id_violacao - b.id_violacao).forEach(l => {
        porEquipamento[l.equipamento] = (porEquipamento[l.equipamento] || 0) + 1;
    });
    const maisAfetado = Object.entries(porEquipamento).sort((a, b) => b[1] - a[1])[0];

    return {
        total: total,
        aberto: aberto,
        em_atendimento: emAtendimento,
        resolvido: resolvido,
        percentual_aberto: percentual(aberto, total),
        percentual_em_atendimento: percentual(emAtendimento, total),
        percentual_resolvido: percentual(resolvido, total),
        prioridades: prioridades,
        criticos_pendentes: criticosPendentes,
        taxa_resolucao: percentual(resolvido, total),
        equipamento_mais_afetado: maisAfetado ? { nome: maisAfetado[0], quantidade: maisAfetado[1] } : null
    };
}

async function listarChamados(req, res) {
    let infoUser = req.user;

    if (infoUser.role != "gerente") {
        res.status(403).json({ "res": "Não permitido" });
        return false;
    }

    let dataInicio = req.query.data_inicio || "";
    let dataFim = req.query.data_fim || "";
    let equipamento = req.query.equipamento || "";
    let statusPedido = String(req.query.status || "todos").trim().toLowerCase();

    if ((dataInicio && !dataValida(dataInicio)) || (dataFim && !dataValida(dataFim))) {
        res.status(400).json({ "res": "Data inválida, use o formato AAAA-MM-DD" });
        return false;
    }

    let status = STATUS_ACEITOS[statusPedido];
    if (!status) {
        res.status(400).json({ "res": "Status inválido" });
        return false;
    }

    try {
        const [base, total, equipamentos] = await Promise.all([
            pedroModel.listarChamados(infoUser.id, { dataInicio: dataInicio, dataFim: dataFim, equipamento: equipamento }),
            pedroModel.contarChamados(infoUser.id),
            pedroModel.listarEquipamentos(infoUser.id)
        ]);

        // kpi sem considerar os flitros 
        const lista = status === "todos" ? base : base.filter(l => l.status === status);

        res.status(200).json({
            chamados: lista.map(formatarChamado),
            resumo: calcularResumo(base),
            total_geral: total[0].total,
            equipamentos: equipamentos.map(e => e.equipamento)
        });
        return true;
    } catch (erro) {
        console.log(erro);
        res.status(500).json({ "res": "Deu erro" });
        return false;
    }
}

async function buscarChamado(req, res) {
    let infoUser = req.user;

    if (infoUser.role != "gerente") {
        res.status(403).json({ "res": "Não permitido" });
        return false;
    }

    // aceita "SLA-031" ou só "31"
    const encontrado = /^(?:SLA-)?(\d+)$/i.exec(String(req.params.id).trim());
    if (!encontrado) {
        res.status(400).json({ "res": "Id de chamado inválido" });
        return false;
    }

    try {
        const resposta = await pedroModel.buscarChamado(infoUser.id, Number(encontrado[1]));

        if (resposta.length == 0) {
            res.status(404).json({ "res": "Chamado não encontrado" });
            return false;
        }

        res.status(200).json(formatarChamado(resposta[0]));
        return true;
    } catch (erro) {
        console.log(erro);
        res.status(500).json({ "res": "Deu erro" });
        return false;
    }
}

module.exports = {
    listarChamados,
    buscarChamado
};