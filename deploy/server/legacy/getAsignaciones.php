<?php
/**
 * getAsignaciones.php — CRUD para la tabla `asignacion_asignaturas`.
 *
 * GET  (list): ?year=&sede=&nivel=&numero=&docente=&asignatura=&visible=
 * POST (create): JSON body with all fields
 * PUT  (update): JSON body with `ind` + fields
 * DELETE (delete): JSON body with `ind`
 */

error_reporting(E_ALL & ~E_DEPRECATED & ~E_USER_DEPRECATED);

require_once __DIR__ . '/../config/app.php';
require_once __DIR__ . '/../config/database.php';

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

try {
    $db = Database::getInstance()->getPdo();
    $method = $_SERVER['REQUEST_METHOD'];

    switch ($method) {
        case 'GET':
            handleGet($db);
            break;
        case 'POST':
            handlePost($db);
            break;
        case 'PUT':
            handlePut($db);
            break;
        case 'DELETE':
            handleDelete($db);
            break;
        default:
            http_response_code(405);
            echo json_encode(['success' => false, 'error' => 'Método no permitido']);
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}

// ── GET: Listar asignaciones con filtros ───────────────────────────────

function handleGet(PDO $db) {
    $where = [];
    $params = [];

    $year = $_GET['year'] ?? '';
    $sede = $_GET['sede'] ?? '';
    $nivel = $_GET['nivel'] ?? '';
    $numero = $_GET['numero'] ?? '';
    $docente = $_GET['docente'] ?? '';
    $asignatura = $_GET['asignatura'] ?? '';
    $visible = $_GET['visible'] ?? '';
    $search = $_GET['search'] ?? '';

    if ($year !== '') {
        $where[] = 'a.year = ?';
        $params[] = $year;
    }
    if ($sede !== '') {
        $where[] = 'a.sede = ?';
        $params[] = (int)$sede;
    }
    if ($nivel !== '') {
        $where[] = 'a.nivel = ?';
        $params[] = (int)$nivel;
    }
    if ($numero !== '') {
        $where[] = 'a.numero = ?';
        $params[] = (int)$numero;
    }
    if ($docente !== '') {
        $where[] = 'a.docente = ?';
        $params[] = $docente;
    }
    if ($asignatura !== '') {
        $where[] = 'a.asignatura LIKE ?';
        $params[] = "%{$asignatura}%";
    }
    if ($visible !== '') {
        $where[] = 'a.visible = ?';
        $params[] = $visible;
    }
    if ($search !== '') {
        $where[] = '(a.asignatura LIKE ? OR a.materia LIKE ? OR d.nombres LIKE ? OR a.abreviatura LIKE ?)';
        $s = "%{$search}%";
        $params = array_merge($params, [$s, $s, $s, $s]);
    }

    $sql = 'SELECT a.*, d.nombres AS docente_nombre, s.sede AS sede_nombre
            FROM asignacion_asignaturas a
            LEFT JOIN docentes d ON a.docente = d.identificacion
            LEFT JOIN sedes s ON a.sede = s.ind';
    if ($where) {
        $sql .= ' WHERE ' . implode(' AND ', $where);
    }
    $sql .= ' ORDER BY a.year DESC, a.sede, a.nivel, a.numero, a.asignatura';

    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
        'success' => true,
        'data' => $rows,
        'total' => count($rows),
    ]);
}

// ── POST: Crear nueva asignación ──────────────────────────────────────

function handlePost(PDO $db) {
    $data = json_decode(file_get_contents('php://input'));
    if (!$data) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'JSON inválido']);
        return;
    }

    $stmt = $db->prepare('INSERT INTO asignacion_asignaturas
        (docente, sede, asignatura, nivel, numero, abreviatura, materia, codigo, banda, visible, orden, year)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');

    $stmt->execute([
        $data->docente ?? null,
        (int)($data->sede ?? 0),
        $data->asignatura ?? '',
        (int)($data->nivel ?? 0),
        (int)($data->numero ?? 0),
        $data->abreviatura ?? '',
        $data->materia ?? '',
        $data->codigo ?? '',
        $data->banda ?? '',
        $data->visible ?? 'S',
        (float)($data->orden ?? 0),
        (int)($data->year ?? date('Y')),
    ]);

    $newId = $db->lastInsertId();

    echo json_encode([
        'success' => true,
        'data' => ['ind' => $newId],
        'mensaje' => 'Asignación creada exitosamente',
    ]);
}

// ── PUT: Actualizar asignación existente ──────────────────────────────

function handlePut(PDO $db) {
    $data = json_decode(file_get_contents('php://input'));
    if (!$data || empty($data->ind)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'JSON inválido o falta ind']);
        return;
    }

    $fields = [];
    $params = [];

    $allowed = ['docente', 'sede', 'asignatura', 'nivel', 'numero', 'abreviatura',
                'materia', 'codigo', 'banda', 'visible', 'orden', 'year', 'grados'];

    foreach ($allowed as $f) {
        if (isset($data->$f)) {
            $fields[] = "{$f} = ?";
            if (in_array($f, ['sede', 'nivel', 'numero', 'year'])) {
                $params[] = (int)$data->$f;
            } elseif (in_array($f, ['orden'])) {
                $params[] = (float)$data->$f;
            } else {
                $params[] = $data->$f;
            }
        }
    }

    if (empty($fields)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'No hay campos para actualizar']);
        return;
    }

    $params[] = (int)$data->ind;

    $sql = 'UPDATE asignacion_asignaturas SET ' . implode(', ', $fields) . ' WHERE ind = ?';
    $stmt = $db->prepare($sql);
    $stmt->execute($params);

    echo json_encode([
        'success' => true,
        'mensaje' => 'Asignación actualizada exitosamente',
    ]);
}

// ── DELETE: Eliminar asignación ───────────────────────────────────────

function handleDelete(PDO $db) {
    $data = json_decode(file_get_contents('php://input'));
    if (!$data || empty($data->ind)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'JSON inválido o falta ind']);
        return;
    }

    $stmt = $db->prepare('DELETE FROM asignacion_asignaturas WHERE ind = ?');
    $stmt->execute([(int)$data->ind]);

    echo json_encode([
        'success' => true,
        'mensaje' => 'Asignación eliminada exitosamente',
    ]);
}
