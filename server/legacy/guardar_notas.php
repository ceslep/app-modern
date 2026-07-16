<?php
/**
 * guardar_notas.php — modernizado.
 *
 * vs legacy:
 *   - Prepared statements (sin SQL injection)
 *   - Transacciones (atomicidad: todo o nada, rollback en error)
 *   - Detección dinámica de columnas notaN (sin loop hardcoded 1-12)
 *   - Verificación corregida: WHERE nivel=? AND numero=? AND (anio=? OR year=?)
 *     (la legacy usaba grado='7-2' que está vacío en estugrupos)
 *   - Eliminado sprintf($sql, $campos, $values) que causaba "Query was empty"
 *   - Guard if (!empty($sql)) antes de multi_query
 *
 * Mantiene contrato con src/modules/notas.js:
 *   - { msg: "Exito" }                              éxito
 *   - { msg: "Prohibido" }                          plataforma cerrada
 *   - { msg: "error_de_aspecto", info_aspecto, estudiante }  falta aspecto
 *
 * Notas de rendimiento:
 *   - El trigger `antes_actualizar_notas` fires 1 vez por fila INSERT, lo que
 *     domina el tiempo total. Optimizar las queries SQL no impacta mientras
 *     el trigger exista. Reducción real requeriría cambiar el trigger.
 */

header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=utf-8");
date_default_timezone_set('America/Bogota');
// Forzar collation en español para que strcoll() ordene "Ángela" < "Beatriz" correctamente.
setlocale(LC_COLLATE, 'es_ES.UTF-8', 'es_ES', 'es_ES.utf8', 'spanish', 'es');

require_once("datos_conexion.php");
require("headers.php");

mysqli_report(MYSQLI_REPORT_OFF);

$mysqli = new mysqli($host, $user, $pass, $database);
if ($mysqli->connect_error) {
    http_response_code(500);
    echo json_encode(['success' => false, 'msg' => 'Error de conexión a la base de datos']);
    exit;
}
$mysqli->set_charset('utf8');

$rawBody = file_get_contents('php://input');
$notas = json_decode($rawBody, true);

if (!is_array($notas) || count($notas) === 0) {
    http_response_code(400);
    echo json_encode(['success' => false, 'msg' => 'Payload inválido: se esperaba un array de notas']);
    exit;
}

$firstNote = $notas[0];
if (!is_array($firstNote) || empty($firstNote)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'msg' => 'Payload inválido: el primer elemento no es un objeto de nota']);
    exit;
}

try {
    $estadoRes = $mysqli->query("SELECT estado FROM estadoNotas LIMIT 1");
    if ($estadoRes) {
        $estadoRow = $estadoRes->fetch_assoc();
        if ($estadoRow && isset($estadoRow['estado']) && (string) $estadoRow['estado'] === '0') {
            echo json_encode(['msg' => 'Prohibido']);
            $mysqli->close();
            exit;
        }
    }
} catch (mysqli_sql_exception $e) {
    error_log("[guardar_notas] estadoNotas no disponible, se permite guardar: " . $e->getMessage());
}

$notaKeys = [];
foreach (array_keys($firstNote) as $key) {
    if (preg_match('/^nota(\d+)$/', $key, $m)) {
        $notaKeys[(int) $m[1]] = $key;
    }
}
ksort($notaKeys);

if (empty($notaKeys)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'msg' => 'Payload inválido: no se encontraron campos notaN']);
    exit;
}

foreach ($notaKeys as $n => $notaKey) {
    $aspectoKey = "aspecto$n";
    foreach ($notas as $nota) {
        $val = $nota[$notaKey] ?? null;
        $isEmpty = ($val === '' || $val === null || $val === '0.00' || $val === 0 || $val === '0');
        if (!$isEmpty) {
            $aspecto = $nota[$aspectoKey] ?? null;
            if ($aspecto === '' || $aspecto === null) {
                echo json_encode([
                    'msg' => 'error_de_aspecto',
                    'info_aspecto' => "Falta aspecto en la nota $n. No se ha guardado ninguna nota de este aspecto. Por favor asigne el aspecto para poder guardar las notas en el aspecto $n.",
                    'estudiante' => (string) ($nota['estudiante'] ?? ''),
                ]);
                $mysqli->close();
                exit;
            }
        }
    }
}

// Ordenar por nombre del estudiante (lookup bulk en estugrupos).
// Estudiante sin nombre (no aparece en estugrupos) va al final.
// En empates de nombre, orden secundario por id de estudiante.
$estudiantesIds = [];
foreach ($notas as $n) {
    $id = (string)($n['estudiante'] ?? '');
    if ($id !== '' && !isset($estudiantesIds[$id])) {
        $estudiantesIds[$id] = true;
    }
}
$estudiantesIds = array_keys($estudiantesIds);
if (!empty($estudiantesIds)) {
    $namePlaceholders = implode(',', array_fill(0, count($estudiantesIds), '?'));
    $nameStmt = $mysqli->prepare("SELECT estudiante, nombres FROM estugrupos WHERE estudiante IN ($namePlaceholders)");
    if ($nameStmt) {
        $nameStmt->bind_param(str_repeat('s', count($estudiantesIds)), ...$estudiantesIds);
        $nameStmt->execute();
        $nameResult = $nameStmt->get_result();
        $nameMap = [];
        while ($row = $nameResult->fetch_assoc()) {
            $nameMap[(string)$row['estudiante']] = (string)$row['nombres'];
        }
        $nameStmt->close();

        usort($notas, function($a, $b) use ($nameMap) {
            $idA = (string)($a['estudiante'] ?? '');
            $idB = (string)($b['estudiante'] ?? '');
            $nameA = $nameMap[$idA] ?? null;
            $nameB = $nameMap[$idB] ?? null;
            if ($nameA === null && $nameB === null) {
                $idAInt = is_numeric($idA) ? (int)$idA : 0;
                $idBInt = is_numeric($idB) ? (int)$idB : 0;
                return $idAInt <=> $idBInt;
            }
            if ($nameA === null) return 1;
            if ($nameB === null) return -1;
            $nameCmp = strcoll($nameA, $nameB);
            if ($nameCmp !== 0) return $nameCmp;
            $idAInt = is_numeric($idA) ? (int)$idA : 0;
            $idBInt = is_numeric($idB) ? (int)$idB : 0;
            return $idAInt <=> $idBInt;
        });
    }
}

$columns = array_keys($firstNote);
$columnList = implode(',', array_map(fn($c) => "`$c`", $columns));
$rowPlaceholder = '(' . implode(',', array_fill(0, count($columns), '?')) . ')';
$insertSql = "REPLACE INTO notas ($columnList) VALUES $rowPlaceholder";

$verifStmt = $mysqli->prepare("
    SELECT 1 FROM estugrupos
    WHERE estudiante = ? AND nivel = ? AND numero = ? AND (anio = ? OR year = ?)
    LIMIT 1
");
$stmt = $mysqli->prepare($insertSql);

if (!$verifStmt || !$stmt) {
    http_response_code(500);
    echo json_encode(['success' => false, 'msg' => 'Error preparando SQL', 'error' => $mysqli->error]);
    $mysqli->close();
    exit;
}

$saved = 0;
$skipped = 0;
$errors = [];
$types = str_repeat('s', count($columns));

try {
    $mysqli->begin_transaction();

    foreach ($notas as $idx => $nota) {
        $estudiante = (string) ($nota['estudiante'] ?? '');
        $grado = (string) ($nota['grado'] ?? '');
        $year = (int) ($nota['year'] ?? date('Y'));

        if ($estudiante === '' || $grado === '') {
            $skipped++;
            $errors[] = ['index' => $idx, 'reason' => 'Faltan campos requeridos (estudiante o grado)'];
            continue;
        }

        $nivel = null;
        $numero = '';
        if (strpos($grado, '-') !== false) {
            [$nivel, $numero] = array_pad(explode('-', $grado, 2), 2, '');
            $nivel = trim((string) $nivel);
            $numero = trim((string) $numero);
        } else {
            $nivel = trim($grado);
        }

        if ($nivel === '' || !ctype_digit($nivel)) {
            $skipped++;
            $errors[] = ['index' => $idx, 'estudiante' => $estudiante, 'grado' => $grado, 'reason' => "No se pudo parsear grado '$grado'"];
            continue;
        }

        $verifStmt->bind_param('sssii', $estudiante, $nivel, $numero, $year, $year);
        $verifStmt->execute();
        $verifResult = $verifStmt->get_result();

        if (!$verifResult || $verifResult->num_rows === 0) {
            $skipped++;
            $errors[] = [
                'index' => $idx,
                'estudiante' => $estudiante,
                'grado' => $grado,
                'reason' => "Estudiante no matriculado en nivel=$nivel numero=$numero año=$year",
            ];
            error_log("[guardar_notas] Skip estudiante=$estudiante grado=$grado year=$year");
            continue;
        }

        $params = [];
        foreach ($columns as $col) {
            $val = $nota[$col] ?? null;
            if ($val === '' || $val === '0.00' || $val === '0') {
                $params[] = null;
            } else {
                $params[] = $val;
            }
        }
        $stmt->bind_param($types, ...$params);
        if (!$stmt->execute()) {
            throw new mysqli_sql_exception("Error INSERT estudiante=$estudiante: " . $stmt->error);
        }
        $saved++;
    }

    $mysqli->commit();

    echo json_encode([
        'success' => true,
        'msg' => 'Exito',
        'saved' => $saved,
        'skipped' => $skipped,
        'errors' => $errors,
    ]);
} catch (Throwable $e) {
    $mysqli->rollback();
    error_log("[guardar_notas] Rollback: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'msg' => 'Error',
        'error' => $e->getMessage(),
        'saved' => $saved,
        'skipped' => $skipped,
        'errors' => $errors,
    ]);
}

$stmt->close();
$verifStmt->close();
$mysqli->close();
