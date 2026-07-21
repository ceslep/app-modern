<?php
header('Content-Type: application/json; charset=utf-8');

try {
    $data = getJsonInput();

    $docenteId = $_SESSION['identificacion'] ?? $data->docente_id ?? '';
    if (!$docenteId) {
        http_response_code(401);
        echo json_encode(['success' => false, 'error' => 'No autenticado']);
        exit;
    }

    $id = (int)($data->id ?? 0);
    if (!$id) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'ID del motivo es requerido']);
        exit;
    }

    $db = getDB();

    $check = $db->prepare("SELECT id FROM motivos_custom WHERE id = ? AND docente_id = ?");
    $check->bind_param('is', $id, $docenteId);
    $check->execute();
    $check->store_result();
    if ($check->num_rows === 0) {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'Motivo no encontrado o no pertenece al docente']);
        exit;
    }

    $stmt = $db->prepare("DELETE FROM motivos_custom WHERE id = ? AND docente_id = ?");
    $stmt->bind_param('is', $id, $docenteId);
    $stmt->execute();

    echo json_encode(['success' => true, 'message' => 'Motivo eliminado'], JSON_UNESCAPED_UNICODE);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
