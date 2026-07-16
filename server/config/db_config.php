<?php

if (!getenv('DB_MODE') && file_exists(dirname(__DIR__, 2) . '/.env')) {
    $lines = file(dirname(__DIR__, 2) . '/.env', FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        $line = trim($line);
        if ($line === '' || str_starts_with($line, '#')) continue;
        [$key, $val] = explode('=', $line, 2);
        putenv(trim($key) . '=' . trim($val));
    }
}

$envMode = strtolower((string) (getenv('DB_MODE') ?: 'local'));

$cookieMode = isset($_COOKIE['db_mode_override']) ? strtolower((string) $_COOKIE['db_mode_override']) : '';
$cookieValid = in_array($cookieMode, ['local', 'cloud'], true);

$appDebug = (getenv('APP_DEBUG') ?: 'false') === 'true';
$mode = ($appDebug && $cookieValid) ? $cookieMode : $envMode;

if ($mode === 'cloud') {
    define('DB_HOST', getenv('DB_HOST_CLOUD') ?: '');
    define('DB_NAME', getenv('DB_NAME_CLOUD') ?: '');
    define('DB_USER', getenv('DB_USER_CLOUD') ?: '');
    define('DB_PASS', getenv('DB_PASS_CLOUD') ?: '');
} else {
    define('DB_HOST', getenv('DB_HOST_LOCAL') ?: 'localhost');
    define('DB_NAME', getenv('DB_NAME_LOCAL') ?: 'occi');
    define('DB_USER', getenv('DB_USER_LOCAL') ?: 'root');
    define('DB_PASS', getenv('DB_PASS_LOCAL') ?: '');
}

define('DB_PORT', getenv('DB_PORT') ?: '3306');
define('DB_MODE', $mode);
define('DB_MODE_DEFAULT', $envMode);
define('DB_MODE_OVERRIDDEN', $appDebug && $cookieValid && $cookieMode !== $envMode);
