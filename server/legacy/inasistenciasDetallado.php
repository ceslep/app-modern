<?php
require_once __DIR__ . '/../helpers/db.php';
require_once __DIR__ . '/../helpers/request.php';
require_once __DIR__ . '/../config/response.php';

$mysqli = getDB();

$input = getJsonInputAssoc();
$estudiante = $input['estudiante'] ?? $_GET['estudiante'] ?? '';

if (!$estudiante) {
    error('estudiante es requerido', 400);
}

$periodo = $input['periodo'] ?? $_GET['periodo'] ?? 'TODOS';
$asignat = $input['asignat'] ?? $_GET['asignat'] ?? null;

$monthNames = [
    'January' => 'Enero', 'February' => 'Febrero', 'March' => 'Marzo',
    'April' => 'Abril', 'May' => 'Mayo', 'June' => 'Junio',
    'July' => 'Julio', 'August' => 'Agosto', 'September' => 'Septiembre',
    'October' => 'Octubre', 'November' => 'Noviembre', 'December' => 'Diciembre'
];

$sql = "SELECT i.ind, i.fecha, DATE_FORMAT(i.fecha, '%M') AS mes, DATE_FORMAT(i.fecha, '%d') AS dia,
               i.horas, i.excusa, i.hora_clase, i.detalle, i.materia
        FROM inasistencia i
        WHERE i.estudiante = ? AND i.year = YEAR(CURDATE())";

$types = 's';
$params = [$estudiante];

if ($asignat) {
    $sql .= " AND i.materia = ?";
    $types .= 's';
    $params[] = $asignat;
}

if ($periodo !== 'TODOS') {
    $sql .= " AND i.periodo = ?";
    $types .= 's';
    $params[] = $periodo;
}

$sql .= " ORDER BY i.fecha DESC";

$stmt = $mysqli->prepare($sql);

if (!$stmt) {
    error('Failed to prepare statement: ' . $mysqli->error, 500);
}

$stmt->bind_param($types, ...$params);
$stmt->execute();
$result = $stmt->get_result();

$data = [];
while ($row = $result->fetch_assoc()) {
    $row['fechac'] = $row['fecha'];
    $row['fecha'] = ($monthNames[$row['mes']] ?? $row['mes']) . ' ' . $row['dia'];
    $data[] = $row;
}

$stmt->close();

success($data);
