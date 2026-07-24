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
$notifyind = $datos->notifyind ?? null;

if (empty($notifyind) || !is_numeric($notifyind)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid or missing parameter: notifyind.']);
    exit();
}

$stmt = $mysqli->prepare("DELETE FROM notificaciones WHERE ind = ?");

if ($stmt) {
    $stmt->bind_param("i", $notifyind); // 'i' for integer
    
    if ($stmt->execute()) {
        echo json_encode(["mensaje" => "ok"]);
    } else {
        http_response_code(500);
        echo json_encode(["mensaje" => "no", "error" => "Failed to execute statement."]);
    }
    
    $stmt->close();
} else {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to prepare statement: ' . $mysqli->error]);
}

$mysqli->close();
?>