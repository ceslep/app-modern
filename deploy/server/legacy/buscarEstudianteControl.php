<?php
require_once __DIR__ . '/../helpers/db.php';
require_once __DIR__ . '/../helpers/request.php';
require_once __DIR__ . '/../config/response.php';

$mysqli = getDB();

$raw = file_get_contents('php://input');
$body = json_decode($raw, true);
$input = is_array($body) ? $body : [];

$criterio = trim((string)($input['criterio'] ?? $_GET['criterio'] ?? ''));

$page = max(1, (int)($input['page'] ?? $_GET['page'] ?? 1));
$perPage = max(1, min(200, (int)($input['per_page'] ?? $_GET['per_page'] ?? 50)));
$offset = ($page - 1) * $perPage;

$where = "eg.year = YEAR(CURDATE()) AND eg.activo = 'S'";
$params = [];
$types = '';

if ($criterio !== '') {
    $where .= " AND (eg.estudiante LIKE ? OR eg.nombres LIKE ?)";
    $like = '%' . $criterio . '%';
    $params[] = $like;
    $params[] = $like;
    $types .= 'ss';
}

$countSql = "SELECT COUNT(*) AS total FROM estugrupos eg JOIN sedes s ON eg.asignacion = s.ind WHERE $where";

$countStmt = $mysqli->prepare($countSql);
if (!$countStmt) {
    error('Failed to prepare count: ' . $mysqli->error, 500);
}

if ($types) {
    $countStmt->bind_param($types, ...$params);
}
$countStmt->execute();
$total = (int)$countStmt->get_result()->fetch_assoc()['total'];
$countStmt->close();

$sql = "SELECT eg.codigo, eg.estudiante, eg.nombres, eg.nivel, eg.numero, eg.genero, s.sede AS asignacion
        FROM estugrupos eg
        JOIN sedes s ON eg.asignacion = s.ind
        WHERE $where
        ORDER BY eg.nombres
        LIMIT ? OFFSET ?";

$dataStmt = $mysqli->prepare($sql);
if (!$dataStmt) {
    error('Failed to prepare query: ' . $mysqli->error, 500);
}

$bindTypes = $types . 'ii';
$dataStmt->bind_param($bindTypes, ...[...$params, $perPage, $offset]);
$dataStmt->execute();
$result = $dataStmt->get_result();
$data = $result->fetch_all(MYSQLI_ASSOC);
$dataStmt->close();

echo json_encode([
    'success' => true,
    'data' => $data,
    'meta' => [
        'total' => $total,
        'page' => $page,
        'per_page' => $perPage,
        'total_pages' => max(1, (int)ceil($total / $perPage)),
    ],
]);
