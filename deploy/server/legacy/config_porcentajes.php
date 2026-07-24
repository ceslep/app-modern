<?php
/**
 * Legacy wrapper para /config/porcentajes.
 * Delega al ConfigPorcentajesController moderno.
 *
 * Llamado por: /server/router.php?__api=config/porcentajes
 */
declare(strict_types=1);

require_once __DIR__ . '/../../server/config/app.php';
require_once __DIR__ . '/../../server/config/database.php';
require_once __DIR__ . '/../../server/config/response.php';
require_once __DIR__ . '/../../server/config/auth.php';
require_once __DIR__ . '/../controllers/ConfigPorcentajesController.php';

set_exception_handler(function (Throwable $e) {
    if (!headers_sent()) {
        http_response_code(500);
        header('Content-Type: application/json; charset=utf-8');
    }
    error_log('[config_porcentajes legacy] ' . $e->getMessage() . ' @ ' . $e->getFile() . ':' . $e->getLine());
    $msg = APP_DEBUG
        ? $e->getMessage() . ' @ ' . $e->getFile() . ':' . $e->getLine()
        : 'Internal server error';
    echo json_encode(['success' => false, 'error' => $msg]);
    exit;
});

set_error_handler(function ($severity, $message, $file, $line) {
    if (!(error_reporting() & $severity)) return false;
    if (!headers_sent()) {
        http_response_code(500);
        header('Content-Type: application/json; charset=utf-8');
    }
    error_log("[config_porcentajes legacy] $message @ $file:$line");
    $debug = defined('APP_DEBUG') ? APP_DEBUG : (getenv('APP_DEBUG') === 'true');
    $msg = $debug ? "$message @ $file:$line" : 'Internal server error';
    echo json_encode(['success' => false, 'error' => $msg]);
    exit;
});

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$action = $_GET['__action'] ?? null;

if ($action === 'grant-access') {
    (new ConfigPorcentajesController())->handle('grant-access', $method);
    exit;
}

(new ConfigPorcentajesController())->handle('porcentajes', $method);
