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
$asignacion = $datos->asignacion ?? '';
$nivel = $datos->nivel ?? '';
$numero = $datos->numero ?? '';
$periodo = $datos->periodo ?? '';
$year = $datos->year ?? date('Y');

if (empty($asignacion) || empty($nivel) || empty($numero) || empty($periodo) || empty($year)) {
    echo json_encode([]); // Return empty if parameters are missing
    exit();
}

$sql = "
    SELECT 
        n.estudiante,
        eg.nombres,
        AVG(n.valoracion) as promedio,
        CONCAT_WS('-', eg.nivel, eg.numero) as grupo
    FROM notas n
    INNER JOIN estugrupos eg ON n.estudiante = eg.estudiante
    WHERE eg.activo = 'S'
      AND eg.asignacion = ?
      AND eg.nivel = ?
      AND eg.numero = ?
      AND n.periodo = ?
      AND n.year = ?
      AND eg.year = ?
    GROUP BY n.estudiante
    ORDER BY promedio DESC
";

$stmt = $mysqli->prepare($sql);

if ($stmt) {
    $stmt->bind_param("ssssss", $asignacion, $nivel, $numero, $periodo, $year, $year);
    $stmt->execute();
    $result = $stmt->get_result();
    $puestos_sin_rank = $result->fetch_all(MYSQLI_ASSOC);
    $stmt->close();

    // Calculate rank in PHP
    $puestos_con_rank = [];
    $rank = 1;
    foreach ($puestos_sin_rank as $puesto) {
        $puesto['puesto'] = $rank++;
        $puestos_con_rank[] = $puesto;
    }

    echo json_encode($puestos_con_rank);
} else {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to prepare statement: ' . $mysqli->error]);
}

$mysqli->close();
?>