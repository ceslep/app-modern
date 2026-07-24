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
        c.estudiante,
        eg.nombres,
        CONCAT_WS('-', eg.nivel, eg.numero) AS grupo,
        s.sede AS sede,
        d.nombres AS docente,
        c.asignatura,
        c.fecha,
        IF(c.hora<>'', c.hora, SUBSTRING(c.fechahora, 11, 8)) AS hora,
        c.tipoFalta,
        c.faltas,
        c.descripcionSituacion,
        c.descargosEstudiante,
        c.positivos,
        c.firma,
        c.firmaAcudiente,
        c.fechahora
    FROM convivencia c
    JOIN estugrupos eg ON c.estudiante = eg.estudiante
    JOIN sedes s ON eg.asignacion = s.ind
    LEFT JOIN docentes d ON c.docente = d.identificacion
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
    $rows = $result->fetch_all(MYSQLI_ASSOC);
    foreach ($rows as &$row) {
        $row['firmado'] = !empty($row['firma']) ? '1' : '0';
    }
    echo json_encode($rows);
    $stmt->close();
} else {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to prepare statement: ' . $mysqli->error]);
}

$mysqli->close();
?>