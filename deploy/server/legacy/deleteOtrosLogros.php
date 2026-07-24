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
$ind = $datos->ind ?? null;

if (empty($ind) || !is_numeric($ind)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid or missing parameter: ind.']);
    exit();
}

$stmt = $mysqli->prepare("DELETE FROM desempenos WHERE ind = ?");

if ($stmt) {
    $stmt->bind_param("i", $ind); // 'i' for integer
    
    if ($stmt->execute()) {
        echo json_encode(["msj" => "ok"]);
    } else {
        http_response_code(500);
        echo json_encode(["msj" => "error", "error" => "Failed to execute statement."]);
    }
    
    $stmt->close();
} else {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to prepare statement: ' . $mysqli->error]);
}

$mysqli->close();
?>