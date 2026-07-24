<?php
/**
 * Shim for /dev/status — mirrors the modern API at /api.php/v1/dev/status.
 * Required because the legacy router has no mapping for `dev/*` routes.
 * bootstrap.php is loaded by router.php before this file is required,
 * so APP_DEBUG and friends are already defined. We need the Database class
 * AND the db_config.php constants (DB_HOST, DB_NAME).
 */
require_once __DIR__ . '/../config/database.php';

// Force the Database singleton to instantiate — this is what triggers
// the require_once of db_config.php inside the constructor, which defines
// DB_HOST / DB_NAME / DB_USER / DB_PASS / DB_MODE.
Database::getInstance();

header('Content-Type: application/json; charset=utf-8');

echo json_encode([
    'success' => true,
    'data' => [
        'debug'        => defined('APP_DEBUG') ? APP_DEBUG : false,
        'mode'         => Database::getMode(),
        'default_mode' => Database::getModeDefault(),
        'overridden'   => Database::isModeOverridden(),
        'host'         => defined('DB_HOST') ? DB_HOST : 'unknown',
        'name'         => defined('DB_NAME') ? DB_NAME : 'unknown',
    ],
]);
