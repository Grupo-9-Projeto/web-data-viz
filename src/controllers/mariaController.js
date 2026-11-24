let mariaModel = require("../models/mariaModel");
let { S3Client, ListObjectsV2Command, GetObjectCommand } = require("@aws-sdk/client-s3");

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


let DIAS_HISTORICO_ANOMALIAS = Number(process.env.ANOMALIAS_DIAS) || 7;
let INTERVALO_OCORRENCIA_MINUTOS = 15;
let VALIDADE_CACHE_ANOMALIAS = 10 * 60 * 1000;
let COMPONENTES_MONITORADOS = ["cpu", "ram", "disco", "rede"];
let PREFIXO_CLIENT_CAPTURAS = "client/dispositivos/capturas/";

let s3 = new S3Client({
    region: process.env.AWS_REGION || "us-east-1"
});
let cacheAnomalias = {};

function converterDataLeitura(texto) {
    if (!texto) {
        return null;
    }

    let data = new Date(String(texto).trim().replace(" ", "T"));
    if (isNaN(data.getTime())) {
        return null;
    }
    return data.getTime();
}

async function listarChavesDoDia(mac, dia) {
    let prefixo = PREFIXO_CLIENT_CAPTURAS + mac + "/" + dia.replace(/-/g, "/") + "/";
    let chaves = [];
    let token = undefined;

    do {
        let resposta = await s3.send(new ListObjectsV2Command({
            Bucket: process.env.S3_BUCKET,
            Prefix: prefixo,
            ContinuationToken: token
        }));
        let itens = resposta.Contents || [];
        for (let i = 0; i < itens.length; i++) {
            if (itens[i].Key && itens[i].Key.endsWith(".json")) {
                chaves.push(itens[i].Key);
            }
        }
        token = resposta.IsTruncated ? resposta.NextContinuationToken : undefined;
    } while (token);

    return chaves;
}

async function listarChavesDoMac(mac, dias) {
    let chaves = [];
    for (let i = 0; i < dias.length; i++) {
        let doDia = await listarChavesDoDia(mac, dias[i]);
        for (let j = 0; j < doDia.length; j++) {
            chaves.push(doDia[j]);
        }
    }
    return chaves;
}

async function lerLeiturasDoMac(mac, dias) {
    let chaves = await listarChavesDoMac(mac, dias);

    if (chaves.length == 0 && mac.toLowerCase() != mac) {
        chaves = await listarChavesDoMac(mac.toLowerCase(), dias);
    }

    let leituras = [];
    let tamanhoLote = 25;
    for (let i = 0; i < chaves.length; i += tamanhoLote) {
        let fatia = chaves.slice(i, i + tamanhoLote);
        let resultados = await Promise.all(fatia.map(async function (chave) {
            let resposta = await s3.send(new GetObjectCommand({
                Bucket: process.env.S3_BUCKET,
                Key: chave
            }));
            let texto = await resposta.Body.transformToString("utf-8");
            return JSON.parse(texto);
        }));

        for (let j = 0; j < resultados.length; j++) {
            if (Array.isArray(resultados[j])) {
                for (let k = 0; k < resultados[j].length; k++) {
                    leituras.push(resultados[j][k]);
                }
            }
        }
    }
    return leituras;
}

function resumirLeituras(leituras) {
    let resumo = {
        registros: 0,
        registrosSemFlag: 0,
        leiturasComponente: { cpu: 0, ram: 0, disco: 0, rede: 0 },
        ocorrencias: { cpu: 0, ram: 0, disco: 0, rede: 0 }
    };
    let linhas = [];
    for (let i = 0; i < leituras.length; i++) {
        let t = converterDataLeitura(leituras[i]["Quando foi Coletado"]);
        if (t === null) {
            continue;
        }
        linhas.push({ t: t, dados: leituras[i] });
    }
    linhas.sort(function (a, b) {
        return a.t - b.t;
    });

    let ultimaAnomalia = { cpu: null, ram: null, disco: null, rede: null };
    let intervalo = INTERVALO_OCORRENCIA_MINUTOS * 60 * 1000;

    for (let i = 0; i < linhas.length; i++) {
        resumo.registros++;
        let temFlag = false;

        for (let c = 0; c < COMPONENTES_MONITORADOS.length; c++) {
            let componente = COMPONENTES_MONITORADOS[c];
            let flag = linhas[i].dados["anomalia_" + componente];
            if (flag !== 0 && flag !== 1) {
                continue;
            }
            temFlag = true;
            resumo.leiturasComponente[componente]++;

            if (flag === 1) {
                let ultima = ultimaAnomalia[componente];
                if (ultima === null || linhas[i].t - ultima > intervalo) {
                    resumo.ocorrencias[componente]++;
                }
                ultimaAnomalia[componente] = linhas[i].t;
            }
        }
        if (!temFlag) {
            resumo.registrosSemFlag++;
        }
    }
    return resumo;
}

async function resumirMac(mac, dias) {
    let guardado = cacheAnomalias[mac];
    if (guardado && Date.now() - guardado.carregadoEm < VALIDADE_CACHE_ANOMALIAS) {
        return guardado.resumo;
    }

    let leituras = await lerLeiturasDoMac(mac, dias);
    let resumo = resumirLeituras(leituras);
    cacheAnomalias[mac] = { carregadoEm: Date.now(), resumo: resumo };
    return resumo;
}

function diasDaJanela(quantidade) {
    let dias = [];
    let hoje = new Date();
    for (let i = 0; i < quantidade; i++) {
        dias.push(formatarData(somarDias(hoje, -i)));
    }
    return dias;
}

async function modelosPrevisoes(req, res) {
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

        let linhasChamados = await mariaModel.listarChamadosPorModelo(infoUsuario.id, inicio, fim);
        let linhasDispositivos = await mariaModel.listarDispositivosPorModelo(infoUsuario.id);

        let modelos = {};
        for (let i = 0; i < linhasDispositivos.length; i++) {
            let nome = linhasDispositivos[i].modelo;
            if (!modelos[nome]) {
                modelos[nome] = { modelo: nome, chamados: 0, concluidos: 0, tempoMedioHoras: null, macs: [] };
            }
            modelos[nome].macs.push(linhasDispositivos[i].mac);
        }
        for (let i = 0; i < linhasChamados.length; i++) {
            let nome = linhasChamados[i].modelo;
            if (!modelos[nome]) {
                modelos[nome] = { modelo: nome, chamados: 0, concluidos: 0, tempoMedioHoras: null, macs: [] };
            }
            modelos[nome].chamados = Number(linhasChamados[i].chamados);
            modelos[nome].concluidos = Number(linhasChamados[i].concluidos);
            if (linhasChamados[i].tempo_medio_horas !== null) {
                modelos[nome].tempoMedioHoras = Math.round(Number(linhasChamados[i].tempo_medio_horas) * 100) / 100;
            }
        }

        let etl = { status: "ok", mensagem: null, equipamentosConsultados: 0, equipamentosComDados: 0 };
        let resumosPorMac = {};
        let todosMacs = [];
        let nomes = Object.keys(modelos);
        for (let i = 0; i < nomes.length; i++) {
            for (let j = 0; j < modelos[nomes[i]].macs.length; j++) {
                todosMacs.push(modelos[nomes[i]].macs[j]);
            }
        }
        etl.equipamentosConsultados = todosMacs.length;

        if (!process.env.S3_BUCKET) {
            etl.status = "nao_configurado";
            etl.mensagem = "Variável de ambiente S3_BUCKET não definida.";
        } else {
            try {
                let dias = diasDaJanela(DIAS_HISTORICO_ANOMALIAS);
                let resumos = await Promise.all(todosMacs.map(function (mac) {
                    return resumirMac(mac, dias);
                }));
                for (let i = 0; i < todosMacs.length; i++) {
                    resumosPorMac[todosMacs[i]] = resumos[i];
                    if (resumos[i].registros > 0) {
                        etl.equipamentosComDados++;
                    }
                }
                if (etl.equipamentosComDados == 0) {
                    etl.status = "sem_dados";
                }
            } catch (erroS3) {
                console.error(erroS3);
                etl.status = "indisponivel";
                etl.mensagem = "Não foi possível ler os indicadores da ETL no S3.";
            }
        }

        let resposta = [];
        for (let i = 0; i < nomes.length; i++) {
            let modelo = modelos[nomes[i]];
            let item = {
                modelo: modelo.modelo,
                chamados: modelo.chamados,
                concluidos: modelo.concluidos,
                tempoMedioHoras: modelo.tempoMedioHoras,
                equipamentos: modelo.macs.length,
                equipamentosComDados: 0,
                registrosMonitorados: null,
                leiturasComponentes: null,
                anomalias: null,
                anomaliasTotal: null,
                taxaPorMil: null,
                componentePredominante: null
            };

            if (etl.status == "ok" || etl.status == "sem_dados") {
                let registros = 0;
                let leituras = 0;
                let ocorrencias = { cpu: 0, ram: 0, disco: 0, rede: 0 };

                for (let j = 0; j < modelo.macs.length; j++) {
                    let resumo = resumosPorMac[modelo.macs[j]];
                    if (resumo.registros > 0) {
                        item.equipamentosComDados++;
                    }
                    registros += resumo.registros;
                    for (let c = 0; c < COMPONENTES_MONITORADOS.length; c++) {
                        let componente = COMPONENTES_MONITORADOS[c];
                        leituras += resumo.leiturasComponente[componente];
                        ocorrencias[componente] += resumo.ocorrencias[componente];
                    }
                }

                let total = 0;
                let maior = 0;
                let predominante = null;
                for (let c = 0; c < COMPONENTES_MONITORADOS.length; c++) {
                    let componente = COMPONENTES_MONITORADOS[c];
                    total += ocorrencias[componente];
                    if (ocorrencias[componente] > maior) {
                        maior = ocorrencias[componente];
                        predominante = componente;
                    }
                }

                item.registrosMonitorados = registros;
                item.leiturasComponentes = leituras;
                item.anomalias = ocorrencias;
                item.anomaliasTotal = total;
                item.componentePredominante = predominante;
                if (leituras > 0) {
                    item.taxaPorMil = Math.round((total / leituras) * 10000) / 10;
                }
            }
            resposta.push(item);
        }

        resposta.sort(function (a, b) {
            if (b.chamados != a.chamados) {
                return b.chamados - a.chamados;
            }
            return (b.anomaliasTotal || 0) - (a.anomaliasTotal || 0);
        });

        res.status(200).json({
            periodoChamados: { inicio: inicio, fim: fim },
            janelaAnomaliasDias: DIAS_HISTORICO_ANOMALIAS,
            intervaloOcorrenciaMinutos: INTERVALO_OCORRENCIA_MINUTOS,
            etl: etl,
            modelos: resposta
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
    chamadosPrevisoes,
    modelosPrevisoes
};