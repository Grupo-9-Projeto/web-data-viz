CREATE DATABASE IF NOT EXISTS argos_db;
USE argos_db;

CREATE TABLE empresa_cliente (
    id_empresa INT PRIMARY KEY NOT NULL AUTO_INCREMENT,
    nome_fantasia VARCHAR(100) NOT NULL,
    cnpj VARCHAR(18) NOT NULL UNIQUE,
    criacao TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE usuario (
    id_usuario INT PRIMARY KEY NOT NULL AUTO_INCREMENT,
    gestor_id INT,
    nome VARCHAR(250) NOT NULL,
    email VARCHAR(250) NOT NULL UNIQUE,
    senha_hash VARCHAR(250),
    cargo VARCHAR(200) DEFAULT 'analista',
    ativo TINYINT(1) NOT NULL DEFAULT TRUE,
    token VARCHAR(100),
    criacao TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fk_empresa_fornecedora INT NOT NULL,
    

    CONSTRAINT fk_usuario_gestor
        FOREIGN KEY (gestor_id)
        REFERENCES usuario(id_usuario),
        
	constraint fk_usuario_empresa_fornecedora
		foreign key (fk_empresa_fornecedora)
        references empresa_fornecedora(id_empresa_fornecedora),

    INDEX fk_usuario_gestor_idx (gestor_id)
);

CREATE TABLE usuario_empresa (
    usuario_id INT NOT NULL,
    empresa_id INT NOT NULL,
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (usuario_id, empresa_id),

    CONSTRAINT fk_usuario_empresa_usuario
        FOREIGN KEY (usuario_id)
        REFERENCES usuario(id_usuario),

    CONSTRAINT fk_usuario_empresa_empresa
        FOREIGN KEY (empresa_id)
        REFERENCES empresa_cliente(id_empresa),

    INDEX fk_usuario_empresa_empresa_idx (empresa_id)
);

CREATE TABLE empresa_fornecedora(
	id_empresa_fornecedora INT PRIMARY KEY NOT NULL,
    nome_fantasia VARCHAR(100) NOT NULL,
    cnpj VARCHAR(18) NOT NULL UNIQUE,
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE categoria (
    id_categoria INT PRIMARY KEY NOT NULL AUTO_INCREMENT,
    nome VARCHAR(250) NOT NULL UNIQUE,
    criacao TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE modelo (
    id_modelo INT PRIMARY KEY NOT NULL AUTO_INCREMENT,
    categoria_id INT NOT NULL,
    nome_modelo VARCHAR(120) NOT NULL UNIQUE,
    sku VARCHAR(100) UNIQUE,
    criacao TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_modelo_categoria
        FOREIGN KEY (categoria_id)
        REFERENCES categoria(id_categoria),

    INDEX fk_modelo_categoria_idx (categoria_id)
);

CREATE TABLE dispositivo (
    id_dispositivo INT PRIMARY KEY NOT NULL AUTO_INCREMENT,
    empresa_id INT NOT NULL,
    modelo_id INT NOT NULL,
    ip VARCHAR(100) NOT NULL,
    endereco_mac VARCHAR(100) NOT NULL UNIQUE,
    numero_serie VARCHAR(100) NOT NULL,
    status_dispositivo VARCHAR(50) NOT NULL DEFAULT 'ativo',
    criacao TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_dispositivo_empresa
        FOREIGN KEY (empresa_id)
        REFERENCES empresa_cliente(id_empresa),

    CONSTRAINT fk_dispositivo_modelo
        FOREIGN KEY (modelo_id)
        REFERENCES modelo(id_modelo),

    INDEX fk_dispositivo_empresa_idx (empresa_id),
    INDEX fk_dispositivo_modelo_idx (modelo_id)
);

CREATE TABLE tipo_componente (
    id_tipo INT PRIMARY KEY NOT NULL AUTO_INCREMENT,
    nome VARCHAR(100) NOT NULL UNIQUE,
    unidade_medida VARCHAR(50),
    criacao TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE componente (
    id_componente INT PRIMARY KEY NOT NULL AUTO_INCREMENT,
    dispositivo_id INT NOT NULL,
    tipo_id INT,
    nome_identificador VARCHAR(250) NOT NULL,
    capacidade DECIMAL(10,2),
    limiar_atencao DECIMAL(10,2),
    limiar_alto DECIMAL(10,2),
    limiar_critico DECIMAL(10,2),
    ativo TINYINT(1) NOT NULL DEFAULT TRUE,
    criacao TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_componente_dispositivo
        FOREIGN KEY (dispositivo_id)
        REFERENCES dispositivo(id_dispositivo),

    CONSTRAINT fk_componente_tipo
        FOREIGN KEY (tipo_id)
        REFERENCES tipo_componente(id_tipo),

    INDEX fk_componente_dispositivo_idx (dispositivo_id),
    INDEX fk_componente_tipo_idx (tipo_id)
);

CREATE TABLE Contrato_SLA (
    idContrato_SLA INT PRIMARY KEY NOT NULL AUTO_INCREMENT,
    nivel_SLA VARCHAR(45) NOT NULL,
    limite_resposta VARCHAR(45) NOT NULL,
    status_sla VARCHAR(45) NOT NULL,
    fkEmpresa INT NOT NULL,

    CONSTRAINT fk_contrato_sla_empresa
        FOREIGN KEY (fkEmpresa)
        REFERENCES empresa_cliente(id_empresa),

    INDEX fk_contrato_sla_empresa_idx (fkEmpresa)
);


CREATE TABLE Alerta (
    idAlerta INT PRIMARY KEY NOT NULL AUTO_INCREMENT,
    registrado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    nivel_alerta VARCHAR(45) NOT NULL,
    fkComponente INT NOT NULL,

    CONSTRAINT fk_alerta_componente
        FOREIGN KEY (fkComponente)
        REFERENCES componente(id_componente),

    INDEX fk_alerta_componente_idx (fkComponente)
);

CREATE TABLE indisponibilidade (
    idindisponibilidade INT PRIMARY KEY NOT NULL AUTO_INCREMENT,
    inicio_indisp TIMESTAMP NOT NULL,
    fim_indisp TIMESTAMP NULL,
    fk_dispositivo INT NOT NULL,

    CONSTRAINT fk_indisponibilidade_dispositivo
        FOREIGN KEY (fk_dispositivo)
        REFERENCES dispositivo(id_dispositivo),

    INDEX fk_indisponibilidade_dispositivo_idx (fk_dispositivo)
);
