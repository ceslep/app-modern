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

$datos = json_decode(file_get_contents("php://input"));
$periodo = $datos->periodo ?? '';
$nivel = $datos->nivel ?? '';
$numero = $datos->numero ?? '';
$sede = $datos->sede ?? '';
$like_sede = "%" . $sede . "%";
$current_year = date('Y');

$sql = "
    SELECT 
        n.estudiante, 
        eg.nombres, 
        COUNT(n.asignatura) as cantidad, 
        s.sede 
    FROM notas n
    INNER JOIN estugrupos eg ON n.estudiante = eg.estudiante AND n.year = eg.year
    INNER JOIN sedes s ON eg.asignacion = s.ind
    WHERE n.year = ?
      AND eg.activo = 'S'
      AND n.periodo = ?
      AND eg.nivel = ?
      AND eg.numero = ?
      AND s.sede LIKE ?
    GROUP BY n.estudiante
    ORDER BY eg.nombres
";

$stmt = $mysqli->prepare($sql);
$stmt->bind_param("sssss", $current_year, $periodo, $nivel, $numero, $like_sede);
$stmt->execute();
$result = $stmt->get_result();
$student_data = $result->fetch_all(MYSQLI_ASSOC);
$stmt->close();

$distinct_counts = [];
foreach ($student_data as $student) {
    $distinct_counts[$student['cantidad']] = true;
}

$colors_map = [];
foreach (array_keys($distinct_counts) as $count) {
    $colors_map[$count] = [
        'color_pastel' => 'rgb(' . (rand(200, 255)) . ', ' . (rand(200, 255)) . ', ' . (rand(200, 255)) . ')',
        'color_texto_oscuro' => 'rgb(' . (rand(0, 100)) . ', ' . (rand(0, 100)) . ', ' . (rand(0, 100)) . ')'
    ];
}

$response_data = [];
foreach ($student_data as $student) {
    $count = $student['cantidad'];
    $student['color'] = $colors_map[$count]['color_pastel'];
    $student['color_texto'] = $colors_map[$count]['color_texto_oscuro'];
    $response_data[] = $student;
}

echo json_encode($response_data);
$mysqli->close();
?>