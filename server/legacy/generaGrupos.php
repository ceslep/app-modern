<?php
require_once("headers.php");
require_once("datos_conexion.php");

$mysqli = new mysqli($host, $user, $pass, $database);
if ($mysqli->connect_error) {
    http_response_code(500);
    echo json_encode(['error' => 'Database connection failed: ' . $mysqli->connect_error]);
    exit();
}
$mysqli->set_charset('utf8');

$datos = json_decode(file_get_contents("php://input"));
$sede = $datos->sede ?? '';
$current_year = date('Y');

if (empty($sede)) {
    echo json_encode([]); // Return empty array if no sede is provided
    exit();
}

$sql = "
    SELECT DISTINCT 
        a.nivel, 
        a.numero, 
        CONCAT_WS('-', a.nivel, a.numero) as grado 
    FROM asignacion_asignaturas as a
    INNER JOIN docentes as d ON a.docente = d.identificacion
    WHERE d.asignacion = ?
      AND a.year = ?
    ORDER BY a.nivel, a.numero
";

$stmt = $mysqli->prepare($sql);

if ($stmt) {
    $stmt->bind_param("ss", $sede, $current_year);
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