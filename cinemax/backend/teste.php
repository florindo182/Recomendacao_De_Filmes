<?php
// Ficheiro de diagnóstico — apagar depois de testar
require_once __DIR__ . '/config/helpers.php';
require_once __DIR__ . '/config/Database.php';

$db = Database::getInstance();
$filmes = $db->query('SELECT id, titulo, ano FROM filmes LIMIT 5');
$utilizadores = $db->query('SELECT id, nome, email FROM utilizadores LIMIT 3');

echo json_encode([
  'status'       => 'Backend OK',
  'php_version'  => PHP_VERSION,
  'filmes'       => $filmes,
  'utilizadores' => $utilizadores,
], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
