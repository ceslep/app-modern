<?php
require_once __DIR__ . '/config/dotenv.php';
require_once __DIR__ . '/config/app.php';
require_once __DIR__ . '/helpers/db.php';
require_once __DIR__ . '/helpers/request.php';

set_include_path(
    LEGACY_PATH . PATH_SEPARATOR .
    get_include_path()
);

if (APP_DEBUG) {
    error_reporting(E_ALL);
    ini_set('display_errors', '0');
} else {
    error_reporting(0);
    ini_set('display_errors', '0');
}

set_error_handler(function ($severity, $message, $file, $line) {
    if (!(error_reporting() & $severity)) {
        return false;
    }
    $errMsg = APP_DEBUG
        ? "PHP $severity: $message in $file:$line"
        : 'Internal server error';
    http_response_code(500);
    if (!headers_sent()) {
        header('Content-Type: application/json');
    }
    echo json_encode(['error' => $errMsg]);
    exit;
});