<?php
$envPath = dirname(__DIR__, 2) . '/.env';
if (!file_exists($envPath)) return;

$lines = file($envPath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
foreach ($lines as $line) {
    $line = trim($line);
    if ($line === '' || str_starts_with($line, '#')) continue;
    [$key, $val] = explode('=', $line, 2);
    $key = trim($key);
    $val = trim($val);
    if (preg_match('/^"(.*)"$/', $val, $m)) $val = $m[1];
    putenv("$key=$val");
    $_ENV[$key] = $val;
}
