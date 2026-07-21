<?php
header('Content-Type: application/json; charset=utf-8');

try {
    $docenteId = $_SESSION['identificacion'] ?? $_GET['docente_id'] ?? '';
    if (!$docenteId) {
        $input = getJsonInput();
        $docenteId = $input->docente_id ?? '';
    }
    if (!$docenteId) {
        http_response_code(401);
        echo json_encode(['success' => false, 'error' => 'No autenticado']);
        exit;
    }

    $db = getDB();
    $stmt = $db->prepare("SELECT id, docente_id, `value`, `label`, obligaHoras, icon, created_at FROM motivos_custom WHERE docente_id = ? ORDER BY created_at DESC");
    $stmt->bind_param('s', $docenteId);
    $stmt->execute();
    $r = $stmt->get_result();
    $data = [];
    while ($row = $r->fetch_assoc()) {
        $row['obligaHoras'] = (bool)$row['obligaHoras'];
        $data[] = $row;
    }
    echo json_encode(['success' => true, 'data' => $data], JSON_UNESCAPED_UNICODE);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
