var { S3Client, ListObjectsV2Command, GetObjectCommand } = require("@aws-sdk/client-s3");
var lucasModel = require("../models/lucasModel");

var BUCKET = process.env.S3_BUCKET;
var s3 = new S3Client({
    region: process.env.AWS_REGION || "us-east-1"
});

function mapearTipoMetrica(tipoNome) {
    var tipo = String(tipoNome || "").toLowerCase();
    if (tipo.includes("cpu")) return "cpu";
    if (tipo.includes("ram")) return "ram";
    if (tipo.includes("disco")) return "disco";
    if (tipo.includes("rede") || tipo.includes("pacote")) return "pacotes";
    return "";
}

function arredondar(valor, casas) {
    if (valor === null || valor === undefined || valor === "" || !Number.isFinite(Number(valor))) {
        return null;
    }
    var fator = Math.pow(10, casas);
    return Math.round(Number(valor) * fator) / fator;
}

function extrairDataHora(coletado) {
    if (!coletado) return null;
    var texto = String(coletado).trim();

    if (texto.includes("T")) {
        var partesIso = texto.split("T");
        return {
            dia: partesIso[0],
            hora: partesIso[1].slice(0, 8),
            timestamp: new Date(texto).getTime()
        };
    }

    if (texto.includes(" ")) {
        var partesEspaco = texto.split(" ");
        return {
            dia: partesEspaco[0],
            hora: partesEspaco[1].slice(0, 8),
            timestamp: new Date(partesEspaco[0] + "T" + partesEspaco[1]).getTime()
        };
    }

    var dt = new Date(texto);
    if (isNaN(dt.getTime())) return null;
    var iso = dt.toISOString();
    return {
        dia: iso.slice(0, 10),
        hora: iso.slice(11, 19),
        timestamp: dt.getTime()
    };
}

function formatarDataLocal(dataObj) {
    var ano = dataObj.getFullYear();
    var mes = String(dataObj.getMonth() + 1).padStart(2, "0");
    var dia = String(dataObj.getDate()).padStart(2, "0");
    var hora = String(dataObj.getHours()).padStart(2, "0");
    var min = String(dataObj.getMinutes()).padStart(2, "0");
    var seg = String(dataObj.getSeconds()).padStart(2, "0");
    return {
        dia: ano + "-" + mes + "-" + dia,
        hora: hora + ":" + min + ":" + seg
    };
}

async function listarChavesClientS3(mac) {
    if (!BUCKET) {
            throw new Error("Variável de ambiente S3_BUCKET não definida.");
        }
    
    var prefixo = "client/dispositivos/capturas/" + mac + "/";
    var chaves = [];
    var tokenContinuacao = undefined;

    do {
        var comando = new ListObjectsV2Command({
            Bucket: BUCKET,
            Prefix: prefixo,
            ContinuationToken: tokenContinuacao
        });
        var resposta = await s3.send(comando);
        var itens = resposta.Contents || [];

        for (var i = 0; i < itens.length; i++) {
            if (itens[i].Key && itens[i].Key.endsWith(".json")) {
                chaves.push(itens[i].Key);
            }
        }

        tokenContinuacao = resposta.IsTruncated ? resposta.NextContinuationToken : undefined;
    } while (tokenContinuacao);

    chaves.sort();
    return chaves;
}

async function lerLeiturasS3(mac) {
    var chaves = await listarChavesClientS3(mac);
    if (chaves.length === 0) return [];

    var leituras = [];
    var tamanhoLote = 25;

    for (var i = 0; i < chaves.length; i += tamanhoLote) {
        var fatia = chaves.slice(i, i + tamanhoLote);
        var resultados = await Promise.all(
            fatia.map(async function (chave) {
                var comando = new GetObjectCommand({
                    Bucket: BUCKET,
                    Key: chave
                });
                var resp = await s3.send(comando);
                var texto = await resp.Body.transformToString("utf-8");
                return JSON.parse(texto);
            })
        );

        for (var j = 0; j < resultados.length; j++) {
            if (Array.isArray(resultados[j])) {
                for (var k = 0; k < resultados[j].length; k++) {
                    leituras.push(resultados[j][k]);
                }
            }
        }
    }

    return leituras;
}

async function obterDadosEquipamento(req, res) {
    var infoUser = req.user;
    var idDispositivo = Number(req.params.idDispositivo);

    if (!idDispositivo) {
        res.status(400).json({ res: "ID do dispositivo inválido" });
        return false;
    }

    try {
        var acesso = await lucasModel.verificarAcessoDispositivo(infoUser.id, idDispositivo);
        if (acesso.length === 0) {
            res.status(403).json({ res: "Sem permissão para acessar este dispositivo" });
            return false;
        }

        var dispositivos = await lucasModel.buscarDispositivoPorId(idDispositivo);
        if (dispositivos.length === 0) {
            res.status(404).json({ res: "Dispositivo não encontrado" });
            return false;
        }

        var disp = dispositivos[0];
        var componentes = await lucasModel.listarComponentesDispositivo(idDispositivo);
        var alertasDb = await lucasModel.listarAlertasDispositivo(idDispositivo);

        var limites = { cpu: 85, ram: 85, disco: 80, pacotes: 30 };
        var limitesAtencao = { cpu: 75, ram: 75, disco: 70, pacotes: 15 };
        var capacidades = { ram: null, disco: null };

        for (var i = 0; i < componentes.length; i++) {
            var comp = componentes[i];
            var campo = mapearTipoMetrica(comp.tipo_nome);
            if (!campo) continue;

            if (comp.limiar_critico !== null && comp.limiar_critico !== undefined) {
                limites[campo] = Number(comp.limiar_critico);
            }
            if (comp.limiar_atencao !== null && comp.limiar_atencao !== undefined) {
                limitesAtencao[campo] = Number(comp.limiar_atencao);
            }
            if ((campo === "ram" || campo === "disco") && comp.capacidade !== null && comp.capacidade !== undefined) {
                capacidades[campo] = Number(comp.capacidade);
            }
        }

        var leiturasBrutas = await lerLeiturasS3(disp.endereco_mac);
        var leiturasNormalizadas = [];

        for (var i = 0; i < leiturasBrutas.length; i++) {
            var item = leiturasBrutas[i];
            var dh = extrairDataHora(item["Quando foi Coletado"]);
            if (!dh) continue;

            leiturasNormalizadas.push({
                dia: dh.dia,
                hora: dh.hora,
                timestamp: dh.timestamp,
                cpu: arredondar(item["cpu total(%)"], 2),
                ram: arredondar(item["ram(%)"], 2),
                disco: arredondar(item["disco(%)"], 2),
                pacotes: arredondar(item["perda pacotes"], 2),
                freqMhz: arredondar(item["Frequencia de uso da CPU(MHz)"], 2)
            });
        }

        leiturasNormalizadas.sort(function (a, b) {
            return a.timestamp - b.timestamp;
        });

        var agrupadoPorDia = {};
        for (var i = 0; i < leiturasNormalizadas.length; i++) {
            var l = leiturasNormalizadas[i];
            if (!agrupadoPorDia[l.dia]) {
                agrupadoPorDia[l.dia] = {
                    cpuSoma: 0, cpuQtd: 0,
                    ramSoma: 0, ramQtd: 0,
                    discoSoma: 0, discoQtd: 0,
                    pacotesSoma: 0, pacotesQtd: 0
                };
            }
            var g = agrupadoPorDia[l.dia];
            if (l.cpu !== null) { g.cpuSoma += l.cpu; g.cpuQtd++; }
            if (l.ram !== null) { g.ramSoma += l.ram; g.ramQtd++; }
            if (l.disco !== null) { g.discoSoma += l.disco; g.discoQtd++; }
            if (l.pacotes !== null) { g.pacotesSoma += l.pacotes; g.pacotesQtd++; }
        }

        var diasOrdenados = Object.keys(agrupadoPorDia).sort();
        var historico = [];
        for (var i = 0; i < diasOrdenados.length; i++) {
            var dia = diasOrdenados[i];
            var g = agrupadoPorDia[dia];
            historico.push({
                data: dia,
                cpu: g.cpuQtd > 0 ? arredondar(g.cpuSoma / g.cpuQtd, 1) : null,
                ram: g.ramQtd > 0 ? arredondar(g.ramSoma / g.ramQtd, 1) : null,
                disco: g.discoQtd > 0 ? arredondar(g.discoSoma / g.discoQtd, 1) : null,
                pacotes: g.pacotesQtd > 0 ? arredondar(g.pacotesSoma / g.pacotesQtd, 1) : null
            });
        }

        var ultima = leiturasNormalizadas.length > 0
            ? leiturasNormalizadas[leiturasNormalizadas.length - 1]
            : null;

        var atual = {
            hora: ultima ? ultima.hora : null,
            cpuGhz: (ultima && ultima.freqMhz !== null) ? arredondar(ultima.freqMhz / 1000, 1) : null,
            ramGb: (ultima && ultima.ram !== null && capacidades.ram)
                ? arredondar((ultima.ram / 100) * capacidades.ram, 1)
                : null,
            discoGb: (ultima && ultima.disco !== null && capacidades.disco)
                ? arredondar((ultima.disco / 100) * capacidades.disco, 0)
                : null,
            pacotes: leiturasNormalizadas.length
        };

        var agora = new Date();
        var hojeMeiaNoite = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate()).getTime();
        var alertas = [];

        for (var i = 0; i < alertasDb.length; i++) {
            var al = alertasDb[i];
            var dtAlerta = new Date(al.registrado_em);
            var dhAlerta = formatarDataLocal(dtAlerta);
            var diaAlertaMs = new Date(dtAlerta.getFullYear(), dtAlerta.getMonth(), dtAlerta.getDate()).getTime();
            var diasAtras = Math.max(Math.round((hojeMeiaNoite - diaAlertaMs) / 86400000), 0);

            var campo = mapearTipoMetrica(al.tipo_nome);
            var valorLeitura = (al.valor_registrado !== null && al.valor_registrado !== undefined)
                ? arredondar(al.valor_registrado, 1)
                : null;

            if (valorLeitura === null && campo && leiturasNormalizadas.length > 0) {
                var tsAlerta = dtAlerta.getTime();
                var menorDiff = Infinity;
                for (var j = 0; j < leiturasNormalizadas.length; j++) {
                    var cand = leiturasNormalizadas[j];
                    if (cand[campo] === null) continue;
                    var diff = Math.abs(cand.timestamp - tsAlerta);
                    if (diff < menorDiff) {
                        menorDiff = diff;
                        valorLeitura = arredondar(cand[campo], 1);
                    }
                }
            }

            alertas.push({
                id: Number(al.idAlerta),
                data: dhAlerta.dia,
                hora: dhAlerta.hora,
                diasAtras: diasAtras,
                tipo: al.tipo_nome,
                componente: al.componente || al.tipo_nome,
                nivel: al.nivel_alerta,
                valor: valorLeitura,
                unidade: al.unidade_medida || "%",
                descricao: al.descricao || null,
                limite: al.limiar_critico !== null ? Number(al.limiar_critico) : null,
                jiraKey: al.jira_key || null,
                statusJira: al.status_jira || null
            });
        }

        res.status(200).json({
            dispositivo: {
                id: disp.id_dispositivo,
                idEmpresa: disp.id_empresa,
                nome: disp.numero_serie || disp.modelo,
                empresa: disp.empresa,
                categoria: disp.categoria,
                modelo: disp.modelo,
                ip: disp.ip,
                mac: disp.endereco_mac,
                online: String(disp.status_dispositivo || "").toLowerCase() === "ativo"
            },
            atual: atual,
            historico: historico,
            limites: limites,
            limitesAtencao: limitesAtencao,
            alertas: alertas
        });
        return true;
    } catch (erro) {
        console.log("Erro ao obter dados do equipamento:", erro);
        res.status(500).json({ res: "Erro ao buscar dados do equipamento" });
        return false;
    }
}

module.exports = {
    obterDadosEquipamento
};