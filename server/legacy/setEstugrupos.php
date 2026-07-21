<?php
require_once __DIR__ . '/../config/auth.php';
requireAuth();

$data = getJsonInputAssoc();

$allowed = [
    'nombres', 'genero', 'fecnac', 'tipoSangre', 'eps', 'tdei',
    'lugarNacimiento', 'lugarExpedicion', 'fechaExpedicion', 'email_estudiante',
    'activo', 'banda', 'HED', 'desertor', 'institucion_externa', 'estado',
    'acudiente', 'idacudiente', 'parentesco', 'telefono_acudiente',
    'email_acudiente', 'direccion', 'telefono1', 'telefono2',
    'padre', 'padreid', 'telefonopadre', 'ocupacionpadre',
    'madre', 'madreid', 'telefonomadre', 'ocupacionmadre',
    'etnia', 'discapacidad', 'estrato', 'sisben', 'victimaConflicto',
    'lugarDesplazamiento', 'fechaDesplazamiento', 'otraInformacion',
];

$ind = $data['ind'] ?? '';

if ($ind) {
    // ── UPDATE existing student ──
    $set = [];
    $params = [];
    $types = '';

    foreach ($allowed as $col) {
        if (array_key_exists($col, $data)) {
            $set[] = "`$col` = ?";
            $params[] = $data[$col];
            $types .= 's';
        }
    }

    if (empty($set)) {
        http_response_code(400);
        echo json_encode(['exito' => false, 'mensaje' => 'No hay campos válidos para actualizar.']);
        exit;
    }

    $params[] = $ind;
    $types .= 's';

    $sql = 'UPDATE estugrupos SET ' . implode(', ', $set) . ' WHERE ind = ?';
} else {
    // ── CREATE new student ──
    $createCols = ['codigo','estudiante','nombres','asignacion','nivel','numero','year','anio'];
    $insertCols = [];
    $insertParams = [];
    $insertTypes = '';

    foreach ($createCols as $col) {
        if (array_key_exists($col, $data)) {
            $insertCols[] = "`$col`";
            $insertParams[] = $data[$col];
            $insertTypes .= 's';
        }
    }

    // Also add any allowed fields present in data
    foreach ($allowed as $col) {
        if (array_key_exists($col, $data) && !in_array($col, $createCols)) {
            $insertCols[] = "`$col`";
            $insertParams[] = $data[$col];
            $insertTypes .= 's';
        }
    }

    if (empty($insertCols)) {
        http_response_code(400);
        echo json_encode(['exito' => false, 'mensaje' => 'No hay datos para crear el estudiante.']);
        exit;
    }

    $placeholders = implode(', ', array_fill(0, count($insertCols), '?'));
    $sql = 'INSERT INTO estugrupos (' . implode(', ', $insertCols) . ') VALUES (' . $placeholders . ')';
}

$mysqli = getDB();
$stmt = $mysqli->prepare($sql);
if (!$stmt) {
    http_response_code(500);
    echo json_encode(['exito' => false, 'mensaje' => 'Error preparando consulta: ' . $mysqli->error]);
    exit;
}

if ($ind) {
    $stmt->bind_param($types, ...$params);
} else {
    $stmt->bind_param($insertTypes, ...$insertParams);
}

if (!$stmt->execute()) {
    $action = $ind ? 'actualizar' : 'crear';
    http_response_code(500);
    echo json_encode(['exito' => false, 'mensaje' => 'Error al ' . $action . ': ' . $stmt->error]);
    $stmt->close();
    exit;
}

$insertedId = $ind ? null : $mysqli->insert_id;
$stmt->close();

if ($ind) {
    echo json_encode(['exito' => true, 'mensaje' => '']);
} else {
    echo json_encode(['exito' => true, 'mensaje' => '', 'insert_id' => $insertedId]);
}
