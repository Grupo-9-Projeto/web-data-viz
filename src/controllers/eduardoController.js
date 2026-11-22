
const relatorioModel = require("../models/relatorioModel");

const {
    S3Client,
    ListObjectsV2Command,
    GetObjectCommand
} = require("@aws-sdk/client-s3");

const s3 = new S3Client({
    region: process.env.AWS_REGION || "us-east-1"
});

const BUCKET = process.env.S3_BUCKET;

// Tolerância máxima entre o alerta e a captura: 5 minutos.
const TOLERANCIA_CAPTURA_MS = 5 * 60 * 1000;


// Converte a data do banco para Date sem perder o horário.
function converterDataHora(data) {
    if (data instanceof Date) {
        return data;
    }

    // Formato esperado: YYYY-MM-DD HH:mm:ss
    const partes = String(data).match(
        /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/
    );

    if (!partes) {
        return null;
    }

    return new Date(
        Number(partes[1]),
        Number(partes[2]) - 1,
        Number(partes[3]),
        Number(partes[4]),
        Number(partes[5]),
        Number(partes[6])
    );
}

function extrairDataHoraNomeArquivo(chave) {

    const nomeArquivo = chave.split("/").pop();

    const resultado = nomeArquivo.match(
        /^dados_[a-fA-F0-9]+_(\d{8})_(\d{6})\.json$/
    );

    if (!resultado) return null;

    const [, data, hora] = resultado;

    return new Date(
        Number(data.substring(0, 4)),
        Number(data.substring(4, 6)) - 1,
        Number(data.substring(6, 8)),
        Number(hora.substring(0, 2)),
        Number(hora.substring(2, 4)),
        Number(hora.substring(4, 6))
    );
}

// Monta o caminho da pasta de capturas de um dia.
function montarPrefixoCaptura(mac, data) {
    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, "0");
    const dia = String(data.getDate()).padStart(2, "0");

    return `client/dispositivos/capturas/${mac}/${ano}/${mes}/${dia}/`;
}


// Lista todos os arquivos JSON de uma pasta do S3.
async function listarArquivosS3(prefixo) {
    const arquivos = [];
    let continuationToken;

    do {
        const resposta = await s3.send(
            new ListObjectsV2Command({
                Bucket: BUCKET,
                Prefix: prefixo,
                ContinuationToken: continuationToken
            })
        );

        const objetos = resposta.Contents || [];

        arquivos.push(
            ...objetos
                .filter(objeto => objeto.Key?.endsWith(".json"))
                .map(objeto => objeto.Key)
        );

        continuationToken = resposta.IsTruncated
            ? resposta.NextContinuationToken
            : undefined;

    } while (continuationToken);

    return arquivos;
}


// Lê o conteúdo JSON de um objeto do S3.
async function lerArquivoS3(chave) {
    const resposta = await s3.send(
        new GetObjectCommand({
            Bucket: BUCKET,
            Key: chave
        })
    );

    const conteudo = await resposta.Body.transformToString("utf-8");

    return JSON.parse(conteudo);
}


// Procura a captura mais próxima do horário do alerta.
async function buscarCapturaAlerta(mac, dataAlerta) {

    const arquivosOrdenados = arquivos
        .map(chave => ({
            chave,
            data: extrairDataHoraNomeArquivo(chave)
        }))
        .filter(arquivo => arquivo.data !== null)
        .map(arquivo => ({
            ...arquivo,
            diferenca: Math.abs(
                arquivo.data.getTime() - dataAlerta.getTime()
            )
        }))
        .filter(arquivo =>
            arquivo.diferenca <= TOLERANCIA_CAPTURA_MS
        )
        .sort((a, b) => a.diferenca - b.diferenca);

    if (arquivosOrdenados.length === 0) {
        return null;
    }

    const registro = await lerArquivoS3(
        arquivosOrdenados[0].chave
    );

    if (!Array.isArray(registro) || registro.length === 0) {
        return null;
    }

    const registrosOrdenados = registro
        .map(atual => {
            const data = converterDataHora(
                atual["Quando foi Coletado"]
            );

            return {
                registro: atual,
                diferenca: data
                    ? Math.abs(data.getTime() - dataAlerta.getTime())
                    : Infinity
            };
        })
        .filter(atual =>
            atual.diferenca <= TOLERANCIA_CAPTURA_MS
        )
        .sort((a, b) => a.diferenca - b.diferenca);

    return registrosOrdenados.length > 0
        ? registrosOrdenados[0].registro
        : null;
}


// Transforma o registro do S3 para o formato esperado pelo front-end.
function formatarCaptura(registro) {

    if (!registro) return null;

    const dataHora = converterDataHora(
        registro["Quando foi Coletado"]
    );

    if (!dataHora) return null;

    return {
        data: dataHora.toLocaleDateString("pt-BR"),
        hora: dataHora.toLocaleTimeString("pt-BR"),

        usoCpu: registro["cpu total(%)"] ?? null,
        usoRam: registro["ram(%)"] ?? null,

        maiorCpu: {
            nome: registro["processo_maior_cpu"] || "N/D",
            pid: "N/D",
            uso: registro["cpu_processo_maior_cpu"] ?? null
        },

        maiorRam: {
            nome: registro["processo_maior_ram"] || "N/D",
            pid: "N/D",
            uso: registro["ram_processo_maior_ram"] ?? null
        },

        total: registro["quantidade_processos"] ?? null
    };
}


// GET /relatorios/alerta/:idAlerta
async function buscarRelatorioAlerta(req, res) {

    try {

        const { idAlerta } = req.params;
        const idUsuario = req.user.id;

        if (!Number.isInteger(Number(idAlerta)) || Number(idAlerta) <= 0) {
            return res.status(400).json({
                mensagem: "ID do alerta inválido."
            });
        }

        if (!BUCKET) {
            throw new Error("Variável S3_BUCKET não configurada.");
        }

        // 1. Busca o alerta e verifica o acesso do usuário.
        const resultado = await relatorioModel.buscarRelatorioAlerta(
            idAlerta,
            idUsuario
        );

        if (!resultado || resultado.length === 0) {
            return res.status(404).json({
                mensagem: "Alerta não encontrado ou sem permissão de acesso."
            });
        }

        const alerta = resultado[0];

        // 2. Converte o horário do alerta.
        const dataAlerta = converterDataHora(alerta.registrado_em);

        if (!dataAlerta) {
            throw new Error("Não foi possível interpretar a data do alerta.");
        }

        // 3. Busca a captura correspondente no S3.
        const registroS3 = await buscarCapturaAlerta(
            alerta.endereco_mac,
            dataAlerta
        );

        // 4. Formata os dados para o front-end.
        const captura = formatarCaptura(registroS3);

        // 5. Retorna o relatório completo.
        return res.status(200).json({
            alerta: {
                id: alerta.idAlerta,
                severidade: alerta.nivel_alerta,
                valor: alerta.valor_registrado,
                unidade: alerta.unidade_medida,
                descricao: alerta.descricao,
                dataHora: alerta.registrado_em,
                jiraKey: alerta.jira_key,
                statusJira: alerta.status_jira
            },

            empresa: {
                id: alerta.id_empresa,
                nome: alerta.nome_fantasia
            },

            dispositivo: {
                id: alerta.id_dispositivo,
                nome: alerta.nome_dispositivo,
                mac: alerta.endereco_mac,
                ip: alerta.ip,
                modelo: alerta.nome_modelo,
                categoria: alerta.categoria
            },

            componente: {
                id: alerta.id_componente,
                nome: alerta.nome_identificador,
                tipo: alerta.tipo_componente,
                capacidade: alerta.capacidade,
                limiarAtencao: alerta.limiar_atencao,
                limiarAlto: alerta.limiar_alto,
                limiarCritico: alerta.limiar_critico
            },

            captura
        });

    } catch (erro) {

        console.error("Erro ao buscar relatório do alerta:", erro);

        return res.status(500).json({
            mensagem: "Erro ao carregar o relatório do alerta."
        });
    }
}


module.exports = {
    buscarRelatorioAlerta
};
