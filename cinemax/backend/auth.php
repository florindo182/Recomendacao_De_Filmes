<?php
// backend/auth.php
// Endpoint: Login | Registo | Recuperação de senha | Logout

require_once __DIR__ . '/config/helpers.php';
require_once __DIR__ . '/config/Database.php';

$db     = Database::getInstance();
$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

match ($action) {
    'register'       => handleRegister($db),
    'login'          => handleLogin($db),
    'logout'         => handleLogout(),
    'me'             => handleMe($db),
    'forgot-password'=> handleForgotPassword($db),
    'reset-password' => handleResetPassword($db),
    default          => jsonResponse(false, 'Acção inválida.', [], 400),
};

// ── Registo ───────────────────────────────────────────────────
function handleRegister(Database $db): void {
    $body  = getJsonBody();
    $nome  = trim($body['nome']  ?? '');
    $email = trim($body['email'] ?? '');
    $pass  = $body['password']   ?? '';

    if (!$nome || !$email || !$pass) {
        jsonResponse(false, 'Todos os campos são obrigatórios.', [], 422);
    }
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        jsonResponse(false, 'Email inválido.', [], 422);
    }
    if (strlen($pass) < 8) {
        jsonResponse(false, 'A password deve ter pelo menos 8 caracteres.', [], 422);
    }

    $exists = $db->queryOne('SELECT id FROM utilizadores WHERE email = ?', [$email]);
    if ($exists) {
        jsonResponse(false, 'Email já registado.', [], 409);
    }

    $hash = password_hash($pass, PASSWORD_BCRYPT, ['cost' => 12]);
    $db->execute(
        'INSERT INTO utilizadores (nome, email, password_hash) VALUES (?, ?, ?)',
        [$nome, $email, $hash]
    );
    $id = $db->lastInsertId();

    $_SESSION['utilizador_id'] = $id;
    $_SESSION['nome']          = $nome;

    jsonResponse(true, 'Conta criada com sucesso.', ['id' => $id, 'nome' => $nome, 'email' => $email]);
}

// ── Login ─────────────────────────────────────────────────────
function handleLogin(Database $db): void {
    $body  = getJsonBody();
    $email = trim($body['email']    ?? '');
    $pass  = $body['password'] ?? '';

    if (!$email || !$pass) {
        jsonResponse(false, 'Email e password são obrigatórios.', [], 422);
    }

    $user = $db->queryOne(
        'SELECT id, nome, email, password_hash, ativo FROM utilizadores WHERE email = ?',
        [$email]
    );

    if (!$user || !password_verify($pass, $user['password_hash'])) {
        jsonResponse(false, 'Credenciais inválidas.', [], 401);
    }
    if (!$user['ativo']) {
        jsonResponse(false, 'Conta desactivada.', [], 403);
    }

    $_SESSION['utilizador_id'] = $user['id'];
    $_SESSION['nome']          = $user['nome'];

    jsonResponse(true, 'Login efectuado.', [
        'id'    => $user['id'],
        'nome'  => $user['nome'],
        'email' => $user['email'],
    ]);
}

// ── Logout ────────────────────────────────────────────────────
function handleLogout(): void {
    session_destroy();
    jsonResponse(true, 'Sessão terminada.');
}

// ── Dados do utilizador autenticado ──────────────────────────
function handleMe(Database $db): void {
    $id   = requireAuth();
    $user = $db->queryOne('SELECT id, nome, email, foto_perfil, criado_em FROM utilizadores WHERE id = ?', [$id]);
    jsonResponse(true, 'OK', $user ?? []);
}

// ── Esqueci a password ────────────────────────────────────────
function handleForgotPassword(Database $db): void {
    $body  = getJsonBody();
    $email = trim($body['email'] ?? '');

    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        jsonResponse(false, 'Email inválido.', [], 422);
    }

    $user = $db->queryOne('SELECT id FROM utilizadores WHERE email = ?', [$email]);
    // Responde sempre OK para não revelar emails existentes
    if (!$user) {
        jsonResponse(true, 'Se o email existir, receberá as instruções.');
    }

    $token  = bin2hex(random_bytes(32));
    $expiry = date('Y-m-d H:i:s', strtotime('+1 hour'));

    $db->execute(
        'UPDATE utilizadores SET reset_token = ?, reset_expiry = ? WHERE id = ?',
        [$token, $expiry, $user['id']]
    );

    // Em produção: enviar email com link contendo o token
    // mail($email, 'Recuperação de senha', "Link: http://localhost/reset?token=$token");

    jsonResponse(true, 'Instruções enviadas para o email.', ['token_dev' => $token]);
}

// ── Reset de password ─────────────────────────────────────────
function handleResetPassword(Database $db): void {
    $body    = getJsonBody();
    $token   = $body['token']    ?? '';
    $newPass = $body['password'] ?? '';

    if (!$token || strlen($newPass) < 8) {
        jsonResponse(false, 'Token e nova password são obrigatórios.', [], 422);
    }

    $user = $db->queryOne(
        'SELECT id FROM utilizadores WHERE reset_token = ? AND reset_expiry > NOW()',
        [$token]
    );

    if (!$user) {
        jsonResponse(false, 'Token inválido ou expirado.', [], 400);
    }

    $hash = password_hash($newPass, PASSWORD_BCRYPT, ['cost' => 12]);
    $db->execute(
        'UPDATE utilizadores SET password_hash = ?, reset_token = NULL, reset_expiry = NULL WHERE id = ?',
        [$hash, $user['id']]
    );

    jsonResponse(true, 'Password alterada com sucesso.');
}
