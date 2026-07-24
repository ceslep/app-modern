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
$ind = $datos->ind ?? null;
$estudiante = $datos->estudiante ?? '';
$year = $datos->year ?? date('Y');

$sql = "
    SELECT 
        eg.nombres,
        d.nombres as cv_docente,
        c.asignatura as cv_asignatura,
        IF(c.tipoFalta='POSITIVO', 'OTRAS OBSERVACIONES', c.tipoFalta) as cv_tipoFalta,
        REPLACE(c.faltas, 'Array', '') as cv_faltas,
        c.descripcionSituacion as cv_descripcionSituacion,
        c.fecha as cv_fecha,
        IF(c.hora<>'', c.hora, SUBSTRING(c.fechahora, 11, 8)) as cv_hora,
        c.descargosEstudiante as cv_descargosEstudiante,
        c.positivos as cv_positivos,
        c.firma as cv_firma,
        c.firmaAcudiente,
        c.fechahora as cv_fechahora
    FROM convivencia c
    INNER JOIN docentes d ON c.docente = d.identificacion 
    INNER JOIN estugrupos eg ON c.estudiante = eg.estudiante
    WHERE eg.year = ?
";

$params = [$year];
$types = "s";

if (isset($ind)) {
    $sql .= " AND c.ind = ?";
    $params[] = $ind;
    $types .= "i";
} else {
    $sql .= " AND c.estudiante = ?";
    $params[] = $estudiante;
    $types .= "s";
}

$sql .= " AND YEAR(c.fechahora) = ? ORDER BY c.fechahora DESC";
$params[] = $year;
$types .= "s";

$stmt = $mysqli->prepare($sql);

if ($stmt) {
    $stmt->bind_param($types, ...$params);
    $stmt->execute();
    $result = $stmt->get_result();
    $resultado = $result->fetch_all(MYSQLI_ASSOC);
    
    // Decode HTML entities for proper display on the client side
    foreach ($resultado as &$fila) {
        foreach ($fila as &$valor) {
            if (is_string($valor)) {
                $valor = html_entity_decode($valor, ENT_QUOTES, 'UTF-8');
            }
        }
    }
    
    echo json_encode($resultado);
    $stmt->close();
} else {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to prepare statement: ' . $mysqli->error]);
}

$mysqli->close();
?>