<?php
/**
 * guardar_notas2.php — modernizado.
 *
 * Mismo enfoque que guardar_notas.php:
 *   - Prepared statements, transacciones, detección dinámica
 *   - Verificación de enrollment correcta
 *
 * Diferencias:
 *   - Tabla destino: `notas2` (en vez de `notas`)
 *   - Tabla `notas2` no tiene UNIQUE constraint — INSERT puede duplicar (bug pre-existente)
 *   - Side-effect: insertar/actualizar en `aspectosIndividuales`
 *
 * IMPORTANTE: `aspectosIndividuales` NO EXISTE en la DB actual (verificado Fase 0).
 *   - El legacy fallaba silenciosamente (mysqli->query sin chequeo)
 *   - Esta versión detecta la ausencia y loggea warning, sin abortar el guardado principal
 *   - Si la tabla se crea en el futuro, el código la usará automáticamente
 *
 * Mantiene contrato con src/modules/notas.js:1418 (fire-and-forget):
 *   - Antes no retornaba nada al cliente
 *   - Ahora retorna JSON por consistencia con guardar_notas.php
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
$year = (int) date('Y');

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

$aspectosTableExists = false;
$aspectosTableUsable = false;
$aspectosError = null;

try {
    $check = $mysqli->query("SHOW TABLES LIKE 'aspectosIndividuales'");
    $aspectosTableExists = ($check && $check->num_rows > 0);
} catch (mysqli_sql_exception $e) {
    $aspectosTableExists = false;
    $aspectosError = $e->getMessage();
}

if ($aspectosTableExists) {
    try {
        $verify = $mysqli->query("SELECT 1 FROM aspectosIndividuales LIMIT 0");
        $aspectosTableUsable = ($verify !== false);
        if ($verify) $verify->close();
    } catch (mysqli_sql_exception $e) {
        $aspectosTableUsable = false;
        $aspectosError = $e->getMessage();
    }
}

if (!$aspectosTableExists) {
    error_log("[guardar_notas2] Tabla aspectosIndividuales no existe en metadata — se omite el side-effect de aspectos.");
} elseif (!$aspectosTableUsable) {
    error_log("[guardar_notas2] Tabla aspectosIndividuales existe en metadata pero NO es usable (engine error: " . ($aspectosError ?: 'desconocido') . "). Posible corrupción InnoDB. Se omite el side-effect de aspectos.");
}

$aspectosList = [];
$docenteCtx = null;
$gradoCtx = null;
$periodoCtx = null;
$asignaturaCtx = null;

foreach ($notas as $nota) {
    if ($docenteCtx === null) {
        $docenteCtx = (string) ($nota['docente'] ?? '');
        $gradoCtx = (string) ($nota['grado'] ?? '');
        $periodoCtx = (string) ($nota['periodo'] ?? '');
        $asignaturaCtx = (string) ($nota['asignatura'] ?? '');
    }
    if (!$aspectosTableExists || !$aspectosTableUsable) break;

    foreach ($notaKeys as $n => $notaKey) {
        $aspectoKey = "aspecto$n";
        $porcentajeKey = "porcentaje$n";
        $fechaaKey = "fechaa$n";

        $aspectoVal = $nota[$aspectoKey] ?? '';
        if ($aspectoVal === '' || $aspectoVal === null) continue;

        $aspectosList[] = [
            'docente' => $docenteCtx,
            'grado' => $gradoCtx,
            'periodo' => $periodoCtx,
            'asignatura' => $asignaturaCtx,
            'aspecto' => (string) $aspectoVal,
            'porcentaje' => $nota[$porcentajeKey] ?? null,
            'fecha' => $nota[$fechaaKey] ?? null,
            'nota' => $n,
            'year' => $year,
        ];
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
$placeholders = implode(',', array_fill(0, count($columns), '?'));

$verifStmt = $mysqli->prepare("
    SELECT 1 FROM estugrupos
    WHERE estudiante = ?
      AND nivel = ?
      AND numero = ?
      AND (anio = ? OR year = ?)
    LIMIT 1
");
if (!$verifStmt) {
    http_response_code(500);
    echo json_encode(['success' => false, 'msg' => 'Error preparando verificación', 'error' => $mysqli->error]);
    $mysqli->close();
    exit;
}

$insertSql = "INSERT INTO notas2 ($columnList) VALUES ($placeholders)";
$stmt = $mysqli->prepare($insertSql);
if (!$stmt) {
    http_response_code(500);
    echo json_encode(['success' => false, 'msg' => 'Error preparando INSERT', 'error' => $mysqli->error, 'sql' => $insertSql]);
    $verifStmt->close();
    $mysqli->close();
    exit;
}

$aspectosStmt = null;
if ($aspectosTableUsable && !empty($aspectosList)) {
    $aspectosStmt = $mysqli->prepare("
        REPLACE INTO aspectosIndividuales (docente, grado, periodo, asignatura, aspecto, porcentaje, fecha, nota, year)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ");
    if ($aspectosStmt === false) {
        error_log("[guardar_notas2] No se pudo preparar INSERT de aspectos: " . $mysqli->error . " (errno=" . $mysqli->errno . ")");
        $aspectosStmt = null;
    }
}

$savedNotas = 0;
$skippedNotas = 0;
$errors = [];
$savedAspectos = 0;
$aspectosError = null;

try {
    $mysqli->begin_transaction();

    foreach ($notas as $idx => $nota) {
        $estudiante = (string) ($nota['estudiante'] ?? '');
        $grado = (string) ($nota['grado'] ?? '');
        $yearNota = (int) ($nota['year'] ?? $year);

        if ($estudiante === '' || $grado === '') {
            $skippedNotas++;
            $errors[] = ['index' => $idx, 'reason' => 'Faltan campos requeridos'];
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
            $skippedNotas++;
            $errors[] = ['index' => $idx, 'estudiante' => $estudiante, 'grado' => $grado, 'reason' => "No se pudo parsear grado '$grado'"];
            continue;
        }

        $verifStmt->bind_param('sssii', $estudiante, $nivel, $numero, $yearNota, $yearNota);
        $verifStmt->execute();
        $verifResult = $verifStmt->get_result();

        if (!$verifResult || $verifResult->num_rows === 0) {
            $skippedNotas++;
            $errors[] = [
                'index' => $idx,
                'estudiante' => $estudiante,
                'grado' => $grado,
                'reason' => "Estudiante no matriculado en nivel=$nivel numero=$numero año=$yearNota",
            ];
            continue;
        }

        $params = [];
        $types = '';
        foreach ($columns as $col) {
            $val = $nota[$col] ?? null;
            if ($val === '' || $val === '0.00' || $val === '0') {
                $params[] = null;
            } else {
                $params[] = $val;
            }
            $types .= 's';
        }

        $stmt->bind_param($types, ...$params);
        if (!$stmt->execute()) {
            throw new mysqli_sql_exception("Error en INSERT nota[$idx]: " . $stmt->error);
        }
        $savedNotas++;
    }

    if ($aspectosStmt && !empty($aspectosList)) {
        foreach ($aspectosList as $asp) {
            $porcentaje = (is_numeric($asp['porcentaje']) && (float) $asp['porcentaje'] != 0) ? (float) $asp['porcentaje'] : null;
            $fecha = ($asp['fecha'] && $asp['fecha'] !== '0000-00-00') ? (string) $asp['fecha'] : null;
            $notaNum = (int) $asp['nota'];
            $yearNum = (int) $asp['year'];
            $docente = (string) $asp['docente'];
            $grado = (string) $asp['grado'];
            $periodo = (string) $asp['periodo'];
            $asignatura = (string) $asp['asignatura'];
            $aspecto = (string) $asp['aspecto'];

            $bindOk = $aspectosStmt->bind_param(
                'sssssdsii',
                $docente,
                $grado,
                $periodo,
                $asignatura,
                $aspecto,
                $porcentaje,
                $fecha,
                $notaNum,
                $yearNum
            );
            if (!$bindOk) {
                throw new mysqli_sql_exception("Error en bind_param de aspecto: " . $aspectosStmt->error);
            }
            if ($aspectosStmt->execute()) {
                $savedAspectos++;
            } else {
                throw new mysqli_sql_exception("Error en INSERT aspecto: " . $aspectosStmt->error);
            }
        }
    }

    $mysqli->commit();

    echo json_encode([
        'success' => true,
        'msg' => 'Exito',
        'saved_notas' => $savedNotas,
        'skipped_notas' => $skippedNotas,
        'saved_aspectos' => $savedAspectos,
        'aspectos_table_exists' => $aspectosTableExists,
        'aspectos_table_usable' => $aspectosTableUsable,
        'aspectos_warning' => $aspectosError,
        'errors' => $errors,
    ]);
} catch (Throwable $e) {
    $mysqli->rollback();
    error_log("[guardar_notas2] Rollback: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'msg' => 'Error',
        'error' => $e->getMessage(),
        'saved_notas' => $savedNotas,
        'skipped_notas' => $skippedNotas,
        'errors' => $errors,
    ]);
}

$stmt->close();
$verifStmt->close();
if ($aspectosStmt) $aspectosStmt->close();
$mysqli->close();
