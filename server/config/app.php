<?php
define('APP_MODERN_ROOT', dirname(__DIR__, 2));
define('LEGACY_PATH', __DIR__ . '/../legacy');
define('APP_ENV', getenv('APP_ENV') ?: 'production');
define('APP_DEBUG', (getenv('APP_DEBUG') ?: 'false') === 'true');