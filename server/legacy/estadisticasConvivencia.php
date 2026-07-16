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

$sql = "
    SELECT 
        c.tipoFalta, 
        COUNT(c.tipoFalta) as cantidad, 
        s.sede 
    FROM convivencia c
    INNER JOIN estugrupos eg ON c.estudiante = eg.estudiante AND eg.year = c.year
    INNER JOIN sedes s ON eg.asignacion = s.ind
    WHERE c.year = ?
    GROUP BY c.tipoFalta, eg.asignacion
    ORDER BY s.ind, cantidad DESC
";

$stmt = $mysqli->prepare($sql);

if ($stmt) {
    $stmt->bind_param("s", $year);
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