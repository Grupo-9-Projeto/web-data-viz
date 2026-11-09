var ambiente_processo = 'producao';
// var ambiente_processo = 'desenvolvimento';

var caminho_env = ambiente_processo === 'producao' ? '.env' : '.env.dev';
require("dotenv").config({ path: caminho_env });

var express = require("express");
var cors = require("cors");
var path = require("path");

var PORTA_APP = process.env.APP_PORT;
var HOST_APP = process.env.APP_HOST;

var app = express();

// 1. Aplique o CORS no topo, antes dos parsers e arquivos estáticos
app.use(cors());

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, "public")));

var indexRouter = require("./src/routes/index");

var usuarioRouter = require("./src/routes/usuarios");
var empresaRouter = require("./src/routes/empresas");
var funcionarioRouter = require("./src/routes/funcionarios");
var dispositivoRouter = require("./src/routes/dispositivos");
var componentesRouter = require("./src/routes/componentes");
// CRIAR A PARTIR DAQUI SUA VARIÁVEL ROUTER


app.use("/", indexRouter);
app.use("/usuarios", usuarioRouter);
app.use("/empresa", empresaRouter);
app.use("/funcionarios", funcionarioRouter);
app.use("/dispositivos", dispositivoRouter);
app.use("/componentes", componentesRouter);

// QUANDO FOR FAZER O INDIVIDUAL, ADICIONA ABAIXO A STRING QUE VAI CHAMAR SUA ROTA, LEMBRA QUE A VARIÁVEL ROUTER PRECISAR ESTAR CRIADA. LINHA 29 EM DIANTE
//EXEMPLO:
//app.use("/joao", joaoRouter);

app.listen(PORTA_APP, HOST_APP, function () {
    console.log(`
######   ######    #####    ######    #####  
##    ##  ##   ##  ##   ##  ##    ##  ##   ## 
##    ##  ##   ##  ##        ##        ##      
########  ######   ##  ####  ##    ##   #####  
##    ##  ##   ##  ##    ##  ##    ##       ## 
##    ##  ##    ## ##    ##  ##    ##  ##   ## 
##    ##  ##     ##  #####    ######    #####
    \n\n\n                                                                                                 
    Servidor do seu site já está rodando! Acesse o caminho a seguir para visualizar .: http://${HOST_APP}:${PORTA_APP} :. \n\n
    Você está rodando sua aplicação em ambiente de .:${process.env.AMBIENTE_PROCESSO}:. \n\n
    \tSe .:desenvolvimento:. você está se conectando ao banco local. \n
    \tSe .:producao:. você está se conectando ao banco remoto. \n\n
    \t\tPara alterar o ambiente, comente ou descomente as linhas 1 ou 2 no arquivo 'app.js'\n\n
    =============================================================================================
    TA FUNCIONANDO O CONTAINER
    =============================================================================================
    `);
});