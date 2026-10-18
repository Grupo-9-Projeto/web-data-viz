var funcionarioModel = require("../models/funcionarioModel");
var usuarioModel = require("../models/usuarioModel")

async function listarFuncionarios(req, res) {
    let infoUsuario = req.user

    if (infoUsuario.role != "gerente") {

        res.status(403).json({
            "res": "Não permitido"
        })
        console.log("Deu erro, chefe")
        return false;
    }

    try {
        const resposta = await funcionarioModel.listarFuncionarios(infoUsuario.id);
        const arrayRes = [];
        if (resposta.length == 0) {
            res.status(404).json({
                "res": "Usuário não tem funcionarios"
            })
            return false;
        }

        for(let i = 0; i < resposta.length; i++){
            if(resposta[i].nome == null || resposta[i].ativo != 1){
                continue
            }else{
                arrayRes.push(resposta[i])
            }
        }

        res.status(200).json(arrayRes)
        return true;
    } catch (erro) {
        res.status(500).json({
            "res": "Deu erro",
            "erro": erro
        })
        console.log(erro);
        return false;
    }
}



async function criarFuncionario(req, res) {
    let infoUsuario = req.user

    let email = req.body.email;

    if (infoUsuario.role != "gerente") {

        res.status(403).json({
            "res": "Não permitido"
        })
        console.log("Deu erro, chefe")
        return false;
    }

    if (!email) {
        res.status(400).json({
            "res": "faltando o email"
        })
        console.log("Deu erro, chefe")
        return false;
    }

    try {
        const resposta = await usuarioModel.autenticar(email);

        if(resposta.length != 0){
            res.status(400).json("Usuário já cadastrado");
            console.log("Usuário já existe")
            return;
        }

        fetch("http://localhost:3333/usuarios/criar-usuario", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                email: email,
                cargo: "analista",
                gestor_id: infoUsuario.id
            })
        }).then(response => {
            if (response.ok) {
                console.log("Criação de usuário realizado com sucesso! Um email já foi enviado com o token de acesso.");
                res.status(200).json({
                    "res": "Usuário analista criado com sucesso"
                })
                return true;
            } else {
                console.log("Houve um erro ao tentar realizar a criação de usuário. Verifique se o token é válido.");
                res.status(400).json({
                    "res": "Houve um erro ao tentar realizar a criação de usuário. Verifique se o token é válido."
                })
                return false;
            }
        }).catch(erro => {
            console.log("Serviço de e-mail indisponível:", erro.message);
            res.status(502).json({
                "res": "Serviço de e-mail indisponível. Tente novamente em instantes."
            })
        })

    } catch (erro) {
        res.status(500).json({
            "res": "Deu erro",
            "erro": erro
        })
        console.log(erro);
        return false;
    }
}

async function editarFuncionario(req, res) {
    let infoUsuario = req.user;

    if (infoUsuario.role != "gerente") {

        res.status(403).json({
            "res": "Não permitido"
        })
        console.log("Deu erro, chefe")
        return false;
    }

    let email = req.body.email;
    let nome = req.body.nome;
    let id = req.body.id;


    if (!email || !nome) {
        res.status(400).json({
            "res": "faltando campo"
        })
        console.log("Deu erro, chefe. Olha o que deu aí")
        return false;
    }

    try {

        const respostaFunc = await funcionarioModel.verificarfuncionario(id);

        console.log(respostaFunc)
        if(respostaFunc.length == 0 || respostaFunc[0].gestor_id != infoUsuario.id){
            res.status(400).json("Não pode mexer nesse funcionário")
            console.log("Não pode mexer nesse")
            return;
        }

        const resposta = await funcionarioModel.editarFuncionario(nome, email, id);

        if (resposta.affectedRows == 0) {
            res.status(404).json({
                "res": "deu algum erro"
            })
            console.log("Deu erro, chefe")
            return false;
        }

        res.status(200).json({
            "res": "Deu certo, funcionario editado!"
        })
        return true;
    } catch (erro) {
        res.status(500).json({
            "res": "Deu erro",
            "erro": erro
        })
        console.log(erro);
        return false;
    }
}

async function desativarFuncionario(req, res) {
    let infoUsuario = req.user;
    let id = req.body.id;

    if (infoUsuario.role != "gerente") {

        res.status(403).json({
            "res": "Não permitido"
        })
        console.log("Deu erro, chefe")
        return false;
    }

    if (!id) {

        res.status(403).json({
            "res": "Tà faltando campo"
        })
        console.log("Deu erro, chefe")
        return false;
    }

    try {

        const respostaFunc = await funcionarioModel.verificarfuncionario(id);

        console.log(respostaFunc)
        if(respostaFunc.length == 0 || respostaFunc[0].gestor_id != infoUsuario.id){
            res.status(400).json("Não pode mexer nesse funcionário")
            console.log("Não pode mexer nesse")
            return;
        }

        const resposta = await funcionarioModel.desativarFuncionario(id);

        if (resposta.affectedRows == 0) {
            res.status(404).json({
                "res": "deu algum erro. Provavelmente o usuário já foi apagado"
            })
            console.log("Deu erro, chefe")
            return false;
        }

        res.status(200).json({
            "res": "Deu certo, usuario desativado!"
        })
        return true;
    } catch (erro) {
        res.status(500).json({
            "res": "Deu erro",
            "erro": erro
        })
        console.log(erro);
        return false;
    }
}

async function informacoesUsuario(req, res) {
    let infoUsuario = req.user;
    let id = req.body.id;

    if (infoUsuario.role != "gerente") {

        res.status(403).json({
            "res": "Não permitido"
        })
        console.log("Deu erro, chefe")
        return false;
    }

    if (!id) {
        res.status(403).json({
            "res": "Tà faltando campo"
        })
        console.log("Deu erro, chefe")
        return false;
    }

    try {

        const respostaFunc = await funcionarioModel.verificarfuncionario(id);

        console.log(respostaFunc)
        if(respostaFunc.length == 0 || respostaFunc[0].gestor_id != infoUsuario.id){
            res.status(400).json("Não pode mexer nesse funcionário")
            console.log("Não pode mexer nesse")
            return;
        }

        const resposta = await funcionarioModel.informacoesFuncionario(id);

        if (resposta.length == 0) {
            res.status(404).json({
                "res": "deu algum erro"
            })
            console.log("Deu erro, chefe")
            return false;
        }

        res.status(200).json({
            "informacoes": resposta
        })
        console.log("Deu certo")
        return true;
    } catch (erro) {
        res.status(500).json({
            "res": "Deu erro",
            "erro": erro
        })
        console.log(erro);
        return false;
    }
}

async function validarAcessoAoFuncionario(req, res, exigirEmpresa) {
    let infoUsuario = req.user;
    let id = parseInt(req.body.id);
    let empresaId = parseInt(req.body.empresa_id);

    if (infoUsuario.role != "gerente") {
        res.status(403).json({
            "res": "Não permitido"
        })
        return null;
    }

    if (!id || (exigirEmpresa && !empresaId)) {
        res.status(400).json({
            "res": "Tá faltando campo"
        })
        return null;
    }

    const respostaFunc = await funcionarioModel.verificarfuncionario(id);
    if (respostaFunc.length == 0 || respostaFunc[0].gestor_id != infoUsuario.id) {
        res.status(400).json("Não pode mexer nesse funcionário")
        return null;
    }

    if (exigirEmpresa) {
        const acessoDoGerente = await funcionarioModel.buscarVinculo(infoUsuario.id, empresaId);
        if (acessoDoGerente.length == 0) {
            res.status(403).json({
                "res": "Você não tem acesso a essa empresa"
            })
            return null;
        }
    }

    return { id: id, empresaId: empresaId };
}

async function listarEmpresasFuncionario(req, res) {
    try {
        const dados = await validarAcessoAoFuncionario(req, res, false);
        if (!dados) return false;

        const empresas = await funcionarioModel.listarEmpresasDoFuncionario(dados.id);

        res.status(200).json({
            "empresas": empresas
        })
        return true;
    } catch (erro) {
        res.status(500).json({
            "res": "Deu erro",
            "erro": erro
        })
        console.log(erro);
        return false;
    }
}

async function adicionarEmpresaFuncionario(req, res) {
    try {
        const dados = await validarAcessoAoFuncionario(req, res, true);
        if (!dados) return false;

        const jaTemAcesso = await funcionarioModel.buscarVinculo(dados.id, dados.empresaId);
        if (jaTemAcesso.length != 0) {
            res.status(400).json({
                "res": "O funcionário já tem acesso a essa empresa"
            })
            return false;
        }

        await funcionarioModel.adicionarEmpresa(dados.id, dados.empresaId);

        res.status(200).json({
            "res": "Empresa vinculada com sucesso"
        })
        return true;
    } catch (erro) {
        res.status(500).json({
            "res": "Deu erro",
            "erro": erro
        })
        console.log(erro);
        return false;
    }
}

async function removerEmpresaFuncionario(req, res) {
    try {
        const dados = await validarAcessoAoFuncionario(req, res, true);
        if (!dados) return false;

        const resposta = await funcionarioModel.removerEmpresa(dados.id, dados.empresaId);

        if (resposta.affectedRows == 0) {
            res.status(404).json({
                "res": "O funcionário não tem acesso a essa empresa"
            })
            return false;
        }

        res.status(200).json({
            "res": "Empresa desvinculada com sucesso"
        })
        return true;
    } catch (erro) {
        res.status(500).json({
            "res": "Deu erro",
            "erro": erro
        })
        console.log(erro);
        return false;
    }
}


module.exports = {
    listarFuncionarios,
    criarFuncionario,
    editarFuncionario,
    desativarFuncionario,
    informacoesUsuario,
    listarEmpresasFuncionario,
    adicionarEmpresaFuncionario,
    removerEmpresaFuncionario
}