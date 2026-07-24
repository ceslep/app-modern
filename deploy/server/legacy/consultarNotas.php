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
$estudiante = $datos->estudiante ?? '';
$periodo = $datos->periodo ?? '';
$year = $datos->year ?? '';

if (empty($estudiante) || empty($periodo) || empty($year)) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing required parameters: estudiante, periodo, year.']);
    exit();
}

$sql = "SELECT * FROM notas WHERE estudiante = ? AND periodo = ? AND year = ?";
$stmt = $mysqli->prepare($sql);

if ($stmt) {
    $stmt->bind_param("sss", $estudiante, $periodo, $year);
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