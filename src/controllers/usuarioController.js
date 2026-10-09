var bcrypt = require("bcrypt");
var jwt = require("jsonwebtoken");
var usuarioModel = require("../models/usuarioModel");

async function autenticar(req, res) {
    var email = req.body.emailServer;
    var senha = req.body.passwordHashServer;

    if (!email || !senha) {
        res.status(400).json("Tá faltando campo")
        return false;
    }

    try {
        const resposta = await usuarioModel.autenticar(email);

        if (resposta.length == 0) {
            res.status(404).json({
                "res": "Email errado",
            })
            console.log("Email errado")
            return false;
        }
        let senha_resposta = resposta[0].senha_hash;
        let ativo_resposta = resposta[0].ativo;

        console.log(await bcrypt.compare(senha, senha_resposta))
        console.log(senha)

        if (await bcrypt.compare(senha, senha_resposta) && ativo_resposta == 1) {
            let valores = {
                id: resposta[0].id_usuario,
                gestor_id: resposta[0].gestor_id,
                nome: resposta[0].nome,
                email: resposta[0].email,
                cargo: resposta[0].cargo,
                empresa: resposta[0].fk_empresa_fornecedora
            }

            const accessToken = jwt.sign(
                { id: valores.id, role: valores.cargo, gestor: valores.gestor_id, empresa: valores.empresa },
                process.env.JWT_SECRET,
                { expiresIn: process.env.JWT_EXPIRES }
            );

            res.status(200).json({
                "resposta": "Usuário logado com sucesso",
                "token": accessToken
            })
            console.log("Usuário logado!")
            return true;
        } else {
            console.log("Usuário não foi logado, senha errada ou ele foi desativado")
            res.status(401).json("Senha errada ou o usuário foi desativado")
            return false;
        }

    } catch (erro) {
        console.log("Deu erro")
        console.log(erro)
        res.status(500).json(erro)
        return null;
    }
}

async function cadastrar(req, res) {
    let nome = req.body.nameServer;
    let email = req.body.emailServer;
    let senha = await bcrypt.hash(req.body.passwordHashServer, 10);
    let token = req.body.tokenServer;

    if (!nome || !email || !senha || !token) {
        res.status(400).json("Campos vazios")
        return;
    }

    try {
        const respostaAtivo = await usuarioModel.autenticar(email);

        if (respostaAtivo.length == 0) {
            res.status(404).json({
                "res": "Email errado",
            })
            console.log("Email errado")
            return false;
        }

        const resposta = await usuarioModel.cadastrar(nome, email, senha, token);

        if (resposta.affectedRows == 0) {
            res.status(401).json("token errado")
            return false;
        }

        const respostatoken = await usuarioModel.inutilizarToken(email, token);
        res.status(201).json("Usuário criado com sucesso e token inutilizado com sucesso")
        return true;
    } catch (erro) {
        console.log("Deu erro")
        console.log(erro)
        res.status(500).json(erro)
        return null;
    }
}

async function editarConta(req, res) {
    let id = req.user.id;

    let nome = req.body.nome;
    let email = req.body.email;
    let senha = await bcrypt.hash(req.body.senha, 10);

    if (!nome || !email || !senha) {
        console.log("Campo vazio")
        res.status(400).json("tá faltando algum campo")
        return false;
    }
    try {

        const existeEmail = await usuarioModel.validarEmail(email, id);

        if (existeEmail.length > 0) {
            res.status(409).json({
                "res": "Email Já cadastrado"
            })
            console.log("Email já está vinculado a outra conta")
            return false;
        }

        const resposta = await usuarioModel.editar(nome, email, senha, id);

        res.status(200).json({
            "res": "Atualização feita com sucesso"
        })

        console.log("Atualiza deu certo ")
        return true;
    } catch (erro) {
        res.status(500).json({
            "res": "Deu erro",
            "erro": erro
        })
        console.log(erro)
    }

}

async function deletarConta(req, res) {
    let id = req.user;

    let confirmacao = req.body.confirmacao;

    if (!confirmacao) {
        console.log("Campo vazio")
        res.status(400).json("tá faltando algum campo")
        return false;
    }

    if (confirmacao.toLowerCase() == "confirmar") {
        try {
            const resposta = await usuarioModel.deletarConta(id.id);

            if (resposta[0].affectedRows == 0 || resposta[1].affectedRows == 0 || resposta[2].affectedRows == 0) {
                res.status(404).json({
                    "res": "deu algum erro. Provavelmente o usuário já foi apagado"
                })
                console.log("Deu erro, chefe")
                return false;
            }
            res.status(200).json({
                "res": "conta deletada com sucesso"
            })

            console.log(" deu certo ")
            return true;
        } catch (erro) {
            res.status(500).json({
                "res": "Deu erro",
                "erro": erro
            })
            console.log(erro)
        }
    } else {
        res.status(400).json({
            "res": "Deu erro, precisa confirmar",
        })
        console.log("precisa de confirmação para deletar")
    }
}

async function cadastraSuperAdmin(req, res) {
    let senha = await bcrypt.hash(req.body.passwordHashServer, 10);

    if (!senha) {
        res.status(400).json("Campos vazios")
        return;
    }

    try {
        const respostaAtivo = await usuarioModel.autenticar("admin@cisco.com");

        if (respostaAtivo.length == 1) {
            res.status(404).json({
                "res": "já existe um super admin",
            })
            console.log("já existe")
            return false;
        }

        const resposta = await usuarioModel.cadastrarSuperAdmin(senha);

        res.status(201).json("Usuário criado com sucesso")
        return true;
    } catch (erro) {
        console.log("Deu erro")
        console.log(erro)
        res.status(500).json(erro)
        return null;
    }
}

async function cadastrarGerente(req, res) {
    let role = req.user
    let email = req.body.email;

    if (role.id != 1) {
        res.status(404).json({
            "res": "Não pode entrar aqui"
        })
        console.log("Não pode acessar")
        return
    }

    if(!email){
        res.status(404).json({
            "res": "faltando campo"
        })
        console.log("faltando campo")
        return
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
                        cargo: "gerente",
                        gestor_id: role.id
                    })
                }).then(response => {
                    if (response.ok) {
                        console.log("Criação de usuário realizado com sucesso! Um email já foi enviado com o token de acesso.");
                        res.status(200).json({
                            "res": "Usuário gerente criado com sucesso"
                        })
                        return true;
                    } else {
                        console.log("Houve um erro ao tentar realizar a criação de usuário. Verifique se o token é válido.");
                        res.status(400).json({
                            "res": "Houve um erro ao tentar realizar a criação de usuário. Verifique se o token é válido."
                        })
                        return false;
                    }
                })
        
    } catch (erro) {
        console.log("Deu erro")
        console.log(erro)
        res.status(500).json(erro)
        return null;
    }
}


module.exports = {
    autenticar,
    cadastrar,
    editarConta,
    deletarConta,
    cadastraSuperAdmin,
    cadastrarGerente
}
