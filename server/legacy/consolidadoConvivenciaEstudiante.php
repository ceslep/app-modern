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

$datos = json_decode(file_get_contents('php://input'));
$estudiante = $datos->estudiante ?? '';
$year = $datos->year ?? date('Y');

if (empty($estudiante)) {
    http_response_code(400);
    echo json_encode(['error' => 'Student ID is required.']);
    exit();
}

$sql = "
    SELECT
        c.ind,
        eg.estudiante AS estudiante,
        eg.nombres AS nombres,
        CONCAT_WS('-', eg.nivel, eg.numero) AS grupo,
        s.sede AS sede,
        c.asignatura,
        c.fecha,
        IF(c.hora<>'', c.hora, SUBSTRING(c.fechahora, 11, 8)) as hora,
        IF(c.tipoFalta='POSITIVO', 'OTRA OBSERVACION', c.tipoFalta) as tipoFalta,
        IF(c.firma<>'', '1', '0') as firmado,
        c.firma
    FROM convivencia c
    JOIN estugrupos eg ON c.estudiante = eg.estudiante
    JOIN sedes s ON eg.asignacion = s.ind
    WHERE c.estudiante = ?
      AND eg.year = ?
      AND YEAR(c.fechahora) = ?
    ORDER BY c.fechahora DESC, s.sede
";

$stmt = $mysqli->prepare($sql);

if ($stmt) {
    $stmt->bind_param("sss", $estudiante, $year, $year);
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