# web-data-viz · Back-end do Argos

API REST em **Node.js / Express** do projeto **Argos**. É o back-end consumido pelo [site-institucional](https://github.com/Grupo-9-Projeto/site-institucional): cuida do **login com JWT**, do **cadastro de empresas, funcionários, equipamentos e componentes**, e entrega os dados dos painéis (alertas, chamados, previsões e relatórios) combinando o banco MySQL `argos_db` com as métricas guardadas no **S3**.

---

## Sumário

1. [Visão geral](#1-visão-geral)
2. [Arquitetura](#2-arquitetura)
3. [Tecnologias](#3-tecnologias)
4. [Estrutura do projeto](#4-estrutura-do-projeto)
5. [Perfis e autenticação](#5-perfis-e-autenticação)
6. [Rotas da API](#6-rotas-da-api)
7. [Banco de dados](#7-banco-de-dados)
8. [Integração com o S3](#8-integração-com-o-s3)
9. [Configuração](#9-configuração)
10. [Como executar](#10-como-executar)
11. [Docker](#11-docker)
12. [Problemas comuns](#12-problemas-comuns)
13. [Limitações conhecidas e melhorias](#13-limitações-conhecidas-e-melhorias)
14. [Repositórios relacionados](#14-repositórios-relacionados)

---

## 1. Visão geral

| | |
|---|---|
| **O que faz** | Autentica usuários, gerencia os cadastros e fornece os dados dos painéis do Argos |
| **Consumidor** | `site-institucional` (navegador), que envia o token JWT em cada chamada |
| **Banco** | MySQL 8, banco `argos_db` |
| **Armazenamento** | Bucket S3 (camada `client`, gerada pelo ETL) |
| **Porta padrão** | `8080` (variável `APP_PORT`) |
| **Verificação** | `GET /` responde `{ "status": "online", "service": "argos-backend" }` |

---

## 2. Arquitetura

```
 site-institucional (navegador)
          │  HTTP + Authorization: Bearer <JWT>
          ▼
 ┌──────────────────────────── web-data-viz ────────────────────────────┐
 │  routes  →  controllers  →  models  →  MySQL (argos_db)              │
 │               │      │                                               │
 │               │      └──────────────►  S3 (client/dispositivos/...)  │
 │               └─────────────────────►  java-spring-email (:3333)     │
 └──────────────────────────────────────────────────────────────────────┘

 monitoring-scripts ──► S3 (raw → trusted → client) ──► java-jira ──► tabela alerta / Jira
```

- **routes:** define o caminho, o método HTTP e se a rota exige token.
- **controllers:** validam a entrada, conferem o perfil do usuário e montam a resposta.
- **models:** executam o SQL com parâmetros (`?`) pelo `database/config.js`.
- O serviço **java-jira** grava na tabela `alerta` e atualiza o status dos chamados. Este back-end apenas lê esses dados para exibir nos painéis.

---

## 3. Tecnologias

| Item | Detalhe |
|---|---|
| Node.js | 20 (imagem Docker `node:20-alpine`) |
| Express | 4.x, com `cors`, `express.json` e `express.urlencoded` |
| Banco | `mysql2` |
| Autenticação | `jsonwebtoken` (JWT) e `bcrypt` (hash das senhas) |
| AWS | `@aws-sdk/client-s3`, região `us-east-1` por padrão |
| Configuração | `dotenv` |
| Desenvolvimento | `nodemon` (`npm run dev`) |

---

## 4. Estrutura do projeto

```
web-data-viz/
├── app.js                       # Configura o Express, carrega o .env e monta as rotas
├── Dockerfile / .dockerignore
├── .env.example                 # Modelo das variáveis de ambiente
├── package.json
└── src/
    ├── database/
    │   ├── config.js            # Conexão com o MySQL (função executar)
    │   └── script-tabelas.sql   # Criação básica das tabelas
    ├── middleware/
    │   └── auth.js              # authMiddlewareUser: valida o JWT
    ├── routes/                  # Um arquivo de rotas por recurso
    ├── controllers/             # Regras de cada rota
    └── models/                  # Consultas SQL
```

### Recursos e módulos

| Prefixo | Rotas / controller | Assunto |
|---|---|---|
| `/usuarios` | `usuarios.js`, `usuarioController` | Login, cadastro, conta e convite de gerente |
| `/empresa` | `empresas.js`, `empresasController` | Empresas clientes |
| `/funcionarios` | `funcionarios.js`, `funcionarioController` | Analistas e seus vínculos com empresas |
| `/dispositivos` | `dispositivos.js`, `dispositivosController` | Equipamentos monitorados |
| `/componentes` | `componentes.js`, `componentesController` | CPU, RAM, disco e rede de cada equipamento, com limiares |
| `/lucas` | `lucasIndividual.js` | Painel de um equipamento (banco + S3) |
| `/joao` | `joaoIndividual.js` | Home e equipamentos do analista |
| `/previsoes` e `/maria` | `mariaIndividual.js` | Previsões e anomalias (as duas rotas apontam para o mesmo roteador) |
| `/pedro` | `pedroIndividual.js` | Histórico de chamados (violações de SLA) |
| `/thabata` | `thabataIndividual.js` | Resumo da home do gerente |
| `/relatorioAlerta` | `eduardoIndividual.js` | Relatório de um alerta, com a captura do S3 |

Os módulos `*Individual` correspondem às entregas individuais da equipe e têm o nome de quem os desenvolveu.

---

## 5. Perfis e autenticação

### Perfis

| Perfil (`cargo`) | Quem é | O que pode |
|---|---|---|
| `super` | Administrador da fornecedora (usuário de `id = 1`) | Convida gerentes |
| `gerente` | Gestor de uma ou mais empresas clientes | Cadastros (empresas, funcionários, equipamentos, componentes), previsões, histórico de chamados |
| `analista` | Funcionário criado por um gerente | Acompanha os equipamentos das empresas às quais está vinculado |

### Fluxo de login

1. `POST /usuarios/autenticar` recebe `emailServer` e `passwordHashServer`.
2. A senha é conferida com `bcrypt.compare` contra `senha_hash`, e a conta precisa estar `ativo = 1`.
3. A resposta traz um **JWT** assinado com `JWT_SECRET` e validade `JWT_EXPIRES`, com os campos `id`, `role` (o `cargo`), `gestor`, `empresa` e `nome`.
4. O site envia o token no cabeçalho `Authorization: Bearer <token>`.
5. O `authMiddlewareUser` valida o token e coloca o conteúdo em `req.user`. Sem token ou com token inválido/expirado, responde **401**.
6. Cada controller confere o `role` quando a rota é restrita e responde **403** se o perfil não for permitido.

### Como um usuário novo entra (convite com token)

1. O `super` chama `POST /usuarios/cadastrar_gerente` com o e-mail do futuro gerente (ou o gerente chama `POST /funcionarios/criar_funcionario` para um analista).
2. O back-end pede ao serviço de e-mail (`java-spring-email`, em `http://localhost:3333/usuarios/criar-usuario`) que crie o usuário pendente e envie por e-mail um **token de acesso**.
3. Se o serviço de e-mail estiver fora do ar, a criação de **gerente** cai no plano B: o usuário pendente é criado aqui e o **token vem na resposta** para o super entregar. Na criação de **analista**, a resposta é `502`.
4. A pessoa conclui o cadastro em `POST /usuarios/cadastrar` com nome, e-mail, senha e o token. O token é inutilizado depois do uso.

---

## 6. Rotas da API

Legenda de acesso: **Pública** (sem token), **Token** (qualquer usuário logado), **Gerente**, **Super**.

### `/usuarios`

| Método | Rota | Acesso | O que faz |
|---|---|---|---|
| POST | `/usuarios/autenticar` | Pública | Login; devolve o JWT |
| POST | `/usuarios/cadastrar` | Pública | Conclui o cadastro com o token recebido por e-mail |
| POST | `/usuarios/cadastrar_super` | Pública | Cria o super admin, só se ele ainda não existir |
| POST | `/usuarios/cadastrar_gerente` | Super | Convida um gerente pelo e-mail |
| GET | `/usuarios/informacoes_usuario` | Token | Dados do usuário logado |
| POST | `/usuarios/editar_conta` | Token | Atualiza nome, e-mail e senha do próprio usuário |
| DELETE | `/usuarios/deletar_conta` | Gerente | Desativa a própria conta (exige `confirmacao: "confirmar"`) |

### `/empresa`

| Método | Rota | Acesso | O que faz |
|---|---|---|---|
| GET | `/empresa/listar_empresas` | Token | Lista as empresas |
| POST | `/empresa/criar_empresa` | Gerente | Cria uma empresa |
| POST | `/empresa/atualizar_empresa` | Gerente | Edita uma empresa |
| DELETE | `/empresa/deletar_empresa` | Gerente | Remove uma empresa |
| POST | `/empresa/informacoes_empresa` | Token | Informações da empresa (o conteúdo muda para gerente e analista) |

### `/funcionarios` (todas exigem perfil gerente)

| Método | Rota | O que faz |
|---|---|---|
| GET | `/funcionarios/listar_funcionarios` | Lista os funcionários |
| POST | `/funcionarios/criar_funcionario` | Convida um analista (e-mail com token) |
| POST | `/funcionarios/atualizar_funcionario` | Edita um funcionário |
| DELETE | `/funcionarios/deletar_funcionario` | **Desativa** o funcionário |
| POST | `/funcionarios/listar_funcionario` | Informações de um funcionário |
| POST | `/funcionarios/listar_empresas_funcionario` | Empresas vinculadas a um funcionário |
| POST | `/funcionarios/adicionar_empresa_funcionario` | Vincula uma empresa |
| DELETE | `/funcionarios/remover_empresa_funcionario` | Remove o vínculo |

### `/dispositivos`

| Método | Rota | Acesso | O que faz |
|---|---|---|---|
| POST | `/dispositivos/listar_dispositivos` | Token | Lista equipamentos |
| POST | `/dispositivos/criar_dispositivo` | Gerente | Cadastra um equipamento |
| POST | `/dispositivos/editar_dispositivo` | Gerente | Edita um equipamento |
| DELETE | `/dispositivos/desativar_dispositivo` | Gerente | Desativa um equipamento |
| POST | `/dispositivos/listar_informacoes_dispositivo` | Gerente | Detalhes de um equipamento |
| GET | `/dispositivos/listar_categorias` | Gerente | Categorias (Switch, Firewall, Router etc.) |

### `/componentes` (todas exigem perfil gerente)

| Método | Rota | O que faz |
|---|---|---|
| POST | `/componentes/listar_componentes` | Componentes de um equipamento |
| POST | `/componentes/criar_componente` | Cria um componente, com capacidade e limiares |
| POST | `/componentes/editar_componente` | Edita um componente |
| DELETE | `/componentes/desativar_componente` | Desativa um componente |
| POST | `/componentes/listar_componente` | Detalhes de um componente |
| GET | `/componentes/listar_todos_tipos_componentes` | Tipos de componente (CPU, RAM, Disco, Rede) |

### Painéis

| Método | Rota | Acesso | O que faz |
|---|---|---|---|
| GET | `/lucas/equipamento/:idDispositivo` | Token | Dados do painel de um equipamento (leituras do S3 e alertas). Responde 403 se o usuário não tem acesso ao dispositivo |
| GET | `/joao/equipamentos_monitorados` | Token | Equipamentos monitorados |
| POST | `/joao/alertas_empresa` | Token | Alertas de uma empresa |
| POST | `/joao/porcentagem_empresa` | Token | Porcentagens por empresa |
| GET | `/joao/rankEquipamentos` | Token | Ranking dos equipamentos com mais alertas críticos |
| POST | `/joao/equipamentos_empresa` | Token | Equipamentos de uma empresa |
| GET | `/thabata/home` | Token | Resumo da home do gerente (SLAs, empresas com menor equipe, chamados) |
| GET | `/previsoes/previsao_semanas` | Gerente | Previsão de chamados por semana |
| GET | `/previsoes/previsao_mapa_calor` | Gerente | Dados do mapa de calor |
| GET | `/previsoes/previsao_empresas` | Gerente | Previsão por empresa |
| GET | `/previsoes/chamados` | Gerente | Dados da tela de previsões (usada pelo site) |
| GET | `/previsoes/modelos` | Gerente | Resumo por modelo de equipamento, com anomalias |
| GET | `/pedro/chamados` | Gerente | Histórico de violações de SLA |
| GET | `/pedro/chamados/:id` | Gerente | Detalhe de um chamado |
| GET | `/relatorioAlerta/alerta/:idAlerta` | Token | Relatório de um alerta, com a captura do S3 do dia do alerta |

> As mesmas rotas de previsões também respondem em `/maria/...`.

---

## 7. Banco de dados

O banco é o `argos_db` (MySQL 8). O arquivo `src/database/script-tabelas.sql` cria a estrutura básica e insere a empresa fornecedora `Cisco`:

| Tabela | Papel |
|---|---|
| `empresa_fornecedora` | Empresa dona da plataforma (a Cisco) |
| `empresa_cliente` | Empresas clientes |
| `usuario` | Usuários, com `cargo`, `gestor_id`, `token` de convite e `ativo` |
| `usuario_empresa` | Vínculo entre usuários e empresas clientes |
| `categoria` e `modelo` | Categoria e modelo dos equipamentos |
| `dispositivo` | Equipamentos monitorados (`endereco_mac` único) |
| `tipo_componente` e `componente` | Tipos e componentes, com `capacidade` e `limiar_atencao`, `limiar_alto`, `limiar_critico` |
| `Contrato_SLA` | Contratos de SLA por empresa |
| `Alerta` | Alertas por componente |
| `indisponibilidade` | Períodos de indisponibilidade de um equipamento |
| `violacao_sla` | Violações de SLA e chamados do Jira (`chamado_jira`) |

> **O script deste repositório está desatualizado em relação ao código.** Conferindo os models:
> - `alerta` precisa também das colunas `valor_registrado`, `unidade_medida`, `descricao`, `jira_key` e `status_jira` (usadas por `java-jira`, pelo painel do equipamento e pelo relatório de alerta). O script cria só `registrado_em`, `nivel_alerta` e `fkComponente`.
> - A tela de home do gerente faz `LEFT JOIN` em `plano_sla` e usa `Contrato_SLA.fkPlano`, e nenhum dos dois existe no script.
>
> Use a versão completa do banco, do repositório `database-scripts`, ou atualize este arquivo antes de rodar tudo.

Ao criar o primeiro usuário, o `cadastrar_super` cria o super admin `admin@cisco.com`. O fluxo de convite depende de esse usuário ter `id = 1`.

---

## 8. Integração com o S3

Os painéis leem as métricas da camada **client** do bucket (gerada pelo ETL do `monitoring-scripts`):

```
s3://<S3_BUCKET>/client/dispositivos/capturas/<mac>/<AAAA>/<MM>/<DD>/
```

| Módulo | Uso |
|---|---|
| `/lucas/equipamento/:id` | Lista e lê as leituras do equipamento pelo MAC |
| `/relatorioAlerta/alerta/:idAlerta` | Procura, na pasta do dia do alerta, a captura mais próxima do horário do alerta (tolerância de 5 minutos) |
| `/previsoes/modelos` | Lê os últimos dias de leituras (padrão: 7, ajustável por `ANOMALIAS_DIAS`) e resume as anomalias. O resultado fica em cache por 10 minutos |

As credenciais da AWS **não ficam no código**: o SDK usa a ordem padrão (variáveis `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` e `AWS_SESSION_TOKEN`, ou `~/.aws/credentials`). No AWS Academy elas expiram quando o laboratório termina, e o back-end precisa ser reiniciado depois de renová-las.

---

## 9. Configuração

As variáveis ficam em um arquivo `.env`. Copie o modelo e preencha:

```bash
cp .env.example .env
```

```properties
AMBIENTE_PROCESSO=producao

# Banco de dados
DB_HOST='localhost'
DB_DATABASE='argos_db'
DB_USER='usuario_db'
DB_PASSWORD='senha_usuario'
DB_PORT='3306'

# Servidor
APP_PORT=8080
APP_HOST=localhost

# S3
S3_BUCKET=nome-do-seu-bucket
AWS_REGION=us-east-1

# JWT
JWT_SECRET=hash_aleatorio
JWT_EXPIRES=2h
```

| Variável | Obrigatória | Descrição |
|---|:---:|---|
| `AMBIENTE_PROCESSO` | Sim | `producao` ou `desenvolvimento`. Sem um desses valores, nenhuma consulta ao banco é executada |
| `DB_HOST`, `DB_DATABASE`, `DB_USER`, `DB_PASSWORD`, `DB_PORT` | Sim | Conexão com o MySQL. Se a senha tiver caracteres especiais, coloque entre aspas |
| `APP_PORT` | Sim | Porta do servidor |
| `APP_HOST` | Sim | Endereço em que o servidor escuta. Em Docker, use `0.0.0.0` |
| `S3_BUCKET` | Sim | Bucket com a camada `client` |
| `AWS_REGION` | Não | Padrão: `us-east-1` |
| `JWT_SECRET` | Sim | Segredo de assinatura do token. Use um valor longo e aleatório |
| `JWT_EXPIRES` | Sim | Validade do token (ex.: `2h`) |
| `ANOMALIAS_DIAS` | Não | Dias de histórico usados na análise de anomalias. Padrão: `7` |

### Ambiente de produção e de desenvolvimento

O ambiente é escolhido nas duas primeiras linhas do `app.js`, comentando uma e deixando a outra ativa:

```js
var ambiente_processo = 'producao';            // lê o arquivo .env
// var ambiente_processo = 'desenvolvimento';  // lê o arquivo .env.dev
```

Para trabalhar com um banco local, crie o `.env.dev` (também ignorado pelo Git) e ative a linha de `desenvolvimento`.

> Os arquivos `.env` e `.env.dev` contêm senhas e segredos e estão no `.gitignore`. Nunca faça commit deles.

---

## 10. Como executar

### Pré-requisitos

- Node.js 20
- MySQL 8 com o `argos_db` criado e populado
- Credenciais da AWS com acesso de leitura ao bucket (para os painéis com dados de equipamento)
- Serviço `java-spring-email` rodando em `localhost:3333` (para convidar gerentes e analistas por e-mail)

### Passo a passo

```bash
# 1. Clone o repositório
git clone https://github.com/Grupo-9-Projeto/web-data-viz.git
cd web-data-viz

# 2. Instale as dependências
npm install

# 3. Configure o ambiente (seção 9)
cp .env.example .env

# 4. Inicie o servidor
npm start          # node app.js
# ou, recarregando a cada alteração:
npm run dev        # nodemon
```

Confira em `http://localhost:8080/`: a resposta deve ser `{"status":"online","service":"argos-backend"}`.

### Primeiro acesso

1. Crie o super admin com `POST /usuarios/cadastrar_super` (corpo: `{ "passwordHashServer": "<senha>" }`). Isso só funciona uma vez.
2. Faça login como `admin@cisco.com` em `POST /usuarios/autenticar`.
3. Convide um gerente em `POST /usuarios/cadastrar_gerente`, usando o token do super.
4. O gerente conclui o cadastro no site (`cadastro.html`) com o token que recebeu.

### Servindo o site pelo próprio back-end

O `app.js` também serve como arquivos estáticos a pasta `public/` e a pasta `../site-institucional/src`. Com os dois repositórios lado a lado, o site abre em `http://localhost:8080/`.

---

## 11. Docker

```bash
docker build -t argos-backend .

docker run -d --name argos-backend -p 8080:8080 \
  --env-file .env \
  -e APP_HOST=0.0.0.0 \
  argos-backend
```

O `Dockerfile` usa `node:20-alpine`, fuso `America/Sao_Paulo`, instala só as dependências de produção (`npm ci --omit=dev`) e expõe a porta `8080`.

Pontos de atenção:

- **O `.env` não entra na imagem** (está no `.dockerignore`). Passe as variáveis com `--env-file` ou `-e`.
- **`APP_HOST=0.0.0.0` é necessário.** Com `localhost`, o servidor escuta só dentro do container e a porta publicada não responde.
- O `--env-file` do Docker **não remove as aspas** de valores como `DB_HOST='localhost'`. No arquivo usado com Docker, escreva sem aspas.
- `localhost` em `DB_HOST` aponta para o próprio container. Use o endereço real do MySQL (ou `host.docker.internal` no Docker Desktop).
- O serviço de e-mail está fixo em `http://localhost:3333`. Dentro do container ele não será encontrado, e a criação de gerente cai no plano B (token na resposta) e a de analista responde `502`.
- Passe as credenciais da AWS por variáveis de ambiente (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_SESSION_TOKEN`).

---

## 12. Problemas comuns

| Sintoma | Causa provável | Solução |
|---|---|---|
| `AMBIENTE NÃO CONFIGURADO EM .env` | `AMBIENTE_PROCESSO` ausente ou diferente de `producao`/`desenvolvimento` | Ajuste a variável no `.env` |
| `ER_ACCESS_DENIED_ERROR` ou `ECONNREFUSED` ao consultar o banco | Credenciais, host ou porta do MySQL errados | Confira as variáveis `DB_*` |
| `ER_BAD_FIELD_ERROR` em `jira_key`, `status_jira`, `valor_registrado` ou `descricao` | Tabela `alerta` criada pelo script antigo | Atualize a tabela (seção 7) |
| `Table '...plano_sla' doesn't exist` na home do gerente | Banco sem as tabelas de plano de SLA | Use o banco completo do `database-scripts` |
| `401` em todas as rotas | Token ausente, expirado ou `JWT_SECRET` diferente do que assinou o token | Faça login de novo e confira `JWT_SECRET` e `JWT_EXPIRES` |
| `403 Não permitido` | Rota exclusiva de gerente chamada por outro perfil | Use um usuário com o perfil correto |
| `Variável S3_BUCKET não configurada` | `S3_BUCKET` ausente no `.env` | Defina o bucket |
| Erro de credenciais ou `ExpiredToken` ao ler o S3 | Credenciais da AWS ausentes ou expiradas (AWS Academy) | Renove as credenciais e reinicie o servidor |
| Convite de gerente devolve o token na resposta | `java-spring-email` fora do ar em `localhost:3333` | Suba o serviço de e-mail ou entregue o token manualmente |
| Convite de analista responde `502` | `java-spring-email` fora do ar | Suba o serviço de e-mail e tente de novo |
| `{"res":"já existe um super admin"}` | O super admin já foi criado | Faça login com ele |
| Container sobe, mas a porta não responde | `APP_HOST=localhost` dentro do Docker | Use `APP_HOST=0.0.0.0` |

---

## 13. Limitações conhecidas e melhorias

**Segurança**

- **A senha vai para o log no login:** o `autenticar` imprime no console a senha recebida (e o resultado do `bcrypt.compare`). Remova esses `console.log`.
- **Todos os resultados de consultas vão para o log:** a função `executar` imprime cada resultado no console, o que expõe dados e deixa o log enorme.
- **`POST /usuarios/cadastrar_super` é público:** protegido só pela checagem de que o super admin ainda não existe, com e-mail fixo (`admin@cisco.com`). Em um servidor novo, quem chegar primeiro cria o super admin.
- **`cors()` liberado para qualquer origem.**
- **Senhas e segredos em arquivos `.env`:** confira se nenhum `.env` com valores reais foi parar em zip, imagem Docker ou repositório; se foi, troque as senhas e o `JWT_SECRET`.

**Funcionamento**

- **Banco sem pool de conexões:** `database/config.js` abre e fecha uma conexão por consulta.
- **Endereço do serviço de e-mail fixo:** `http://localhost:3333` está escrito nos controllers de usuário e de funcionário.
- **Script de tabelas desatualizado** em relação ao código (seção 7).
- **Ambiente escolhido editando o `app.js`:** não há variável externa para trocar entre produção e desenvolvimento.
- **Rotas duplicadas:** as previsões respondem em `/previsoes` e em `/maria`.
- **Nomes de rota por pessoa:** `/lucas`, `/joao`, `/pedro`, `/thabata` e `/relatorioAlerta` não descrevem o conteúdo. O site já depende de `/lucas/equipamento/:id`, então renomear exige mudar o front junto.
- **Checagem de perfil espalhada:** cada controller confere o `role` por conta própria, sem um middleware único.
- **Sem testes automatizados:** o `package.json` não tem script de teste.
- **README do template:** o `package.json` ainda traz a descrição do projeto de referência da faculdade e `path` como dependência (módulo nativo do Node).

**Ideias de evolução**

- Remover os `console.log` sensíveis e usar um logger com níveis.
- Usar `mysql2.createPool` na conexão com o banco.
- Mover o endereço do serviço de e-mail e o ambiente (`producao`/`desenvolvimento`) para variáveis de ambiente.
- Criar um middleware `exigirPerfil("gerente")` e usá-lo nas rotas.
- Restringir o CORS à origem do site e proteger ou remover o `cadastrar_super` depois do primeiro uso.
- Manter o `script-tabelas.sql` em sincronia com o `database-scripts`.

---

## 14. Repositórios relacionados

| Repositório | Papel |
|---|---|
| [site-institucional](https://github.com/Grupo-9-Projeto/site-institucional) | Front-end, consome esta API |
| [monitoring-scripts](https://github.com/Grupo-9-Projeto/monitoring-scripts) | Coleta as métricas (`captura.py`) e roda o ETL (raw → trusted → client) |
| [java-jira](https://github.com/Grupo-9-Projeto/java-jira) | Lê as métricas, grava alertas na tabela `alerta` e abre chamados no Jira |
| [java-spring-email](https://github.com/Grupo-9-Projeto/java-spring-email) | Envia o e-mail com o token de acesso e cria o usuário pendente |
| `database-scripts` | Scripts SQL do banco `argos_db` (DDL, DML e modelagem) |
