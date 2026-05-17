<?php

require_once __DIR__ . '/config/helpers.php';
require_once __DIR__ . '/config/Database.php';

$db = Database::getInstance();
$action = $_GET['action'] ?? 'stats';

ensureUserRoleColumn($db);
requireAdmin($db);

match ($action) {
    'stats' => adminStats($db),
    'users' => adminUsers($db),
    'update-user' => adminUpdateUser($db),
    'delete-user' => adminDeleteUser($db),
    default => jsonResponse(false, 'Acao invalida.', [], 400),
};

function requireAdmin(Database $db): int {
    $id = requireAuth();
    $user = $db->queryOne('SELECT papel, ativo FROM utilizadores WHERE id = ?', [$id]);
    if (!$user || !$user['ativo'] || ($user['papel'] ?? 'user') !== 'admin') {
        jsonResponse(false, 'Acesso reservado ao administrador.', [], 403);
    }
    return $id;
}

function adminStats(Database $db): void {
    $summary = [
        'users' => (int) ($db->queryOne('SELECT COUNT(*) AS total FROM utilizadores')['total'] ?? 0),
        'activeUsers' => (int) ($db->queryOne('SELECT COUNT(*) AS total FROM utilizadores WHERE ativo = 1')['total'] ?? 0),
        'admins' => (int) ($db->queryOne("SELECT COUNT(*) AS total FROM utilizadores WHERE papel = 'admin'")['total'] ?? 0),
        'movies' => (int) ($db->queryOne('SELECT COUNT(*) AS total FROM filmes')['total'] ?? 0),
        'favorites' => (int) ($db->queryOne('SELECT COUNT(*) AS total FROM favoritos')['total'] ?? 0),
        'ratings' => (int) ($db->queryOne('SELECT COUNT(*) AS total FROM avaliacoes')['total'] ?? 0),
        'averageRating' => round((float) ($db->queryOne('SELECT COALESCE(AVG(nota), 0) AS media FROM avaliacoes')['media'] ?? 0), 1),
    ];

    $recentUsers = $db->query(
        "SELECT id, nome, email, papel AS role, ativo, criado_em
         FROM utilizadores
         ORDER BY criado_em DESC
         LIMIT 6"
    );

    $topGenres = $db->query(
        "SELECT g.nome, COUNT(f.id) AS total
         FROM generos g
         JOIN filmes f ON f.genero_id = g.id
         GROUP BY g.id, g.nome
         ORDER BY total DESC, g.nome ASC
         LIMIT 6"
    );

    jsonResponse(true, 'OK', [
        'summary' => $summary,
        'recentUsers' => $recentUsers,
        'topGenres' => $topGenres,
    ]);
}

function adminUsers(Database $db): void {
    $search = trim($_GET['search'] ?? '');
    $where = '1=1';
    $params = [];

    if ($search !== '') {
        $where = '(u.nome LIKE ? OR u.email LIKE ?)';
        $params = ["%$search%", "%$search%"];
    }

    $users = $db->query(
        "SELECT u.id, u.nome, u.email, u.papel AS role, u.ativo, u.criado_em,
                COUNT(DISTINCT f.id) AS favoritos,
                COUNT(DISTINCT a.id) AS avaliacoes
         FROM utilizadores u
         LEFT JOIN favoritos f ON f.utilizador_id = u.id
         LEFT JOIN avaliacoes a ON a.utilizador_id = u.id
         WHERE $where
         GROUP BY u.id
         ORDER BY u.criado_em DESC",
        $params
    );

    jsonResponse(true, 'OK', $users);
}

function adminUpdateUser(Database $db): void {
    $currentAdminId = (int) $_SESSION['utilizador_id'];
    $body = getJsonBody();
    $id = (int) ($body['id'] ?? 0);
    $ativo = isset($body['ativo']) ? (int) (bool) $body['ativo'] : null;
    $role = $body['role'] ?? null;

    if (!$id) {
        jsonResponse(false, 'Utilizador invalido.', [], 422);
    }

    if ($id === $currentAdminId && ($ativo === 0 || $role === 'user')) {
        jsonResponse(false, 'Nao pode remover o seu proprio acesso de administrador.', [], 422);
    }

    $updates = [];
    $params = [];
    if ($ativo !== null) {
        $updates[] = 'ativo = ?';
        $params[] = $ativo;
    }
    if ($role !== null) {
        if (!in_array($role, ['user', 'admin'], true)) {
            jsonResponse(false, 'Papel invalido.', [], 422);
        }
        $updates[] = 'papel = ?';
        $params[] = $role;
    }

    if (!$updates) {
        jsonResponse(false, 'Nada para actualizar.', [], 422);
    }

    $params[] = $id;
    $db->execute('UPDATE utilizadores SET ' . implode(', ', $updates) . ' WHERE id = ?', $params);
    jsonResponse(true, 'Utilizador actualizado.');
}

function adminDeleteUser(Database $db): void {
    $currentAdminId = (int) $_SESSION['utilizador_id'];
    $id = (int) ($_GET['id'] ?? 0);
    if (!$id) {
        jsonResponse(false, 'Utilizador invalido.', [], 422);
    }
    if ($id === $currentAdminId) {
        jsonResponse(false, 'Nao pode eliminar a sua propria conta.', [], 422);
    }
    $db->execute('DELETE FROM utilizadores WHERE id = ?', [$id]);
    jsonResponse(true, 'Utilizador eliminado.');
}

function ensureUserRoleColumn(Database $db): void {
    $column = $db->queryOne("SHOW COLUMNS FROM utilizadores LIKE 'papel'");
    if (!$column) {
        $db->execute("ALTER TABLE utilizadores ADD papel ENUM('user','admin') NOT NULL DEFAULT 'user' AFTER password_hash");
    }

    $admin = $db->queryOne("SELECT id FROM utilizadores WHERE papel = 'admin' LIMIT 1");
    if (!$admin) {
        $first = $db->queryOne('SELECT id FROM utilizadores ORDER BY id ASC LIMIT 1');
        if ($first) {
            $db->execute("UPDATE utilizadores SET papel = 'admin' WHERE id = ?", [$first['id']]);
        }
    }
}
