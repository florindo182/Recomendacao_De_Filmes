# CINEMAX — Sistema de Recomendação de Filmes
## Documento Técnico · v1.0

---

## 1. Visão Geral e Funcionalidades

O **CINEMAX** é uma plataforma web de recomendação de filmes desenvolvida com arquitectura cliente-servidor desacoplada. As funcionalidades implementadas são:

**Autenticação e Gestão de Utilizadores**
Registo com validação de email e password segura (bcrypt, custo 12). Login com sessão PHP persistente (cookie httpOnly). Recuperação de password via token com expiração de 1 hora. Guard Angular que protege rotas privadas.

**Catálogo de Filmes (CRUD completo)**
Listagem paginada (12 por página) com filtros por género, pesquisa por título/sinopse e ordenação por classificação, ano ou título. Criação, edição e eliminação de filmes com validação no backend. Importação automática via TMDB API (título, poster, sinopse, duração, géneros).

**Sistema de Avaliações e Recomendações**
Avaliação de 1 a 10 estrelas com comentário opcional. Algoritmo de recomendação baseado em collaborative filtering simplificado: analisa os géneros com média ≥ 7 nas avaliações do utilizador e sugere filmes ainda não vistos nesses géneros, ordenados por classificação TMDB. Sem histórico, apresenta os mais populares.

**Favoritos e Exportação**
Adição/remoção de favoritos com toggle. Exportação da lista de favoritos em CSV com BOM UTF-8 (compatível com Excel), incluindo título, ano, género, classificação TMDB, nota pessoal e comentário.

**Interface e Experiência**
Alternância entre modo claro e escuro, com preferência persistida em `localStorage` e respeito pelo `prefers-color-scheme`. Suporte a dois idiomas (Português e Inglês) via `@ngx-translate`. Design responsivo com grid CSS adaptativo (mobile 2 colunas, desktop até 7 colunas).

---

## 2. Decisões Técnicas

### 2.1 Por que PHP Puro (sem framework)?

A escolha de PHP puro com PDO justifica-se pela compatibilidade directa com XAMPP (ambiente académico/desenvolvimento local) e pelo controlo total sobre o ciclo de vida dos pedidos sem dependências externas. O padrão Singleton na classe `Database` garante uma única conexão PDO por pedido, evitando sobrecarga. Os endpoints são organizados por acção (`?action=`), evitando a necessidade de mod_rewrite complexo.

### 2.2 Por que Angular 18?

Angular oferece um sistema de módulos, injecção de dependências e signals reactivos que tornam o estado da aplicação previsível. A arquitectura standalone components (sem NgModule) reduz o boilerplate. O lazy loading de componentes (`loadComponent`) melhora o tempo de carregamento inicial. Os signals (`signal<T>`) substituem BehaviorSubject para estado simples, reduzindo código reactivo.

### 2.3 Por que SQL Relacional (MySQL/MariaDB)?

A natureza dos dados (utilizadores, filmes, avaliações) é inerentemente relacional. As Foreign Keys garantem integridade referencial em cascata (ex: apagar utilizador remove as suas avaliações). Os índices nas colunas de pesquisa frequente (email, genero_id, classificacao) garantem queries rápidas mesmo com crescimento da base de dados.

### 2.4 Integração TMDB

A API TMDB é consumida directamente pelo backend PHP via `file_get_contents` com contexto HTTP. O backend actua como proxy, evitando exposição da API key no frontend e respeitando a política CORS da TMDB. Os dados importados são normalizados para a estrutura local (género mapeado por correspondência de nome).

---

## 3. Arquitectura e Separação de Responsabilidades

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (Angular 18)                      │
│  ┌──────────────┐  ┌───────────────┐  ┌──────────────────┐  │
│  │  Components  │  │   Services    │  │   i18n / Theme   │  │
│  │  (UI puro)   │←─│ AuthService   │  │ TranslateService │  │
│  │  movie-card  │  │ MovieService  │  │ ThemeService     │  │
│  │  catalogo    │  │ ThemeService  │  │ localStorage     │  │
│  └──────┬───────┘  └──────┬────────┘  └──────────────────┘  │
│         │                 │ HTTP + Credentials               │
└─────────┼─────────────────┼───────────────────────────────── ┘
          │                 │
┌─────────┼─────────────────┼───────────────────────────────── ┐
│         ▼                 ▼    BACKEND (PHP Puro)             │
│  ┌─────────────────────────────┐  ┌───────────────────────┐  │
│  │   Endpoints (Controllers)   │  │   TMDB API (externa)  │  │
│  │   auth.php  / filmes.php    │──│   file_get_contents   │  │
│  └──────────────┬──────────────┘  └───────────────────────┘  │
│                 │                                             │
│  ┌──────────────▼──────────────┐                             │
│  │    Database (Singleton PDO) │                             │
│  │    config/Database.php      │                             │
│  └──────────────┬──────────────┘                             │
└─────────────────┼──────────────────────────────────────────── ┘
                  │
┌─────────────────▼──────────────────────────────────────────── ┐
│              BASE DE DADOS (MySQL/MariaDB)                     │
│   utilizadores · generos · filmes · avaliacoes · favoritos    │
└────────────────────────────────────────────────────────────── ┘
```

**Camada de Dados** (`Database.php`): responsável exclusivamente pela conexão PDO e por expor métodos query/execute tipados. Sem lógica de negócio.

**Camada de Negócio** (funções em `auth.php` / `filmes.php`): validação de inputs, regras de negócio (ex: nota entre 1-10, token com expiração), algoritmo de recomendação, lógica de exportação CSV.

**Camada de Apresentação** (Angular): os Services comunicam com o backend e gerem estado reactivo; os Components consomem os Services e renderizam UI sem lógica de negócio.

---

## 4. Estrutura de Ficheiros

```
cinemax/
├── sql/
│   └── schema.sql                  ← Script completo BD
├── backend/
│   ├── .htaccess                   ← Segurança e CORS
│   ├── auth.php                    ← Endpoint autenticação
│   ├── filmes.php                  ← Endpoint filmes + TMDB
│   └── config/
│       ├── Database.php            ← Classe PDO Singleton
│       └── helpers.php             ← CORS, sessão, utilidades
└── frontend/                       ← Projecto Angular 18
    ├── package.json
    ├── proxy.conf.json             ← Proxy para XAMPP
    └── src/
        ├── styles.scss             ← CSS global + temas
        ├── assets/i18n/
        │   ├── pt.json             ← Traduções PT
        │   └── en.json             ← Traduções EN
        └── app/
            ├── app.config.ts       ← Providers (HTTP, i18n)
            ├── app.routes.ts       ← Rotas com lazy load
            ├── app.component.ts    ← Navbar + shell
            ├── services/
            │   ├── auth.service.ts
            │   ├── movie.service.ts
            │   └── theme.service.ts
            ├── components/
            │   └── movie-card/     ← Componente reutilizável
            └── pages/
                ├── auth/           ← Login/Registo
                ├── catalogo/       ← Grid + filtros
                ├── favoritos/      ← Tabela + CSV
                └── recomendacoes/  ← Grid personalizado
```

---

## 5. Instalação e Configuração (XAMPP)

**Pré-requisitos:** XAMPP com Apache + MySQL activos; Node.js ≥ 18; Angular CLI (`npm install -g @angular/cli`).

**Backend:**
1. Copiar pasta `cinemax/` para `C:\xampp\htdocs\`
2. Abrir phpMyAdmin → importar `sql/schema.sql`
3. Verificar credenciais em `backend/config/Database.php` (por defeito: root, sem password)
4. Substituir `'SUA_TMDB_API_KEY'` em `filmes.php` pela chave obtida em themoviedb.org

**Frontend:**
```bash
cd cinemax/frontend
npm install
ng serve            # http://localhost:4200
```

O Angular comunica com o PHP em `http://localhost/cinemax/backend` via CORS configurado em `helpers.php`. As cookies de sessão são enviadas com `withCredentials: true`.
