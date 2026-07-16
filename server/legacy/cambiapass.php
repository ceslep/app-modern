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

$identificacion = $datos->docente ?? '';
$contrasena = $datos->contrasena ?? '';

if (empty($identificacion) || empty($contrasena)) {
    http_response_code(400);
    echo json_encode(['error' => 'Identification and password are required.']);
    exit();
}

$hashed_password = password_hash($contrasena, PASSWORD_DEFAULT);

$stmt = $mysqli->prepare("UPDATE docentes SET pass = ? WHERE identificacion = ?");

if ($stmt) {
    $stmt->bind_param("ss", $hashed_password, $identificacion);
    
    if ($stmt->execute()) {
        echo json_encode(["msg" => "ok"]);
    } else {
        http_response_code(500);
        echo json_encode(["msg" => "error", "error" => "Failed to update password."]);
    }
    
    $stmt->close();
} else {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to prepare statement: ' . $mysqli->error]);
}

$mysqli->close();
?>