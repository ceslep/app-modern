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
$year = $datos->year ?? date('Y');
$estudiante_id = $datos->estudiante ?? null;
$use_detailed_view = $datos->chk ?? false;

$params = [];
$types = "";

if (!$use_detailed_view) {
    $sql = "
        SELECT
            eg.estudiante AS estudiante,
            eg.nombres AS nombres,
            CONCAT_WS('-', eg.nivel, eg.numero) AS grupo,
            s.sede AS sede,
            c.asignatura,
            COUNT(c.ind) AS total,
            '' as tipoFalta
        FROM convivencia c
        JOIN estugrupos eg ON c.estudiante = eg.estudiante
        JOIN sedes s ON eg.asignacion = s.ind
        WHERE eg.year = ? AND YEAR(c.fechahora) = ?
    ";
    $types .= "ss";
    $params[] = $year;
    $params[] = $year;

    if (!empty($estudiante_id)) {
        $sql .= " AND c.estudiante = ?";
        $types .= "s";
        $params[] = $estudiante_id;
    }

    $sql .= "
        GROUP BY c.estudiante
        ORDER BY total DESC, s.sede, grupo, eg.nombres, c.asignatura
    ";
} else {
    $sql = "
        SELECT
            eg.estudiante AS estudiante,
            eg.nombres AS nombres,
            CONCAT_WS('-', eg.nivel, eg.numero) AS grupo,
            s.sede AS sede,
            c.asignatura,
            MAX(c.fechahora) AS total,
            IF(c.tipoFalta='POSITIVO', 'OTRAS OBSERVACIONES', c.tipoFalta) as tipoFalta,
            c.fecha
        FROM convivencia c
        JOIN estugrupos eg ON c.estudiante = eg.estudiante
        JOIN sedes s ON eg.asignacion = s.ind
        WHERE eg.year = ? AND YEAR(c.fechahora) = ?
    ";
    $types .= "ss";
    $params[] = $year;
    $params[] = $year;

    if (!empty($estudiante_id)) {
        $sql .= " AND c.estudiante = ?";
        $types .= "s";
        $params[] = $estudiante_id;
    }

    $sql .= "
        GROUP BY c.estudiante, c.tipoFalta
        ORDER BY c.fecha DESC, s.sede, grupo, eg.nombres, c.asignatura
    ";
}

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