<?php
/**
 * Datos de contacto del acudiente de un estudiante (año actual).
 *
 * Payload JSON: { "estudiante": "<codigo>" }
 * Devuelve un arreglo JSON con acudiente, telefono1, telefono2.
 */
require_once __DIR__ . '/../helpers/db.php';
require_once __DIR__ . '/../helpers/request.php';

header('Content-Type: application/json; charset=utf-8');

$mysqli = getDB();

$info       = getJsonInput();
$estudiante = trim($info->estudiante ?? '');

$sql = "SELECT acudiente, telefono1, telefono2
        FROM estugrupos
        WHERE estudiante = ? AND year = YEAR(CURDATE())";

$stmt = $mysqli->prepare($sql);
if (!$stmt) {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to prepare statement: ' . $mysqli->error]);
    exit;
}

$stmt->bind_param('s', $estudiante);
$stmt->execute();
$result = $stmt->get_result();
$datos  = $result->fetch_all(MYSQLI_ASSOC);
$stmt->close();

echo json_encode($datos);
