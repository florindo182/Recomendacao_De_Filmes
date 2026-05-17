<?php

require_once __DIR__ . '/config/helpers.php';
require_once __DIR__ . '/config/Database.php';

$tmdbConfig = require __DIR__ . '/config/tmdb.php';
$db = Database::getInstance();
$action = $_GET['action'] ?? 'list';

match ($action) {
    'list' => listFilmes($db, $tmdbConfig),
    'get' => getFilme($db, $tmdbConfig),
    'create' => createFilme($db),
    'update' => updateFilme($db),
    'delete' => deleteFilme($db),
    'tmdb-search' => tmdbSearch($tmdbConfig),
    'tmdb-import' => tmdbImport($db, $tmdbConfig),
    'avaliar' => avaliarFilme($db),
    'favoritos' => handleFavoritos($db),
    'toggle-fav' => toggleFavorito($db, $tmdbConfig),
    'recomendar' => recomendar($db, $tmdbConfig),
    default => jsonResponse(false, 'Acao invalida.', [], 400),
};

function listFilmes(Database $db, array $tmdbConfig): void
{
    if (($_GET['source'] ?? '') === 'tmdb') {
        listTmdbFilmes($tmdbConfig);
        return;
    }

    $page = max(1, (int) ($_GET['page'] ?? 1));
    $limit = min(50, max(1, (int) ($_GET['limit'] ?? 12)));
    $offset = ($page - 1) * $limit;
    $genero = $_GET['genero'] ?? '';
    $search = trim($_GET['search'] ?? '');
    $orderBy = in_array($_GET['order'] ?? '', ['classificacao', 'ano', 'titulo']) ? $_GET['order'] : 'classificacao';
    $orderDirection = $orderBy === 'titulo' ? 'ASC' : 'DESC';

    $where = ['1=1'];
    $params = [];

    if ($genero) {
        $where[] = 'f.genero_id = ?';
        $params[] = $genero;
    }

    if ($search) {
        $where[] = '(f.titulo LIKE ? OR f.sinopse LIKE ?)';
        $params[] = "%$search%";
        $params[] = "%$search%";
    }

    $whereStr = implode(' AND ', $where);
    $total = $db->queryOne("SELECT COUNT(*) as total FROM filmes f WHERE $whereStr", $params)['total'];

    $filmes = $db->query(
        "SELECT f.*, g.nome AS genero_nome,
                COALESCE(AVG(a.nota),0) AS media_notas,
                COUNT(a.id) AS total_avaliacoes
         FROM filmes f
         JOIN generos g ON g.id = f.genero_id
         LEFT JOIN avaliacoes a ON a.filme_id = f.id
         WHERE $whereStr
         GROUP BY f.id
         ORDER BY $orderBy $orderDirection
         LIMIT $limit OFFSET $offset",
        $params
    );

    jsonResponse(true, 'OK', [
        'filmes' => $filmes,
        'total' => (int) $total,
        'page' => $page,
        'totalPages' => (int) ceil($total / $limit),
    ]);
}

function listTmdbFilmes(array $config): void
{
    $page = max(1, (int) ($_GET['page'] ?? 1));
    $limit = min(20, max(1, (int) ($_GET['limit'] ?? 12)));
    $genero = $_GET['genero'] ?? '';
    $search = trim($_GET['search'] ?? '');
    $orderBy = $_GET['order'] ?? 'classificacao';

    $params = [
        'language' => tmdbLanguage($config),
        'page' => $page,
        'include_adult' => 'false',
    ];

    $endpoint = '/discover/movie';
    if ($search) {
        $endpoint = '/search/movie';
        $params['query'] = $search;
    } else {
        $params['sort_by'] = match ($orderBy) {
            'ano' => 'primary_release_date.desc',
            'titulo' => 'title.asc',
            default => 'vote_average.desc',
        };

        if ($orderBy === 'classificacao') {
            $params['vote_count.gte'] = 200;
        }

        $tmdbGenre = localGenreToTmdb((int) $genero);
        if ($tmdbGenre) {
            $params['with_genres'] = $tmdbGenre;
        }
    }

    $data = tmdbRequest($config, $endpoint, $params);
    $results = $data['results'] ?? [];
    if ($search && $genero) {
        $tmdbGenre = localGenreToTmdb((int) $genero);
        if ($tmdbGenre) {
            $results = array_values(array_filter($results, fn($movie) => in_array($tmdbGenre, $movie['genre_ids'] ?? [], true)));
        }
    }
    $results = array_slice($results, 0, $limit);
    $results = fillMissingOverviews($config, $results);
    $filmes = array_map('mapTmdbMovie', $results);
    $totalPages = min(500, (int) ($data['total_pages'] ?? 1));

    jsonResponse(true, 'OK', [
        'filmes' => $filmes,
        'total' => (int) ($data['total_results'] ?? count($filmes)),
        'page' => $page,
        'totalPages' => max(1, $totalPages),
    ]);
}

function getFilme(Database $db, array $tmdbConfig): void
{
    $id = (int) ($_GET['id'] ?? 0);
    if (!$id) {
        jsonResponse(false, 'ID invalido.', [], 400);
    }

    $filme = $db->queryOne(
        "SELECT f.*, g.nome AS genero_nome,
                COALESCE(AVG(a.nota),0) AS media_notas,
                COUNT(a.id) AS total_avaliacoes
         FROM filmes f
         JOIN generos g ON g.id = f.genero_id
         LEFT JOIN avaliacoes a ON a.filme_id = f.id
         WHERE f.id = ? OR f.tmdb_id = ?
         GROUP BY f.id",
        [$id, $id]
    );

    if (!$filme) {
        $tmdbMovie = tmdbMovieDetails($tmdbConfig, $id);
        jsonResponse(true, 'OK', ['filme' => mapTmdbMovie($tmdbMovie, true), 'avaliacoes' => []]);
    }

    $avaliacoes = $db->query(
        "SELECT a.nota, a.comentario, a.criado_em, u.nome AS utilizador_nome
         FROM avaliacoes a JOIN utilizadores u ON u.id = a.utilizador_id
         WHERE a.filme_id = ? ORDER BY a.criado_em DESC LIMIT 20",
        [$id]
    );

    jsonResponse(true, 'OK', ['filme' => $filme, 'avaliacoes' => $avaliacoes]);
}

function localGenreToTmdb(int $generoId): int
{
    $map = [
        1 => 28,
        2 => 12,
        3 => 16,
        4 => 35,
        5 => 80,
        7 => 18,
        9 => 27,
        12 => 878,
        13 => 53,
    ];

    return $map[$generoId] ?? 0;
}

function mapTmdbMovie(array $movie, bool $detail = false): array
{
    $releaseDate = $movie['release_date'] ?? '';
    $genres = $movie['genres'] ?? [];
    $genreIds = $movie['genre_ids'] ?? [];

    return [
        'id' => (int) ($movie['id'] ?? 0),
        'tmdb_id' => (int) ($movie['id'] ?? 0),
        'titulo' => $movie['title'] ?? $movie['name'] ?? $movie['original_title'] ?? 'Sem titulo',
        'titulo_original' => $movie['original_title'] ?? null,
        'sinopse' => $movie['overview'] ?? '',
        'ano' => $releaseDate ? (int) substr($releaseDate, 0, 4) : 0,
        'duracao_min' => $movie['runtime'] ?? null,
        'poster_url' => $movie['poster_path'] ?? null,
        'backdrop_url' => $movie['backdrop_path'] ?? null,
        'classificacao' => $movie['vote_average'] ?? null,
        'genero_id' => (int) ($genreIds[0] ?? 0),
        'genero_nome' => $genres[0]['name'] ?? tmdbGenreName((int) ($genreIds[0] ?? 0)),
        'media_notas' => $movie['vote_average'] ?? null,
        'total_avaliacoes' => $movie['vote_count'] ?? 0,
        'trailer_url' => null,
        'origem' => $detail ? 'tmdb' : 'api',
    ];
}

function tmdbMovieDetails(array $config, int $tmdbId): array
{
    $movie = tmdbRequest($config, "/movie/$tmdbId", ['language' => tmdbLanguage($config)]);
    if (empty($movie['overview'])) {
        $fallback = tmdbRequest($config, "/movie/$tmdbId", ['language' => 'en-US']);
        if (!empty($fallback['overview'])) {
            $movie['overview'] = $fallback['overview'];
        }
    }

    return $movie;
}

function fillMissingOverviews(array $config, array $movies): array
{
    foreach ($movies as $idx => $movie) {
        if (!empty($movie['overview']) || empty($movie['id'])) {
            continue;
        }

        $fallback = tmdbRequest($config, '/movie/' . (int) $movie['id'], ['language' => 'en-US']);
        if (!empty($fallback['overview'])) {
            $movies[$idx]['overview'] = $fallback['overview'];
        }
    }

    return $movies;
}

function tmdbGenreName(int $genreId): string
{
    $genres = [
        12 => 'Aventura',
        14 => 'Fantasia',
        16 => 'Animacao',
        18 => 'Drama',
        27 => 'Terror',
        28 => 'Acao',
        35 => 'Comedia',
        53 => 'Thriller',
        80 => 'Crime',
        878 => 'Ficcao Cientifica',
    ];

    return $genres[$genreId] ?? 'Filme';
}

function createFilme(Database $db): void
{
    requireAuth();
    $b = getJsonBody();

    foreach (['titulo', 'ano', 'genero_id'] as $field) {
        if (empty($b[$field])) {
            jsonResponse(false, "Campo '$field' e obrigatorio.", [], 422);
        }
    }

    $db->execute(
        "INSERT INTO filmes (tmdb_id, titulo, titulo_original, sinopse, ano, duracao_min, poster_url, backdrop_url, classificacao, genero_id, lingua_original, trailer_url)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
        [
            $b['tmdb_id'] ?? null,
            $b['titulo'],
            $b['titulo_original'] ?? null,
            $b['sinopse'] ?? null,
            $b['ano'],
            $b['duracao_min'] ?? null,
            $b['poster_url'] ?? null,
            $b['backdrop_url'] ?? null,
            $b['classificacao'] ?? null,
            $b['genero_id'],
            $b['lingua_original'] ?? 'pt',
            $b['trailer_url'] ?? null,
        ]
    );

    jsonResponse(true, 'Filme criado.', ['id' => $db->lastInsertId()], 201);
}

function updateFilme(Database $db): void
{
    requireAuth();
    $id = (int) ($_GET['id'] ?? 0);
    if (!$id) {
        jsonResponse(false, 'ID invalido.', [], 400);
    }

    $b = getJsonBody();
    $fields = ['titulo', 'titulo_original', 'sinopse', 'ano', 'duracao_min', 'poster_url', 'classificacao', 'genero_id', 'trailer_url'];
    $set = [];
    $params = [];

    foreach ($fields as $field) {
        if (array_key_exists($field, $b)) {
            $set[] = "$field = ?";
            $params[] = $b[$field];
        }
    }

    if (!$set) {
        jsonResponse(false, 'Nenhum campo para actualizar.', [], 422);
    }

    $params[] = $id;
    $db->execute('UPDATE filmes SET ' . implode(', ', $set) . ' WHERE id = ?', $params);
    jsonResponse(true, 'Filme actualizado.');
}

function deleteFilme(Database $db): void
{
    requireAuth();
    $id = (int) ($_GET['id'] ?? 0);
    if (!$id) {
        jsonResponse(false, 'ID invalido.', [], 400);
    }

    $rows = $db->execute('DELETE FROM filmes WHERE id = ?', [$id]);
    if (!$rows) {
        jsonResponse(false, 'Filme nao encontrado.', [], 404);
    }

    jsonResponse(true, 'Filme eliminado.');
}

function tmdbSearch(array $config): void
{
    $query = trim($_GET['q'] ?? '');
    if (!$query) {
        jsonResponse(false, 'Parametro de pesquisa em falta.', [], 400);
    }

    $data = tmdbRequest($config, '/search/movie', [
        'query' => $query,
        'language' => tmdbLanguage($config),
        'page' => max(1, (int) ($_GET['page'] ?? 1)),
        'include_adult' => 'false',
    ]);

    jsonResponse(true, 'OK', $data['results'] ?? []);
}

function tmdbImport(Database $db, array $config): void
{
    requireAuth();
    $tmdbId = (int) (getJsonBody()['tmdb_id'] ?? 0);
    if (!$tmdbId) {
        jsonResponse(false, 'tmdb_id em falta.', [], 400);
    }

    $exists = $db->queryOne('SELECT id FROM filmes WHERE tmdb_id = ?', [$tmdbId]);
    if ($exists) {
        jsonResponse(true, 'Ja importado.', ['id' => $exists['id']]);
    }

    $id = ensureTmdbMovie($db, $config, $tmdbId);
    jsonResponse(true, 'Filme importado.', ['id' => $id], 201);
}

function tmdbLanguage(array $config): string
{
    $lang = $_GET['lang'] ?? $config['default_language'];
    return preg_match('/^[a-z]{2}-[A-Z]{2}$/', $lang) ? $lang : $config['default_language'];
}

function tmdbRequest(array $config, string $path, array $params = []): array
{
    $params['api_key'] = $config['api_key'];
    $url = rtrim($config['base_url'], '/') . $path . '?' . http_build_query($params);

    if (function_exists('curl_init')) {
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 15,
            CURLOPT_HTTPHEADER => ['Accept: application/json'],
        ]);
        $res = curl_exec($ch);
        $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
    } else {
        $context = stream_context_create([
            'http' => [
                'timeout' => 15,
                'header' => "Accept: application/json\r\n",
            ],
        ]);
        $res = @file_get_contents($url, false, $context);
        $status = isset($http_response_header[0]) && preg_match('/\s(\d{3})\s/', $http_response_header[0], $match)
            ? (int) $match[1]
            : 0;
    }

    if ($res === false || $status >= 400) {
        jsonResponse(false, 'Erro ao contactar TMDB.', ['status' => $status], 502);
    }

    $data = json_decode($res, true);
    if (!is_array($data)) {
        jsonResponse(false, 'Resposta invalida da TMDB.', [], 502);
    }

    return $data;
}

function avaliarFilme(Database $db): void
{
    $userId = requireAuth();
    $b = getJsonBody();
    $filmeId = (int) ($b['filme_id'] ?? 0);
    $nota = (int) ($b['nota'] ?? 0);

    if (!$filmeId || $nota < 1 || $nota > 10) {
        jsonResponse(false, 'filme_id e nota (1-10) sao obrigatorios.', [], 422);
    }

    $db->execute(
        "INSERT INTO avaliacoes (utilizador_id, filme_id, nota, comentario)
         VALUES (?,?,?,?)
         ON DUPLICATE KEY UPDATE nota = VALUES(nota), comentario = VALUES(comentario), atualizado_em = NOW()",
        [$userId, $filmeId, $nota, $b['comentario'] ?? null]
    );

    jsonResponse(true, 'Avaliacao guardada.');
}

function handleFavoritos(Database $db): void
{
    $userId = requireAuth();
    $export = $_GET['export'] ?? '';

    $filmes = $db->query(
        "SELECT f.titulo, f.ano, g.nome AS genero, f.classificacao,
                a.nota AS minha_nota, a.comentario, fav.criado_em AS adicionado_em
         FROM favoritos fav
         JOIN filmes f ON f.id = fav.filme_id
         JOIN generos g ON g.id = f.genero_id
         LEFT JOIN avaliacoes a ON a.filme_id = f.id AND a.utilizador_id = fav.utilizador_id
         WHERE fav.utilizador_id = ?
         ORDER BY fav.criado_em DESC",
        [$userId]
    );

    if ($export === 'report') {
        exportFavoritosReport($filmes);
    }

    if ($export === 'pdf') {
        exportFavoritosPdf($filmes);
    }

    if ($export === 'csv') {
        $columns = favoriteReportColumns($filmes);
        header('Content-Type: text/csv; charset=utf-8');
        header('Content-Disposition: attachment; filename="favoritos_cinemax.csv"');
        $out = fopen('php://output', 'w');
        fprintf($out, chr(0xEF) . chr(0xBB) . chr(0xBF));
        fputcsv($out, array_column($columns, 'label'));
        foreach ($filmes as $f) {
            fputcsv($out, array_map(fn ($col) => $f[$col['key']] ?? '', $columns));
        }
        fclose($out);
        exit;
    }

    jsonResponse(true, 'OK', $filmes);
}

function favoriteReportColumns(array $filmes): array
{
    $columns = [
        ['key' => 'titulo', 'label' => 'Titulo'],
        ['key' => 'ano', 'label' => 'Ano'],
        ['key' => 'genero', 'label' => 'Genero'],
        ['key' => 'classificacao', 'label' => 'TMDB'],
        ['key' => 'minha_nota', 'label' => 'Minha nota'],
        ['key' => 'comentario', 'label' => 'Comentario'],
        ['key' => 'adicionado_em', 'label' => 'Adicionado em'],
    ];

    return array_values(array_filter($columns, function (array $column) use ($filmes): bool {
        if ($column['key'] === 'titulo') {
            return true;
        }

        foreach ($filmes as $filme) {
            $value = $filme[$column['key']] ?? null;
            if ($value !== null && trim((string) $value) !== '') {
                return true;
            }
        }

        return false;
    }));
}

function exportFavoritosReport(array $filmes): void
{
    $columns = favoriteReportColumns($filmes);
    $reportsDir = dirname(__DIR__) . DIRECTORY_SEPARATOR . 'reports';
    if (!is_dir($reportsDir)) {
        mkdir($reportsDir, 0775, true);
    }

    $filename = 'favoritos_' . date('Ymd_His') . '.html';
    $path = $reportsDir . DIRECTORY_SEPARATOR . $filename;
    file_put_contents($path, buildFavoritosReportHtml($filmes, $columns));

    $baseUrl = rtrim(dirname(dirname($_SERVER['SCRIPT_NAME'] ?? '/mvs/cinemax/backend/filmes.php')), '/\\');
    header('Content-Type: text/html; charset=utf-8', true);
    header('Location: ' . $baseUrl . '/reports/' . rawurlencode($filename));
    exit;
}

function exportFavoritosPdf(array $filmes): void
{
    $columns = favoriteReportColumns($filmes);
    $pdf = buildFavoritosPdf($filmes, $columns);

    header('Content-Type: application/pdf');
    header('Content-Disposition: attachment; filename="favoritos_cinemax.pdf"');
    header('Content-Length: ' . strlen($pdf));
    echo $pdf;
    exit;
}

function buildFavoritosPdf(array $filmes, array $columns): string
{
    $width = 842;
    $height = 595;
    $margin = 36;
    $rowHeight = 24;
    $headerHeight = 22;
    $tableWidth = $width - ($margin * 2);
    $colWidths = pdfColumnWidths($columns, $tableWidth);
    $pages = [];
    $rowsPerPage = 14;
    $chunks = array_chunk($filmes, $rowsPerPage);
    if (!$chunks) {
        $chunks = [[]];
    }

    foreach ($chunks as $pageIndex => $chunk) {
        $content = [];
        pdfRect($content, 0, 0, $width, $height, [0.96, 0.96, 0.98]);
        pdfRect($content, 0, $height - 92, $width, 92, [0.05, 0.05, 0.08]);
        pdfRect($content, $margin, $height - 70, 6, 38, [0.90, 0.04, 0.08]);
        pdfText($content, $margin + 18, $height - 48, 'CINEMAX', 10, [0.90, 0.04, 0.08], true);
        pdfText($content, $margin + 18, $height - 69, 'Report de Favoritos', 24, [1, 1, 1], true);
        pdfText($content, $width - 210, $height - 46, 'Gerado em ' . date('d/m/Y H:i'), 10, [0.78, 0.78, 0.86]);
        pdfText($content, $width - 210, $height - 64, count($filmes) . ' filmes na lista', 10, [0.78, 0.78, 0.86]);

        pdfRect($content, $margin, $height - 132, 170, 48, [1, 1, 1]);
        pdfRectStroke($content, $margin, $height - 132, 170, 48, [0.86, 0.86, 0.90]);
        pdfText($content, $margin + 14, $height - 104, (string) count($filmes), 20, [0.05, 0.05, 0.08], true);
        pdfText($content, $margin + 14, $height - 122, 'Total de favoritos', 9, [0.42, 0.42, 0.52]);

        $tableTop = $height - 170;
        pdfRect($content, $margin, $tableTop - $headerHeight, $tableWidth, $headerHeight, [0.08, 0.08, 0.12]);
        $x = $margin;
        foreach ($columns as $i => $column) {
            pdfText($content, $x + 8, $tableTop - 15, strtoupper(pdfAscii($column['label'])), 8, [0.78, 0.76, 1], true);
            if ($i > 0) {
                pdfLine($content, $x, $tableTop - $headerHeight, $x, $tableTop, [0.16, 0.16, 0.23]);
            }
            $x += $colWidths[$i];
        }

        $y = $tableTop - $headerHeight;
        foreach ($chunk as $rowIndex => $filme) {
            $y -= $rowHeight;
            $fill = $rowIndex % 2 === 0 ? [1, 1, 1] : [0.985, 0.985, 0.995];
            pdfRect($content, $margin, $y, $tableWidth, $rowHeight, $fill);
            pdfLine($content, $margin, $y, $margin + $tableWidth, $y, [0.88, 0.88, 0.92]);
            $x = $margin;
            foreach ($columns as $i => $column) {
                $value = pdfFormatCell($filme[$column['key']] ?? '', $column['key']);
                $textColor = $column['key'] === 'titulo' ? [0.05, 0.05, 0.08] : [0.32, 0.32, 0.42];
                pdfText($content, $x + 8, $y + 8, pdfTruncate($value, max(8, (int) (($colWidths[$i] - 16) / 5.1))), 9, $textColor, $column['key'] === 'titulo');
                $x += $colWidths[$i];
            }
        }

        pdfText($content, $width - 90, 24, 'Pagina ' . ($pageIndex + 1) . ' / ' . count($chunks), 8, [0.48, 0.48, 0.56]);
        $pages[] = implode("\n", $content);
    }

    return pdfBuildDocument($pages, $width, $height);
}

function pdfColumnWidths(array $columns, float $tableWidth): array
{
    $count = count($columns);
    if ($count <= 1) {
        return [$tableWidth];
    }

    $titleWidth = min(260, max(190, $tableWidth * 0.32));
    $remaining = $tableWidth - $titleWidth;
    $otherWidth = $remaining / ($count - 1);
    $widths = [];
    foreach ($columns as $column) {
        $widths[] = $column['key'] === 'titulo' ? $titleWidth : $otherWidth;
    }

    return $widths;
}

function pdfFormatCell(mixed $value, string $key): string
{
    if ($value === null) {
        return '';
    }

    if (in_array($key, ['classificacao', 'minha_nota'], true) && is_numeric($value)) {
        return number_format((float) $value, 1, '.', '');
    }

    if ($key === 'adicionado_em' && $value) {
        return date('d/m/Y', strtotime((string) $value));
    }

    return (string) $value;
}

function pdfBuildDocument(array $pageContents, int $width, int $height): string
{
    $objects = [];
    $pageIds = [];
    $fontNormalId = 3;
    $fontBoldId = 4;

    foreach ($pageContents as $content) {
        $contentId = count($objects) + 5;
        $pageId = $contentId + 1;
        $objects[$contentId] = "<< /Length " . strlen($content) . " >>\nstream\n$content\nendstream";
        $objects[$pageId] = "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 $width $height] /Resources << /Font << /F1 $fontNormalId 0 R /F2 $fontBoldId 0 R >> >> /Contents $contentId 0 R >>";
        $pageIds[] = $pageId;
    }

    $kids = implode(' ', array_map(fn ($id) => "$id 0 R", $pageIds));
    $objects[1] = '<< /Type /Catalog /Pages 2 0 R >>';
    $objects[2] = "<< /Type /Pages /Kids [$kids] /Count " . count($pageIds) . " >>";
    $objects[3] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>';
    $objects[4] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>';
    ksort($objects);

    $pdf = "%PDF-1.4\n";
    $offsets = [0];
    foreach ($objects as $id => $object) {
        $offsets[$id] = strlen($pdf);
        $pdf .= "$id 0 obj\n$object\nendobj\n";
    }

    $xref = strlen($pdf);
    $pdf .= "xref\n0 " . (max(array_keys($objects)) + 1) . "\n";
    $pdf .= "0000000000 65535 f \n";
    for ($i = 1; $i <= max(array_keys($objects)); $i++) {
        $pdf .= sprintf("%010d 00000 n \n", $offsets[$i] ?? 0);
    }
    $pdf .= "trailer\n<< /Size " . (max(array_keys($objects)) + 1) . " /Root 1 0 R >>\nstartxref\n$xref\n%%EOF";

    return $pdf;
}

function pdfRect(array &$content, float $x, float $y, float $w, float $h, array $rgb): void
{
    $content[] = sprintf('%.3F %.3F %.3F rg %.2F %.2F %.2F %.2F re f', $rgb[0], $rgb[1], $rgb[2], $x, $y, $w, $h);
}

function pdfRectStroke(array &$content, float $x, float $y, float $w, float $h, array $rgb): void
{
    $content[] = sprintf('%.3F %.3F %.3F RG %.2F %.2F %.2F %.2F re S', $rgb[0], $rgb[1], $rgb[2], $x, $y, $w, $h);
}

function pdfLine(array &$content, float $x1, float $y1, float $x2, float $y2, array $rgb): void
{
    $content[] = sprintf('%.3F %.3F %.3F RG %.2F %.2F m %.2F %.2F l S', $rgb[0], $rgb[1], $rgb[2], $x1, $y1, $x2, $y2);
}

function pdfText(array &$content, float $x, float $y, string $text, int $size, array $rgb, bool $bold = false): void
{
    $font = $bold ? 'F2' : 'F1';
    $content[] = sprintf(
        'BT /%s %d Tf %.3F %.3F %.3F rg %.2F %.2F Td (%s) Tj ET',
        $font,
        $size,
        $rgb[0],
        $rgb[1],
        $rgb[2],
        $x,
        $y,
        pdfEscape(pdfAscii($text))
    );
}

function pdfAscii(string $text): string
{
    $converted = @iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $text);
    return $converted !== false ? $converted : preg_replace('/[^\x20-\x7E]/', '', $text);
}

function pdfEscape(string $text): string
{
    return str_replace(['\\', '(', ')'], ['\\\\', '\\(', '\\)'], $text);
}

function pdfTruncate(string $text, int $maxChars): string
{
    $text = trim($text);
    if (strlen(pdfAscii($text)) <= $maxChars) {
        return $text;
    }

    return substr(pdfAscii($text), 0, max(0, $maxChars - 3)) . '...';
}

function buildFavoritosReportHtml(array $filmes, array $columns): string
{
    $generatedAt = date('d/m/Y H:i');
    $total = count($filmes);
    $rows = '';

    foreach ($filmes as $filme) {
        $cells = '';
        foreach ($columns as $column) {
            $value = htmlspecialchars((string) ($filme[$column['key']] ?? ''), ENT_QUOTES, 'UTF-8');
            $class = $column['key'] === 'titulo' ? ' class="title-cell"' : '';
            if ($column['key'] === 'genero') {
                $value = '<span class="badge">' . $value . '</span>';
            }
            $cells .= "<td$class>$value</td>";
        }
        $rows .= "<tr>$cells</tr>";
    }

    $headers = implode('', array_map(
        fn ($column) => '<th>' . htmlspecialchars($column['label'], ENT_QUOTES, 'UTF-8') . '</th>',
        $columns
    ));

    if (!$rows) {
        $rows = '<tr><td colspan="' . max(1, count($columns)) . '" class="empty">Sem favoritos para apresentar.</td></tr>';
    }

    return <<<HTML
<!doctype html>
<html lang="pt">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Report de Favoritos - Cinemax</title>
  <style>
    :root {
      color-scheme: dark;
      --bg: #08080d;
      --panel: #12121b;
      --line: rgba(255,255,255,.09);
      --text: #f4f4fb;
      --muted: #aaaad0;
      --accent: #e50914;
      --accent-soft: rgba(229,9,20,.14);
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      background: var(--bg);
      color: var(--text);
      font-family: Arial, Helvetica, sans-serif;
      padding: 40px;
    }
    .shell { max-width: 1180px; margin: 0 auto; }
    .header {
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      gap: 24px;
      margin-bottom: 28px;
    }
    .brand { color: var(--accent); font-size: 13px; font-weight: 800; letter-spacing: .16em; text-transform: uppercase; }
    h1 { margin: 8px 0 0; font-size: 34px; letter-spacing: .02em; }
    .meta { color: var(--muted); text-align: right; line-height: 1.6; font-size: 14px; }
    .summary {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 12px;
      margin-bottom: 24px;
    }
    .stat {
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: 10px;
      padding: 16px;
    }
    .stat strong { display: block; font-size: 28px; }
    .stat span { color: var(--muted); font-size: 13px; }
    .table-wrap {
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 24px 70px rgba(0,0,0,.35);
    }
    table { width: 100%; border-collapse: collapse; }
    th {
      text-align: left;
      padding: 16px 18px;
      color: #8f8bd0;
      font-size: 12px;
      letter-spacing: .09em;
      text-transform: uppercase;
      border-bottom: 1px solid var(--line);
    }
    td {
      padding: 16px 18px;
      color: var(--muted);
      border-bottom: 1px solid var(--line);
      font-size: 14px;
    }
    tr:last-child td { border-bottom: 0; }
    .title-cell { color: var(--text); font-weight: 700; }
    .badge {
      display: inline-flex;
      padding: 5px 10px;
      border-radius: 7px;
      color: var(--accent);
      background: var(--accent-soft);
      font-size: 12px;
    }
    .empty { text-align: center; padding: 40px; }
    @media print {
      body { background: #fff; color: #111; padding: 20px; }
      .table-wrap, .stat { box-shadow: none; }
    }
  </style>
</head>
<body>
  <main class="shell">
    <section class="header">
      <div>
        <div class="brand">Cinemax</div>
        <h1>Report de Favoritos</h1>
      </div>
      <div class="meta">
        <div>Gerado em $generatedAt</div>
        <div>$total filmes na lista</div>
      </div>
    </section>

    <section class="summary">
      <div class="stat"><strong>$total</strong><span>Total de favoritos</span></div>
      <div class="stat"><strong>Cinemax</strong><span>Relatorio personalizado</span></div>
    </section>

    <section class="table-wrap">
      <table>
        <thead><tr>$headers</tr></thead>
        <tbody>$rows</tbody>
      </table>
    </section>
  </main>
</body>
</html>
HTML;
}

function toggleFavorito(Database $db, array $tmdbConfig): void
{
    $userId = requireAuth();
    $body = getJsonBody();
    $filmeId = resolveFavoritoFilmeId($db, $tmdbConfig, $body);
    if (!$filmeId) {
        jsonResponse(false, 'filme_id em falta.', [], 400);
    }

    $exists = $db->queryOne(
        'SELECT id FROM favoritos WHERE utilizador_id = ? AND filme_id = ?',
        [$userId, $filmeId]
    );

    if ($exists) {
        $db->execute('DELETE FROM favoritos WHERE utilizador_id = ? AND filme_id = ?', [$userId, $filmeId]);
        jsonResponse(true, 'Removido dos favoritos.', ['favorito' => false, 'filme_id' => $filmeId]);
    }

    $db->execute('INSERT INTO favoritos (utilizador_id, filme_id) VALUES (?,?)', [$userId, $filmeId]);
    jsonResponse(true, 'Adicionado aos favoritos.', ['favorito' => true, 'filme_id' => $filmeId]);
}

function resolveFavoritoFilmeId(Database $db, array $tmdbConfig, array $body): int
{
    $filmeId = (int) ($body['filme_id'] ?? 0);
    $tmdbId = (int) ($body['tmdb_id'] ?? 0);

    if ($tmdbId) {
        return ensureTmdbMovie($db, $tmdbConfig, $tmdbId);
    }

    if ($filmeId) {
        $local = $db->queryOne('SELECT id FROM filmes WHERE id = ?', [$filmeId]);
        if ($local) {
            return (int) $local['id'];
        }

        return ensureTmdbMovie($db, $tmdbConfig, $filmeId);
    }

    return 0;
}

function ensureTmdbMovie(Database $db, array $config, int $tmdbId): int
{
    $exists = $db->queryOne('SELECT id FROM filmes WHERE tmdb_id = ?', [$tmdbId]);
    if ($exists) {
        return (int) $exists['id'];
    }

    $m = tmdbMovieDetails($config, $tmdbId);
    $generoId = localGenreFromTmdbMovie($db, $m);
    $ano = substr($m['release_date'] ?? '', 0, 4);

    $db->execute(
        "INSERT INTO filmes (tmdb_id, titulo, titulo_original, sinopse, ano, duracao_min, poster_url, backdrop_url, classificacao, genero_id, lingua_original)
         VALUES (?,?,?,?,?,?,?,?,?,?,?)",
        [
            $tmdbId,
            $m['title'] ?? $m['original_title'] ?? 'Sem titulo',
            $m['original_title'] ?? null,
            $m['overview'] ?? null,
            $ano ?: 2000,
            $m['runtime'] ?? null,
            $m['poster_path'] ?? null,
            $m['backdrop_path'] ?? null,
            $m['vote_average'] ?? null,
            $generoId,
            $m['original_language'] ?? 'en',
        ]
    );

    return (int) $db->lastInsertId();
}

function localGenreFromTmdbMovie(Database $db, array $movie): int
{
    $tmdbGenreId = (int) ($movie['genres'][0]['id'] ?? 0);
    $localByTmdb = [
        28 => 1,
        12 => 2,
        16 => 3,
        35 => 4,
        80 => 5,
        18 => 7,
        27 => 9,
        878 => 12,
        53 => 13,
    ];

    if (isset($localByTmdb[$tmdbGenreId])) {
        return $localByTmdb[$tmdbGenreId];
    }

    $generos = $db->query('SELECT id, nome FROM generos');
    $tmdbGenre = $movie['genres'][0]['name'] ?? '';
    foreach ($generos as $g) {
        if ($tmdbGenre && (stripos($tmdbGenre, $g['nome']) !== false || stripos($g['nome'], $tmdbGenre) !== false)) {
            return (int) $g['id'];
        }
    }

    return 1;
}

function recomendar(Database $db, array $tmdbConfig): void
{
    $userId = requireAuth();
    $search = trim($_GET['search'] ?? '');
    $limit = min(20, max(1, (int) ($_GET['limit'] ?? 12)));

    if ($search) {
        $data = tmdbRequest($tmdbConfig, '/search/movie', [
            'query' => $search,
            'language' => tmdbLanguage($tmdbConfig),
            'page' => 1,
            'include_adult' => 'false',
        ]);

        $results = fillMissingOverviews($tmdbConfig, array_slice($data['results'] ?? [], 0, $limit));
        if (!empty($results)) {
            jsonResponse(true, 'Recomendados de acordo com a sua pesquisa', array_map('mapTmdbMovie', $results));
        }

        jsonResponse(true, 'Nao encontrei esse termo. Aqui ficam sugestoes populares.', tmdbDiscover($tmdbConfig, [], $limit));
    }

    $preferencias = $db->query(
        "SELECT f.genero_id, AVG(a.nota) AS media
         FROM avaliacoes a JOIN filmes f ON f.id = a.filme_id
         WHERE a.utilizador_id = ?
         GROUP BY f.genero_id HAVING media >= 7
         ORDER BY media DESC LIMIT 3",
        [$userId]
    );

    if (empty($preferencias)) {
        jsonResponse(true, 'Sugestoes populares para comecar', tmdbDiscover($tmdbConfig, [], $limit));
    }

    $generoIds = array_column($preferencias, 'genero_id');
    $tmdbGenreIds = array_values(array_filter(array_map('localGenreToTmdb', array_map('intval', $generoIds))));

    if (empty($tmdbGenreIds)) {
        jsonResponse(true, 'Sugestoes populares para si', tmdbDiscover($tmdbConfig, [], $limit));
    }

    $filmes = tmdbDiscover($tmdbConfig, [
        'with_genres' => implode(',', $tmdbGenreIds),
    ], $limit);

    jsonResponse(true, 'Recomendados de acordo com as suas preferencias', $filmes);
}

function tmdbDiscover(array $config, array $extraParams = [], int $limit = 12): array
{
    $data = tmdbRequest($config, '/discover/movie', array_merge([
        'language' => tmdbLanguage($config),
        'page' => 1,
        'include_adult' => 'false',
        'sort_by' => 'vote_average.desc',
        'vote_count.gte' => 200,
    ], $extraParams));

    $results = fillMissingOverviews($config, array_slice($data['results'] ?? [], 0, $limit));

    return array_map('mapTmdbMovie', $results);
}
