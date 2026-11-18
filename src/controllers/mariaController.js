let mariaModel = require("../models/mariaModel");

let SEMANAS_DO_MODELO = 8;     
let SEMANAS_DO_GRAFICO = 4;  
let SEMANAS_PREVISTAS = 3;     



function somarDias(data, dias) {
    let nova = new Date(data);
    nova.setDate(nova.getDate() + dias);
    return nova;
}

function inicioDaSemana(data) {
    let diaDaSemana = data.getDay();
    let diferenca = diaDaSemana - 1;
    if (diaDaSemana == 0) {
        diferenca = 6;
    }

    let segunda = somarDias(data, -diferenca);
    segunda.setHours(0, 0, 0, 0);
    return segunda;
}

function formatarData(data) {
    let ano = data.getFullYear();
    let mes = String(data.getMonth() + 1).padStart(2, "0");
    let dia = String(data.getDate()).padStart(2, "0");
    return ano + "-" + mes + "-" + dia;
}

function calcularPeriodo() {
    let agora = new Date();
    let semanaAtual = inicioDaSemana(agora);

    let periodo = {
        semanaAtual: semanaAtual,
        inicioHistorico: somarDias(semanaAtual, -7 * SEMANAS_DO_MODELO),
        proximaSemana: somarDias(semanaAtual, 7)
    };
    return periodo;
}



function media(lista) {
    if (lista.length == 0) {
        return 0;
    }

    let soma = 0;
    for (let i = 0; i < lista.length; i++) {
        soma += lista[i];
    }
    return soma / lista.length;
}

function regressaoLinear(valores) {
    let n = valores.length;
    if (n < 3) {
        return { a: 0, b: media(valores) };
    }

    let mediaX = (n - 1) / 2;
    let mediaY = media(valores);
    let somaXY = 0;
    let somaXX = 0;

    for (let i = 0; i < n; i++) {
        somaXY += (i - mediaX) * (valores[i] - mediaY);
        somaXX += (i - mediaX) * (i - mediaX);
    }

    let a = 0;
    if (somaXX != 0) {
        a = somaXY / somaXX;
    }
    return { a: a, b: mediaY - a * mediaX };
}
function erroDaReta(valores, reta) {
    if (valores.length < 3) {
        return 0;
    }

    let somaQuadrados = 0;
    for (let i = 0; i < valores.length; i++) {
        let diferenca = valores[i] - (reta.a * i + reta.b);
        somaQuadrados += diferenca * diferenca;
    }
    return Math.sqrt(somaQuadrados / (valores.length - 2));
}

function preverSemanas(historico, quantidade) {
    let reta = regressaoLinear(historico);
    let erro = erroDaReta(historico, reta);
    let margem = 2 * erro;
    let previsoes = [];

    for (let i = 0; i < quantidade; i++) {
        let valor = reta.a * (historico.length + i) + reta.b;
        if (valor < 0) {
            valor = 0;
        }

        let minimo = Math.floor(valor - margem);
        if (minimo < 0) {
            minimo = 0;
        }

        previsoes.push({
            valor: Math.round(valor),
            minimo: minimo,
            maximo: Math.ceil(valor + margem)
        });
    }
    return previsoes;
}

function contarSemanas(linhas, quantidade, id_empresa) {
    let semanas = [];
    for (let i = 0; i < quantidade; i++) {
        semanas.push(0);
    }

    for (let i = 0; i < linhas.length; i++) {
        if (id_empresa != null && linhas[i].id_empresa != id_empresa) {
            continue;
        }

        let semana = Number(linhas[i].semana);
        if (semana >= 0 && semana < quantidade) {
            semanas[semana] = Number(linhas[i].total);
        }
    }
    return semanas;
}

async function calcularPrevisaoTotal(id_usuario, periodo) {
    let inicio = formatarData(periodo.inicioHistorico);
    let fim = formatarData(periodo.semanaAtual);

    let linhas = await mariaModel.contarAlertasPorSemana(id_usuario, inicio, fim);
    let historico = contarSemanas(linhas, SEMANAS_DO_MODELO, null);

    let todas = preverSemanas(historico, SEMANAS_PREVISTAS + 1);
    let previsoes = [];
    for (let i = 1; i < todas.length; i++) {
        previsoes.push(todas[i]);
    }

    return { historico: historico, previsoes: previsoes };
}

function converterLimiteParaHoras(texto) {
    if (!texto) {
        return null;
    }

    let minusculo = String(texto).toLowerCase().replace(",", ".");
    let achado = minusculo.match(/[0-9]+(\.[0-9]+)?/); 
    if (!achado) {
        return null;
    }

    let valor = Number(achado[0]);
    if (minusculo.includes("min")) {
        valor = valor / 60;
    } else if (minusculo.includes("dia")) {
        valor = valor * 24;
    }
    return valor;
}

async function previsaoSemanas(req, res) {
    let infoUsuario = req.user;

    if (infoUsuario.role != "gerente") {
        res.status(403).json({
            "res": "Não permitido"
        });
        return false;
    }

    try {
        let periodo = calcularPeriodo();
        let previsao = await calcularPrevisaoTotal(infoUsuario.id, periodo);
        let historico = previsao.historico;
        let previsoes = previsao.previsoes;

        let semanasReais = [];
        for (let i = SEMANAS_DO_MODELO - SEMANAS_DO_GRAFICO; i < SEMANAS_DO_MODELO; i++) {
            semanasReais.push({
                inicio: formatarData(somarDias(periodo.inicioHistorico, 7 * i)),
                valor: historico[i]
            });
        }

        let semanasPrevistas = [];
        for (let i = 0; i < previsoes.length; i++) {
            semanasPrevistas.push({
                inicio: formatarData(somarDias(periodo.proximaSemana, 7 * i)),
                valor: previsoes[i].valor,
                minimo: previsoes[i].minimo,
                maximo: previsoes[i].maximo
            });
        }

        let semanaAnterior = historico[historico.length - 1];
        let variacao = null;
        if (semanaAnterior > 0) {
            variacao = Math.round(((previsoes[0].valor - semanaAnterior) / semanaAnterior) * 100);
        }

        let respostaAnalistas = await mariaModel.contarAnalistas(infoUsuario.id);
        let quantidadeAnalistas = Number(respostaAnalistas[0].total);
        let alertasPorAnalista = 0;
        if (quantidadeAnalistas > 0) {
            alertasPorAnalista = Math.round((previsoes[0].valor / quantidadeAnalistas) * 10) / 10;
        }

        res.status(200).json({
            semanaAtual: formatarData(periodo.semanaAtual),
            proximaSemana: formatarData(periodo.proximaSemana),
            historico: semanasReais,
            previsoes: semanasPrevistas,
            semanaAnterior: semanaAnterior,
            variacao: variacao,
            quantidadeAnalistas: quantidadeAnalistas,
            alertasPorAnalista: alertasPorAnalista
        });
        return true;
    } catch (erro) {
        console.error(erro);
        res.status(500).json({
            "res": "Deu erro"
        });
        return false;
    }
}


async function previsaoMapaCalor(req, res) {
    let infoUsuario = req.user;

    if (infoUsuario.role != "gerente") {
        res.status(403).json({
            "res": "Não permitido"
        });
        return false;
    }

    try {
        let periodo = calcularPeriodo();
        let previsao = await calcularPrevisaoTotal(infoUsuario.id, periodo);
        let totalPrevisto = previsao.previsoes[0].valor;

        let inicio = formatarData(periodo.inicioHistorico);
        let fim = formatarData(periodo.semanaAtual);
        let linhas = await mariaModel.contarAlertasPorDiaEHorario(infoUsuario.id, inicio, fim);

        for (let dia = 0; dia < 7; dia++) {
            historicoPorHorario.push([0, 0, 0, 0, 0, 0]);
        }

        let totalHistorico = 0;
        for (let i = 0; i < linhas.length; i++) {
            let dia = Number(linhas[i].dia);
            let faixa = Number(linhas[i].faixa);
            let total = Number(linhas[i].total);

            historicoPorHorario[dia][faixa] = total;
            totalHistorico += total;
        }

        let pesoTotal = totalHistorico;
        if (totalHistorico == 0) {
            pesoTotal = 42;
        }

        let celulas = [];
        let somaArredondada = 0;
        for (let dia = 0; dia < 7; dia++) {
            for (let faixa = 0; faixa < 6; faixa++) {
                let peso = 1;
                if (totalHistorico > 0) {
                    peso = historicoPorHorario[dia][faixa];
                }

                let exato = (totalPrevisto * peso) / pesoTotal;
                let base = Math.floor(exato);
                celulas.push({ dia: dia, faixa: faixa, valor: base, resto: exato - base });
                somaArredondada += base;
            }
        }

        celulas.sort(function (a, b) {
            return b.resto - a.resto;
        });
        let sobraram = totalPrevisto - somaArredondada;
        for (let i = 0; i < sobraram; i++) {
            celulas[i].valor++;
        }

        let tabela = [];
        for (let dia = 0; dia < 7; dia++) {
            tabela.push([0, 0, 0, 0, 0, 0]);
        }
        for (let i = 0; i < celulas.length; i++) {
            tabela[celulas[i].dia][celulas[i].faixa] = celulas[i].valor;
        }
        let maior = 0;
        let diaMaior = 0;
        let faixaMaior = 0;
        for (let dia = 0; dia < 7; dia++) {
            for (let faixa = 0; faixa < 6; faixa++) {
                if (tabela[dia][faixa] > maior) {
                    maior = tabela[dia][faixa];
                    diaMaior = dia;
                    faixaMaior = faixa;
                }
            }
        }

        res.status(200).json({
            total: totalPrevisto,
            tabela: tabela,
            maior: maior,
            diaMaior: diaMaior,
            faixaMaior: faixaMaior,
            totalHistorico: totalHistorico
        });
        return true;
    } catch (erro) {
        console.error(erro);
        res.status(500).json({
            "res": "Deu erro"
        });
        return false;
    }
}


async function previsaoEmpresas(req, res) {
    let infoUsuario = req.user;

    if (infoUsuario.role != "gerente") {
        res.status(403).json({
            "res": "Não permitido"
        });
        return false;
    }

    try {
        let periodo = calcularPeriodo();
        let inicio = formatarData(periodo.inicioHistorico);
        let fim = formatarData(periodo.semanaAtual);

        let listaEmpresas = await mariaModel.listarEmpresasComSla(infoUsuario.id);
        let linhas = await mariaModel.contarAlertasPorSemanaEEmpresa(infoUsuario.id, inicio, fim);

        let empresas = [];
        let empresasJaVistas = [];

        for (let i = 0; i < listaEmpresas.length; i++) {
            let item = listaEmpresas[i];

            if (empresasJaVistas.includes(item.id_empresa)) {
                continue;
            }
            empresasJaVistas.push(item.id_empresa);

            let historicoEmpresa = contarSemanas(linhas, SEMANAS_DO_MODELO, item.id_empresa);
            let estimativa = preverSemanas(historicoEmpresa, 2)[1]; 

            empresas.push({
                idEmpresa: item.id_empresa,
                empresa: item.nome_empresa,
                alertasPrevistos: estimativa.valor,
                minimo: estimativa.minimo,
                maximo: estimativa.maximo,
                nivelSla: item.nivel_sla,
                limiteResposta: item.limite_resposta,
                prazoHoras: converterLimiteParaHoras(item.limite_resposta)
            });
        }
        empresas.sort(function (a, b) {
            return b.alertasPrevistos - a.alertasPrevistos;
        });

        res.status(200).json({
            proximaSemana: formatarData(periodo.proximaSemana),
            empresas: empresas
        });
        return true;
    } catch (erro) {
        console.error(erro);
        res.status(500).json({
            "res": "Deu erro"
        });
        return false;
    }
}


async function chamadosPrevisoes(req, res) {
    let infoUsuario = req.user;

    if (infoUsuario.role != "gerente") {
        res.status(403).json({
            "res": "Não permitido"
        });
        return false;
    }

    try {
        let periodo = calcularPeriodo();
        let inicio = formatarData(somarDias(periodo.inicioHistorico, -7));
        let fim = formatarData(somarDias(new Date(), 1));

        let listaEmpresas = await mariaModel.listarEmpresasComSla(infoUsuario.id);
        let contratos = [];
        let empresasJaVistas = [];

        for (let i = 0; i < listaEmpresas.length; i++) {
            let item = listaEmpresas[i];

            if (empresasJaVistas.includes(item.id_empresa)) {
                continue;
            }
            empresasJaVistas.push(item.id_empresa);

            let prazoHoras = converterLimiteParaHoras(item.limite_resposta);
            if (prazoHoras == null) {
                continue;
            }

            contratos.push({
                empresa: item.nome_empresa,
                prazoResolucaoHoras: prazoHoras
            });
        }

        let linhas = await mariaModel.listarChamados(infoUsuario.id, inicio, fim);
        let chamados = [];
        for (let i = 0; i < linhas.length; i++) {
            chamados.push({
                id: linhas[i].id,
                empresa: linhas[i].empresa,
                equipamento: linhas[i].equipamento,
                aberto_em: linhas[i].aberto_em,
                concluido_em: linhas[i].concluido_em
            });
        }

        let respostaAnalistas = await mariaModel.contarAnalistas(infoUsuario.id);

        res.status(200).json({
            contratos: contratos,
            chamados: chamados,
            equipe: {
                quantidadeAnalistas: Number(respostaAnalistas[0].total)
            }
        });
        return true;
    } catch (erro) {
        console.error(erro);
        res.status(500).json({
            "res": "Deu erro"
        });
        return false;
    }
}

module.exports = {
    previsaoSemanas,
    previsaoMapaCalor,
    previsaoEmpresas,
    chamadosPrevisoes
};