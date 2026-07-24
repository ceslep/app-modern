<?php
header("Access-Control-Allow-Origin: *");
require_once("datos_conexion.php");

$mysqli = new mysqli($host, $user, $pass, $database);
if ($mysqli->connect_error) {
    http_response_code(500);
    echo json_encode(['error' => 'Database connection failed: ' . $mysqli->connect_error]);
    exit();
}
$mysqli->set_charset('utf8');

$datos = json_decode(file_get_contents('php://input') ?: '{}');
if (!$datos) $datos = (object) [];

$year = $datos->year ?? date('Y');
$asignacion = $datos->asignacion ?? null;
$nivel = $datos->nivel ?? null;
$numero = $datos->numero ?? null;
$estudiante_id = $datos->estudiante ?? null;

$params = [];
$types = "";

$sql = "
    SELECT
        eg.estudiante AS estudiante,
        eg.nombres AS nombres,
        CONCAT_WS('-', eg.nivel, eg.numero) AS grupo,
        s.sede AS sede,
        SUM(CASE WHEN LOWER(c.tipoFalta) LIKE '%positivo%' THEN 1 ELSE 0 END) AS positivo,
        SUM(CASE WHEN LOWER(c.tipoFalta) LIKE '%tipo i%' OR LOWER(c.tipoFalta) = 'tipo1' THEN 1 ELSE 0 END) AS tipo1,
        SUM(CASE WHEN LOWER(c.tipoFalta) LIKE '%tipo ii%' OR LOWER(c.tipoFalta) = 'tipo2' THEN 1 ELSE 0 END) AS tipo2,
        SUM(CASE WHEN LOWER(c.tipoFalta) LIKE '%tipo iii%' OR LOWER(c.tipoFalta) = 'tipo3' THEN 1 ELSE 0 END) AS tipo3,
        COUNT(c.ind) AS total
    FROM convivencia c
    JOIN estugrupos eg ON c.estudiante = eg.estudiante
    JOIN sedes s ON eg.asignacion = s.ind
    WHERE eg.year = ? AND YEAR(c.fechahora) = ?
";
$types .= "ss";
$params[] = $year;
$params[] = $year;

if (!empty($asignacion)) {
    $sql .= " AND eg.asignacion = ?";
    $types .= "s";
    $params[] = $asignacion;
}
if (!empty($nivel)) {
    $sql .= " AND eg.nivel = ?";
    $types .= "s";
    $params[] = $nivel;
}
if (!empty($numero)) {
    $sql .= " AND eg.numero = ?";
    $types .= "s";
    $params[] = $numero;
}
if (!empty($estudiante_id)) {
    $sql .= " AND c.estudiante = ?";
    $types .= "s";
    $params[] = $estudiante_id;
}

$sql .= "
    GROUP BY eg.estudiante
    ORDER BY total DESC, s.sede, grupo, eg.nombres
";

$stmt = $mysqli->prepare($sql);

if ($stmt) {
    if (!empty($params)) {
        $stmt->bind_param($types, ...$params);
    }
    $stmt->execute();
    $result = $stmt->get_result();
    echo json_encode($result->fetch_all(MYSQLI_ASSOC));
    $stmt->close();
} else {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to prepare statement: ' . $mysqli->error]);
}

$mysqli->close();
?>