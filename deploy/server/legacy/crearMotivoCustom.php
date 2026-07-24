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

    $label = trim($data->label ?? '');
    if (!$label) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'El nombre del motivo es requerido']);
        exit;
    }

    $value = $label;
    $obligaHoras = !empty($data->obligaHoras) ? 1 : 0;
    $icon = '+';

    $db = getDB();

    $check = $db->prepare("SELECT id FROM motivos_custom WHERE docente_id = ? AND `value` = ?");
    $check->bind_param('ss', $docenteId, $value);
    $check->execute();
    $check->store_result();
    if ($check->num_rows > 0) {
        http_response_code(409);
        echo json_encode(['success' => false, 'error' => 'Ya existe un motivo con ese nombre']);
        exit;
    }

    $stmt = $db->prepare("INSERT INTO motivos_custom (docente_id, `value`, `label`, obligaHoras, icon) VALUES (?, ?, ?, ?, ?)");
    $stmt->bind_param('sssis', $docenteId, $value, $label, $obligaHoras, $icon);
    $stmt->execute();

    $id = $stmt->insert_id;

    echo json_encode([
        'success' => true,
        'data' => [
            'id' => $id,
            'docente_id' => $docenteId,
            'value' => $value,
            'label' => $label,
            'obligaHoras' => (bool)$obligaHoras,
            'icon' => $icon,
        ],
    ], JSON_UNESCAPED_UNICODE);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
