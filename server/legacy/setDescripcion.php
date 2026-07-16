<?php
/**
 * setDescripcion.php — Insert/Update a record in `desempenos`.
 *
 * POST JSON body: { docente, asignatura, periodo, nivel, numero, desempeno, descripcion }
 * Uses REPLACE INTO so existing rows for the same (grado, asignatura, periodo,
 * desempeno, year) are updated in place — matches legacy `guardarDesempenos.php`.
 */
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/../config/app.php';
require_once __DIR__ . '/../config/database.php';

try {
    $db = Database::getInstance()->getPdo();
    $datos = json_decode(file_get_contents('php://input'));
    if (!$datos) {
        throw new Exception('Cuerpo JSON inválido o vacío');
    }

    $docente      = trim((string)($datos->docente      ?? ''));
    $asignatura   = trim((string)($datos->asignatura   ?? ''));
    $periodo      = trim((string)($datos->periodo      ?? ''));
    $nivel        = (int)   ($datos->nivel             ?? -1);
    $numero       = (int)   ($datos->numero            ?? -1);
    $desempeno    = trim((string)($datos->desempeno    ?? ''));
    $descripcion  = trim((string)($datos->descripcion  ?? ''));

    if ($docente === '' || $asignatura === '' || $periodo === '' ||
        $nivel < 0 || $numero < 0 || $desempeno === '' || $descripcion === '') {
        throw new Exception('Faltan campos obligatorios (docente, asignatura, periodo, nivel, numero, desempeno, descripcion)');
    }

    $validDesempenos = ['SUPERIOR', 'ALTO', 'BASICO', 'BAJO'];
    if (!in_array(strtoupper($desempeno), $validDesempenos, true)) {
        throw new Exception('Desempeño inválido. Use SUPERIOR, ALTO, BASICO o BAJO');
    }

    $periodo = strtoupper($periodo);
    if ($periodo === 'FINAL') $periodo = 'CINCO';
    $validPeriodos = ['UNO', 'DOS', 'TRES', 'CUATRO', 'CINCO'];
    if (!in_array($periodo, $validPeriodos, true)) {
        throw new Exception('Periodo inválido. Use UNO, DOS, TRES, CUATRO o CINCO');
    }

    $grado = $nivel . '-' . $numero;
    $year  = (int) date('Y');
    $desempeno = strtoupper($desempeno);

    $stmt = $db->prepare("
        REPLACE INTO desempenos
            (grado, docente, asignatura, desempeno, descripcion, descripcionEspecial, periodo, year)
        VALUES (?, ?, ?, ?, ?, '', ?, ?)
    ");
    $stmt->execute([$grado, $docente, $asignatura, $desempeno, $descripcion, $periodo, $year]);

    success([
        'grado'       => $grado,
        'docente'     => $docente,
        'asignatura'  => $asignatura,
        'periodo'     => $periodo,
        'desempeno'   => $desempeno,
        'nivel'       => $nivel,
        'numero'      => $numero,
    ], 'Descripción guardada correctamente');
} catch (Exception $e) {
    http_response_code(400);
    error($e->getMessage());
}
