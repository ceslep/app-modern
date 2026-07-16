<?php
/**
 * Shim for /dev/db-mode — mirrors the modern API at /api.php/v1/dev/db-mode.
 * Accepts POST { "mode": "local" | "cloud" | "default" } and updates the
 * `db_mode_override` cookie (the modern dev controller reads it on each request).
 */
require_once __DIR__ . '/../config/database.php';

header('Content-Type: application/json; charset=utf-8');

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Método no permitido']);
    exit;
}

$body = json_decode(file_get_contents('php://input') ?: '{}') ?: new stdClass();
$mode = strtolower((string) ($body->mode ?? ''));

if (!in_array($mode, ['local', 'cloud', 'default'], true)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Modo inválido. Use: local, cloud o default']);
    exit;
}

if ($mode === 'default') {
    setcookie('db_mode_override', '', [
        'expires'  => time() - 3600,
        'path'     => '/',
        'httponly' => false,
        'samesite' => 'Lax',
    ]);
} else {
    setcookie('db_mode_override', $mode, [
        'expires'  => time() + 86400 * 30,
        'path'     => '/',
        'httponly' => false,
        'samesite' => 'Lax',
    ]);
}

Database::reset();

echo json_encode([
    'success' => true,
    'data' => [
        'mode'         => $mode === 'default' ? Database::getModeDefault() : $mode,
        'default_mode' => Database::getModeDefault(),
        'overridden'   => $mode !== 'default' && $mode !== Database::getModeDefault(),
    ],
    'message' => 'Modo actualizado. Recargue la página para aplicar.',
]);
