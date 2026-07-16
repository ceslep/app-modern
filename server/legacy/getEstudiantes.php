<?php
/**
 * getEstudiantes.php — Fetch active students by group filter.
 *
 * Modernized version: uses PDO + prepared statements, returns
 * a consistent JSON envelope { success, data }.
 *
 * POST params (JSON body):
 *   asignacion  (string) Sede ID
 *   nivel       (string) Grade level
 *   numero      (string) Group number
 *   year        (string) Academic year (default: current year)
 *   sede        (string) Sede display name (optional, passed through)
 *   periodo     (string) Period code (optional, passed through)
 */
require_once __DIR__ . '/../config/app.php';
require_once __DIR__ . '/../config/database.php';

header('Content-Type: application/json; charset=utf-8');

try {
    // Accept data via POST body (JSON) OR GET params (via router.php?__api=students&asignacion=...)
    $raw = file_get_contents('php://input');
    $datos = $raw ? json_decode($raw) : null;

    if ($datos) {
        $asignacion = trim($datos->asignacion ?? '');
        $nivel      = trim($datos->nivel ?? '');
        $numero     = trim($datos->numero ?? '');
        $year       = trim($datos->year ?? date('Y'));
        $sede       = trim($datos->sede ?? '');
        $periodo    = trim($datos->periodo ?? '');
    } else {
        // Fallback: read from GET params (used by api.js legacy router)
        $asignacion = trim($_GET['asignacion'] ?? '');
        $nivel      = trim($_GET['nivel'] ?? '');
        $numero     = trim($_GET['numero'] ?? '');
        $year       = trim($_GET['year'] ?? date('Y'));
        $sede       = trim($_GET['sede'] ?? '');
        $periodo    = trim($_GET['periodo'] ?? '');
    }

    if (!$asignacion || !$nivel || !$numero) {
        throw new RuntimeException('Faltan parámetros requeridos: asignacion, nivel, numero');
    }

    $db = Database::getInstance()->getPdo();

    $stmt = $db->prepare('
        SELECT codigo, estudiante, nombres, nivel, numero, asignacion,
               :sede   AS establecimiento,
               :period AS periodo
        FROM estugrupos
        WHERE asignacion = :asig
          AND nivel      = :niv
          AND numero     = :num
          AND activo     = :act
          AND year       = :yr
        ORDER BY nombres
    ');
    $activo = 'S';
    $stmt->bindValue(':asig',  $asignacion, PDO::PARAM_STR);
    $stmt->bindValue(':niv',   $nivel,      PDO::PARAM_STR);
    $stmt->bindValue(':num',   $numero,     PDO::PARAM_STR);
    $stmt->bindValue(':act',   $activo,     PDO::PARAM_STR);
    $stmt->bindValue(':yr',    $year,       PDO::PARAM_STR);
    $stmt->bindValue(':sede',  $sede,       PDO::PARAM_STR);
    $stmt->bindValue(':period',$periodo,    PDO::PARAM_STR);
    $stmt->execute();

    $students = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
        'success' => true,
        'data'    => $students,
    ], JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error'   => $e->getMessage(),
    ], JSON_UNESCAPED_UNICODE);
}