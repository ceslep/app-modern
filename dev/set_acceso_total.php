<?php
/**
 * dev/set_acceso_total.php
 * Otorga o revoca acceso_total='S' a un docente.
 * Uso: php dev/set_acceso_total.php <identificacion> [S|N]
 */
declare(strict_types=1);
mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

$ident = $argv[1] ?? null;
$val   = strtoupper($argv[2] ?? 'S');

if (!$ident || !in_array($val, ['S', 'N'], true)) {
    echo "Uso: php dev/set_acceso_total.php <identificacion> [S|N]\n";
    echo "  S = otorgar acceso total (mostrar config de porcentajes)\n";
    echo "  N = revocar acceso total\n";
    exit(1);
}

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

$db = new mysqli($cfg['host'], $cfg['user'], $cfg['pass'], $cfg['name']);
$db->set_charset('utf8');

$stmt = $db->prepare("SELECT identificacion, nombres, acceso_total FROM docentes WHERE identificacion = ? LIMIT 1");
$stmt->bind_param('s', $ident);
$stmt->execute();
$row = $stmt->get_result()->fetch_assoc();

if (!$row) {
    echo "✗ No se encontró docente con identificacion='$ident'\n";
    exit(1);
}

echo "Antes:  {$row['nombres']} (acceso_total={$row['acceso_total']})\n";

$upd = $db->prepare("UPDATE docentes SET acceso_total = ? WHERE identificacion = ?");
$upd->bind_param('ss', $val, $ident);
$upd->execute();

echo "Ahora:  {$row['nombres']} (acceso_total=$val)\n";
echo $upd->affected_rows > 0 ? "✓ Actualizado\n" : "⚠ Sin cambios\n";
echo "\n→ El usuario debe cerrar sesión y volver a iniciar para que el cambio tome efecto.\n";
