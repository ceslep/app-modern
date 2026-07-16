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
$bodyNotification = $datos->bodyNotification ?? '';
$textNotification = $datos->textNotification ?? '';
$fecha = $datos->fecha ?? '';
$hora = $datos->hora ?? '';

if (empty($bodyNotification) || empty($textNotification) || empty($fecha) || empty($hora)) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing required parameters.']);
    exit();
}

$sql = "INSERT INTO notificaciones (bodyNotification, textNotification, fecha, hora) VALUES (?, ?, ?, ?)";
$stmt = $mysqli->prepare($sql);

if ($stmt) {
    // Assuming the columns in the DB are named: bodyNotification, textNotification, fecha, hora
    $stmt->bind_param("ssss", $bodyNotification, $textNotification, $fecha, $hora);
    
    if ($stmt->execute()) {
        echo json_encode(["msg" => "Notificacion creada"]);
    } else {
        http_response_code(500);
        echo json_encode(["msg" => "Error al crear notificacion", "error" => $stmt->error]);
    }
    $stmt->close();
} else {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to prepare statement: ' . $mysqli->error]);
}

$mysqli->close();
?>