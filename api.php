<?php
/**
 * API Entry Point - /api.php
 * Direct access without .htaccess rewrite
 */
require_once __DIR__ . '/server/config/dotenv.php';
require_once __DIR__ . '/server/routes/api.php';
