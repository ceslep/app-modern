<?php
require_once("datos_conexion.php");
$mysqli = new mysqli($host, $user, $pass, $database);

if ($mysqli->connect_error) {
    http_response_code(500);
    echo json_encode(['error' => 'Database connection failed: ' . $mysqli->connect_error]);
    exit();
}
$mysqli->set_charset('utf8');

$datos = json_decode(file_get_contents("php://input"));
$estado = $datos->estado ?? null;

$estado_int = (int)$estado;

$stmt = $mysqli->prepare("UPDATE estadoNotas SET estado = ? WHERE ind = '1'");

if ($stmt) {
    $stmt->bind_param("i", $estado_int);
    $stmt->execute();
    $stmt->close();

    if ($estado_int === 0) {
        echo json_encode(["msg" => "cerrada"]);
    } else {
        echo json_encode(["msg" => "activada"]);
    }
} else {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to prepare statement: ' . $mysqli->error]);
}

$mysqli->close();
?>