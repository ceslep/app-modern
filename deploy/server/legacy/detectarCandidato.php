<?php
require("datos_conexion.php");
$mysqli = new mysqli($host, $user, $pass, $database);

if ($mysqli->connect_error) {
    http_response_code(500);
    echo json_encode(['error' => 'Database connection failed: ' . $mysqli->connect_error]);
    exit();
}
$mysqli->set_charset('utf8');

$datos = json_decode(file_get_contents("php://input"));
$estudiante = $datos->estudiante ?? '';
$year = $datos->year ?? '';

if (empty($estudiante) || empty($year)) {
    echo json_encode(["si" => false, "error" => "Missing parameters."]);
    exit();
}

$sql = "SELECT estudiante FROM estugrupos WHERE estudiante = ? AND year = ? LIMIT 1";
$stmt = $mysqli->prepare($sql);

if ($stmt) {
    $stmt->bind_param("ss", $estudiante, $year);
    $stmt->execute();
    $stmt->store_result(); // Needed to check num_rows
    
    if ($stmt->num_rows > 0) {
        echo json_encode(["si" => true]);
    } else {
        echo json_encode(["si" => false]);
    }
    
    $stmt->close();
} else {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to prepare statement: ' . $mysqli->error]);
}

$mysqli->close();
?>