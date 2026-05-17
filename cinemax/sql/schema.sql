-- =============================================================
-- CINEMAX - Sistema de Recomendação de Filmes
-- Script SQL - Base de Dados Relacional
-- Compatible: MySQL 5.7+ / MariaDB 10.3+ (XAMPP)
-- =============================================================

CREATE DATABASE IF NOT EXISTS cinemax CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE cinemax;

-- -------------------------------------------------------------
-- Tabela: utilizadores
-- Armazena dados de autenticação e perfil
-- -------------------------------------------------------------
CREATE TABLE utilizadores (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    nome            VARCHAR(100)        NOT NULL,
    email           VARCHAR(180)        NOT NULL UNIQUE,
    password_hash   VARCHAR(255)        NOT NULL,
    papel           ENUM('user','admin') NOT NULL DEFAULT 'user',
    foto_perfil     VARCHAR(500)        NULL,
    reset_token     VARCHAR(100)        NULL,
    reset_expiry    DATETIME            NULL,
    ativo           TINYINT(1)          NOT NULL DEFAULT 1,
    criado_em       DATETIME            NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em   DATETIME            NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_reset_token (reset_token)
) ENGINE=InnoDB;

-- -------------------------------------------------------------
-- Tabela: generos
-- Lookup de géneros de filmes
-- -------------------------------------------------------------
CREATE TABLE generos (
    id    INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    nome  VARCHAR(80) NOT NULL UNIQUE
) ENGINE=InnoDB;

INSERT INTO generos (nome) VALUES
    ('Ação'), ('Aventura'), ('Animação'), ('Comédia'),
    ('Crime'), ('Documentário'), ('Drama'), ('Fantasia'),
    ('Terror'), ('Mistério'), ('Romance'), ('Ficção Científica'),
    ('Thriller'), ('Guerra'), ('Musical');

-- -------------------------------------------------------------
-- Tabela: filmes
-- Catálogo local + dados enriquecidos via TMDB
-- -------------------------------------------------------------
CREATE TABLE filmes (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    tmdb_id         INT UNSIGNED        NULL UNIQUE COMMENT 'ID na TMDB API',
    titulo          VARCHAR(255)        NOT NULL,
    titulo_original VARCHAR(255)        NULL,
    sinopse         TEXT                NULL,
    ano             YEAR                NOT NULL,
    duracao_min     SMALLINT UNSIGNED   NULL,
    poster_url      VARCHAR(500)        NULL,
    backdrop_url    VARCHAR(500)        NULL,
    classificacao   DECIMAL(3,1)        NULL COMMENT 'Nota média TMDB 0-10',
    genero_id       INT UNSIGNED        NOT NULL,
    lingua_original CHAR(5)             NOT NULL DEFAULT 'pt',
    trailer_url     VARCHAR(500)        NULL,
    criado_em       DATETIME            NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em   DATETIME            NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_filmes_genero
        FOREIGN KEY (genero_id) REFERENCES generos(id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    INDEX idx_titulo (titulo),
    INDEX idx_ano (ano),
    INDEX idx_genero (genero_id),
    INDEX idx_classificacao (classificacao)
) ENGINE=InnoDB;

-- -------------------------------------------------------------
-- Tabela: avaliacoes
-- Liga utilizador ↔ filme com nota e comentário
-- -------------------------------------------------------------
CREATE TABLE avaliacoes (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    utilizador_id   INT UNSIGNED        NOT NULL,
    filme_id        INT UNSIGNED        NOT NULL,
    nota            TINYINT UNSIGNED    NOT NULL COMMENT '1 a 10',
    comentario      TEXT                NULL,
    criado_em       DATETIME            NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em   DATETIME            NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT uq_avaliacao UNIQUE (utilizador_id, filme_id),
    CONSTRAINT fk_aval_utilizador
        FOREIGN KEY (utilizador_id) REFERENCES utilizadores(id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_aval_filme
        FOREIGN KEY (filme_id) REFERENCES filmes(id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT chk_nota CHECK (nota BETWEEN 1 AND 10),
    INDEX idx_aval_utilizador (utilizador_id),
    INDEX idx_aval_filme (filme_id)
) ENGINE=InnoDB;

-- -------------------------------------------------------------
-- Tabela: favoritos
-- Lista de filmes favoritos por utilizador
-- -------------------------------------------------------------
CREATE TABLE favoritos (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    utilizador_id   INT UNSIGNED        NOT NULL,
    filme_id        INT UNSIGNED        NOT NULL,
    criado_em       DATETIME            NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_favorito UNIQUE (utilizador_id, filme_id),
    CONSTRAINT fk_fav_utilizador
        FOREIGN KEY (utilizador_id) REFERENCES utilizadores(id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_fav_filme
        FOREIGN KEY (filme_id) REFERENCES filmes(id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    INDEX idx_fav_utilizador (utilizador_id)
) ENGINE=InnoDB;

-- -------------------------------------------------------------
-- Dados de exemplo
-- -------------------------------------------------------------
INSERT INTO filmes (tmdb_id, titulo, titulo_original, sinopse, ano, duracao_min, classificacao, genero_id, lingua_original) VALUES
(27205,  'A Origem',      'Inception',       'Um ladrão que rouba segredos corporativos através da tecnologia de partilha de sonhos.', 2010, 148, 8.8, 12, 'en'),
(157336, 'Interestelar',  'Interstellar',    'Uma equipa de exploradores viaja através de um buraco de minhoca no espaço.',           2014, 169, 8.6, 12, 'en'),
(11,     'Guerra das Estrelas', 'Star Wars', 'A Força Desperta numa galáxia muito, muito distante.',                                 1977, 121, 8.6, 1,  'en'),
(550,    'Clube de Combate', 'Fight Club',   'Um trabalhador insatisfeito forma um clube de combate subterrâneo.',                    1999, 139, 8.8, 5,  'en'),
(238,    'O Padrinho',    'The Godfather',   'O envelhecido patriarca de uma dinastia do crime organizado transfere o controlo.', 1972, 175, 9.2, 5,  'en');

-- Utilizador de demonstração (password: Demo@1234)
INSERT INTO utilizadores (nome, email, password_hash, papel) VALUES
('Utilizador Demo', 'demo@cinemax.ao',
 '$2y$12$xYzDemoHashPlaceholder123456789012345678901234567890', 'admin');

-- Avaliações de exemplo
INSERT INTO avaliacoes (utilizador_id, filme_id, nota, comentario) VALUES
(1, 1, 9,  'Obra-prima de Nolan. Argumento incrível!'),
(1, 2, 10, 'Visualmente deslumbrante. Banda sonora épica.'),
(1, 3, 8,  'Clássico atemporal.');

INSERT INTO favoritos (utilizador_id, filme_id) VALUES (1,1),(1,2),(1,5);
