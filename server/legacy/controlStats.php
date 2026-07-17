<?php
require_once __DIR__ . '/../helpers/db.php';
require_once __DIR__ . '/../helpers/request.php';
require_once __DIR__ . '/../config/response.php';

$mysqli = getDB();

$raw = file_get_contents('php://input');
$body = json_decode($raw, true);
$input = is_array($body) ? $body : [];

$year      = trim((string)($input['year'] ?? $_GET['year'] ?? ''));
$asignacion= trim((string)($input['asignacion'] ?? $_GET['asignacion'] ?? ''));
$nivel     = trim((string)($input['nivel'] ?? $_GET['nivel'] ?? ''));
$numero    = trim((string)($input['numero'] ?? $_GET['numero'] ?? ''));

$where = "eg.activo = 'S'";
$params = [];
$types = '';

if ($year !== '') {
    $where .= " AND eg.year = ?";
    $params[] = $year;
    $types .= 's';
}
if ($asignacion !== '') {
    $where .= " AND eg.asignacion = ?";
    $params[] = $asignacion;
    $types .= 's';
}
if ($nivel !== '') {
    $where .= " AND eg.nivel = ?";
    $params[] = $nivel;
    $types .= 's';
}
if ($numero !== '') {
    $where .= " AND eg.numero = ?";
    $params[] = $numero;
    $types .= 's';
}

function fetchCounts($mysqli, $sql, $params, $types) {
    $stmt = $mysqli->prepare($sql);
    if (!$stmt) return [];
    if ($types) $stmt->bind_param($types, ...$params);
    $stmt->execute();
    $r = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
    $stmt->close();
    return $r;
}

function fetchRow($mysqli, $sql, $params, $types) {
    if (!$sql) return null;
    $stmt = $mysqli->prepare($sql);
    if (!$stmt) return null;
    if ($types) $stmt->bind_param($types, ...$params);
    $stmt->execute();
    $r = $stmt->get_result()->fetch_assoc();
    $stmt->close();
    return $r;
}

$total = 0;
$totalRow = fetchRow($mysqli, "SELECT COUNT(*) AS c FROM estugrupos eg WHERE $where", $params, $types);
if ($totalRow) $total = (int)$totalRow['c'];

$porGenero = [];
$gp = fetchCounts($mysqli, "SELECT eg.genero, COUNT(*) AS count FROM estugrupos eg WHERE $where GROUP BY eg.genero", $params, $types);
foreach ($gp as $r) {
    $porGenero[$r['genero']] = (int)$r['count'];
}

$porNivel = fetchCounts($mysqli, "SELECT eg.nivel, COUNT(*) AS count FROM estugrupos eg WHERE $where GROUP BY eg.nivel ORDER BY eg.nivel", $params, $types);
foreach ($porNivel as &$n) $n['count'] = (int)$n['count'];
unset($n);

$porSede = [];
$sp = fetchCounts($mysqli, "SELECT s.sede, COUNT(*) AS count FROM estugrupos eg JOIN sedes s ON eg.asignacion = s.ind WHERE $where GROUP BY s.sede ORDER BY count DESC", $params, $types);
foreach ($sp as &$s) $s['count'] = (int)$s['count'];
unset($s);
$porSede = $sp;

$notaWhere = $where;
$notaParams = $params;
$notaTypes = $types;

$avgSql = "SELECT AVG(n.valoracion) AS avg_val
FROM estugrupos eg
JOIN notas n ON eg.estudiante = n.estudiante AND n.year = COALESCE(NULLIF(?, ''), YEAR(CURDATE()))
WHERE $notaWhere
GROUP BY eg.estudiante";

array_unshift($notaParams, $year !== '' ? $year : '');
$notaTypes = 's' . $notaTypes;

$rangoRow = fetchRow($mysqli, "SELECT
    COALESCE(SUM(CASE WHEN avg_val >= 1 AND avg_val < 3 THEN 1 ELSE 0 END), 0) AS r1,
    COALESCE(SUM(CASE WHEN avg_val >= 3 AND avg_val < 4 THEN 1 ELSE 0 END), 0) AS r2,
    COALESCE(SUM(CASE WHEN avg_val >= 4 AND avg_val < 4.5 THEN 1 ELSE 0 END), 0) AS r3,
    COALESCE(SUM(CASE WHEN avg_val >= 4.5 AND avg_val <= 5 THEN 1 ELSE 0 END), 0) AS r4
FROM ($avgSql) sub", $notaParams, $notaTypes);

$porRangoNota = $rangoRow ? [
    'r1' => (int)$rangoRow['r1'],
    'r2' => (int)$rangoRow['r2'],
    'r3' => (int)$rangoRow['r3'],
    'r4' => (int)$rangoRow['r4'],
] : null;

$estadisticas = fetchRow($mysqli, "SELECT
    COUNT(*) AS total,
    ROUND(AVG(n.valoracion), 4) AS promedio_nota,
    ROUND(MIN(n.valoracion), 2) AS min_nota,
    ROUND(MAX(n.valoracion), 2) AS max_nota
FROM estugrupos eg
JOIN notas n ON eg.estudiante = n.estudiante AND n.year = COALESCE(NULLIF(?, ''), YEAR(CURDATE()))
WHERE $notaWhere", $notaParams, $notaTypes);

echo json_encode([
    'success' => true,
    'data' => [
        'total' => $total,
        'por_genero' => $porGenero,
        'por_nivel' => $porNivel,
        'por_sede' => $porSede,
        'por_rango_nota' => $porRangoNota,
        'estadisticas' => $estadisticas,
    ],
]);
