<?php
/**
 * dev/apply_config_porcentajes.php
 * Crea la tabla config_porcentajes_notas y siembra la fila default del año actual.
 * Lee credenciales del .env (DB_HOST_LOCAL, DB_NAME_LOCAL, DB_USER_LOCAL, DB_PASS_LOCAL).
 */
declare(strict_types=1);
mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

$envPath = dirname(__DIR__) . '/.env';
$cfg = ['host' => 'localhost', 'name' => 'occi', 'user' => 'root', 'pass' => ''];
if (file_exists($envPath)) {
    foreach (file($envPath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
        $line = trim($line);
        if ($line === '' || $line[0] === '#') continue;
        [$k, $v] = explode('=', $line, 2);
        $k = trim($k); $v = trim($v);
        if ($k === 'DB_HOST_LOCAL') $cfg['host'] = $v;
        if ($k === 'DB_NAME_LOCAL') $cfg['name'] = $v;
        if ($k === 'DB_USER_LOCAL') $cfg['user'] = $v;
        if ($k === 'DB_PASS_LOCAL') $cfg['pass'] = $v;
    }
}

$sqlPath = __DIR__ . '/add_config_porcentajes.sql';
$sql = file_get_contents($sqlPath);
if ($sql === false) {
    fwrite(STDERR, "No se pudo leer $sqlPath\n");
    exit(1);
}

$log = [];
$ok  = function (string $m) use (&$log) { $log[] = "✓ $m"; };
$err = function (string $m) use (&$log) { $log[] = "✗ $m"; };

try {
    $db = new mysqli($cfg['host'], $cfg['user'], $cfg['pass'], $cfg['name']);
    $db->set_charset('utf8');
    $ok("Conectado a {$cfg['host']}/{$cfg['name']}");

    $db->multi_query($sql);
    while ($db->more_results() && $db->next_result()) {
        $r = $db->store_result();
        if ($r instanceof mysqli_result) $r->free();
    }
    $ok("SQL ejecutado (CREATE TABLE + INSERT IGNORE)");

    $exists = (bool) $db->query("SHOW TABLES LIKE 'config_porcentajes_notas'")->num_rows;
    $ok("Tabla config_porcentajes_notas existe: " . ($exists ? 'sí' : 'NO'));

    if ($exists) {
        $rows = $db->query("SELECT * FROM config_porcentajes_notas")->fetch_all(MYSQLI_ASSOC);
        $log[] = "  → Filas: " . json_encode($rows, JSON_UNESCAPED_UNICODE);
    }

    $db->close();
} catch (mysqli_sql_exception $e) {
    $err("Error: " . $e->getMessage());
}

echo implode(PHP_EOL, $log) . PHP_EOL;
