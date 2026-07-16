<?php
/**
 * dev/fix_estadonotas.php
 * Reconstruye la tabla estadoNotas (dañada en local).
 * Estrategias en orden: DROP, RENAME+drop, crear nueva, insertar default.
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

$log = [];
$ok  = function (string $m) use (&$log) { $log[] = "✓ $m"; };
$err = function (string $m) use (&$log) { $log[] = "✗ $m"; };

try {
    $db = new mysqli($cfg['host'], $cfg['user'], $cfg['pass'], $cfg['name']);
    $db->set_charset('utf8');
    $ok("Conectado a {$cfg['host']}/{$cfg['name']}");

    $exists = (bool) $db->query("SHOW TABLES LIKE 'estadoNotas'")->num_rows;
    if (!$exists) {
        $ok("La tabla estadoNotas NO existe — sólo se creará");
    } else {
        $ok("Tabla estadoNotas existe. Intentando eliminar…");

        $db->query("SET FOREIGN_KEY_CHECKS=0");

        // 1) DROP directo
        try { $db->query("DROP TABLE estadoNotas"); $ok("DROP TABLE directo OK"); }
        catch (mysqli_sql_exception $e) {
            $err("DROP directo falló: " . $e->getMessage());

            // 2) RENAME a nombre temporal y luego DROP
            $tmpName = '__estadoNotas_broken_' . time();
            try {
                $db->query("RENAME TABLE estadoNotas TO $tmpName");
                $ok("RENAME a $tmpName OK");
                try { $db->query("DROP TABLE $tmpName"); $ok("DROP de $tmpName OK"); }
                catch (mysqli_sql_exception $e2) { $err("DROP de $tmpName falló: " . $e2->getMessage()); }
            } catch (mysqli_sql_exception $e1) {
                $err("RENAME falló: " . $e1->getMessage());

                // 3) Forzar rebuild InnoDB
                try { $db->query("ALTER TABLE estadoNotas ENGINE=InnoDB"); $ok("ALTER ENGINE InnoDB OK — reintento DROP…"); }
                catch (mysqli_sql_exception $e2) { $err("ALTER ENGINE falló: " . $e2->getMessage()); }

                try { $db->query("DROP TABLE estadoNotas"); $ok("DROP (post-rebuild) OK"); }
                catch (mysqli_sql_exception $e2) { $err("DROP post-rebuild falló: " . $e2->getMessage()); }
            }
        }
    }

    // Verificar que ya no exista
    $stillExists = (bool) $db->query("SHOW TABLES LIKE 'estadoNotas'")->num_rows;
    if ($stillExists) {
        $err("No se pudo eliminar la tabla. Intervención manual requerida.");
    } else {
        $ok("Tabla eliminada (o nunca existió). Creando nueva…");

        $db->query("
            CREATE TABLE `estadoNotas` (
              `ind` int(1) NOT NULL AUTO_INCREMENT,
              `estado` int(1) NOT NULL,
              PRIMARY KEY (`ind`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci
        ");
        $ok("CREATE TABLE estadoNotas OK");

        $db->query("INSERT INTO `estadoNotas` (`ind`, `estado`) VALUES (1, 1)");
        $ok("INSERT default (1, 1) OK");

        $verify = $db->query("SELECT * FROM estadoNotas")->fetch_assoc();
        $log[] = "  → Verificación: " . json_encode($verify, JSON_UNESCAPED_UNICODE);
    }

    $db->query("SET FOREIGN_KEY_CHECKS=1");
    $db->close();
} catch (mysqli_sql_exception $e) {
    $err("Error fatal: " . $e->getMessage());
}

echo implode(PHP_EOL, $log) . PHP_EOL;
