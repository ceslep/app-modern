<?php
require_once __DIR__ . '/../bootstrap.php';

header('Content-Type: application/json; charset=utf-8');

try {
    $grado = $_GET['grado'] ?? '';
    $year = (int)($_GET['year'] ?? date('Y'));

    $db = getDB();

    if ($grado) {
        $stmt = $db->prepare("SELECT estudiante, nombres as nombre, CONCAT(nivel, LPAD(numero,2,'0')) as grado
            FROM estugrupos WHERE CONCAT(nivel, LPAD(numero,2,'0')) = ? AND anio = ? AND activo = 'S' ORDER BY nombres");
        $stmt->bind_param('si', $grado, $year);
    } else {
        $stmt = $db->prepare("SELECT estudiante, nombres as nombre, CONCAT(nivel, LPAD(numero,2,'0')) as grado
            FROM estugrupos WHERE anio = ? AND activo = 'S' ORDER BY nombres");
        $stmt->bind_param('i', $year);
    }

    $stmt->execute();
    $r = $stmt->get_result();
    $data = [];
    while ($row = $r->fetch_assoc()) {
        $data[] = $row;
    }

    echo json_encode($data, JSON_UNESCAPED_UNICODE);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
