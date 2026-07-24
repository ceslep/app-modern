<?php
require_once __DIR__ . '/../helpers/db.php';
require_once __DIR__ . '/../helpers/request.php';
require_once __DIR__ . '/../config/response.php';

$mysqli = getDB();

$input = getJsonInputAssoc();
$year = $input['year'] ?? $_GET['year'] ?? date('Y');
$estudiante_id = $input['estudiante'] ?? $_GET['estudiante'] ?? null;

$page = max(1, (int)($input['page'] ?? $_GET['page'] ?? 1));
$perPage = max(1, min(100, (int)($input['per_page'] ?? $_GET['per_page'] ?? 50)));
$offset = ($page - 1) * $perPage;

$params = [];
$types = '';

if (empty($estudiante_id)) {
    $countSql = "
        SELECT COUNT(*) AS total
        FROM (
            SELECT i.estudiante
            FROM inasistencia i
            INNER JOIN estugrupos eg ON i.estudiante = eg.estudiante AND i.year = eg.year
            WHERE i.horas NOT IN ('f', 'r', 't')
            AND i.year = ?
            GROUP BY i.estudiante
        ) AS sub
    ";
    $types = 's';
    $params[] = $year;

    $countStmt = $mysqli->prepare($countSql);
    $countStmt->bind_param($types, ...$params);
    $countStmt->execute();
    $total = (int)$countStmt->get_result()->fetch_assoc()['total'];
    $countStmt->close();

    $sql = "
        SELECT
            i.estudiante,
            eg.nombres,
            CONCAT_WS('-', eg.nivel, eg.numero) as grupo,
            s.sede,
            'Varias' as materia,
            SUM(i.horas) as total
        FROM inasistencia i
        INNER JOIN estugrupos eg ON i.estudiante = eg.estudiante AND i.year = eg.year
        INNER JOIN sedes s ON eg.asignacion = s.ind
        WHERE i.horas NOT IN ('f', 'r', 't')
        AND i.year = ?
        GROUP BY i.estudiante
        ORDER BY total DESC
        LIMIT ? OFFSET ?
    ";
    $types .= 'ii';
    $params[] = $perPage;
    $params[] = $offset;
} else {
    $countSql = "
        SELECT COUNT(*) AS total
        FROM (
            SELECT i.estudiante, i.materia
            FROM inasistencia i
            INNER JOIN estugrupos eg ON i.estudiante = eg.estudiante AND i.year = eg.year
            WHERE i.horas NOT IN ('f', 'r', 't')
            AND i.year = ?
            AND i.estudiante = ?
            GROUP BY i.estudiante, i.materia
        ) AS sub
    ";
    $types = 'ss';
    $params[] = $year;
    $params[] = $estudiante_id;

    $countStmt = $mysqli->prepare($countSql);
    $countStmt->bind_param($types, ...$params);
    $countStmt->execute();
    $total = (int)$countStmt->get_result()->fetch_assoc()['total'];
    $countStmt->close();

    $sql = "
        SELECT
            eg.estudiante AS estudiante,
            eg.nombres AS nombres,
            CONCAT_WS('-', eg.nivel, eg.numero) AS grupo,
            s.sede AS sede,
            i.materia,
            SUM(i.horas) as total
        FROM inasistencia i
        INNER JOIN estugrupos eg ON i.estudiante = eg.estudiante AND i.year = eg.year
        INNER JOIN sedes s ON eg.asignacion = s.ind
        WHERE i.horas NOT IN ('f', 'r', 't')
        AND i.year = ?
        AND i.estudiante = ?
        GROUP BY i.estudiante, i.materia
        ORDER BY total DESC
        LIMIT ? OFFSET ?
    ";
    $params[] = $perPage;
    $params[] = $offset;
    $types .= 'ii';
}

$stmt = $mysqli->prepare($sql);

if ($stmt) {
    $stmt->bind_param($types, ...$params);
    $stmt->execute();
    $result = $stmt->get_result();
    $data = $result->fetch_all(MYSQLI_ASSOC);
    $stmt->close();

    paginated($data, $total, $page, $perPage);
} else {
    error('Failed to prepare statement: ' . $mysqli->error, 500);
}

$mysqli->close();
