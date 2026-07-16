<?php

header("Access-Control-Allow-Origin: *");
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/auth.php';

$identificacion = $_SESSION['identificacion'] ?? '';
$role = $_SESSION['role'] ?? '';
$year = date('Y');

if (!$identificacion) {
    http_response_code(401);
    echo json_encode(["error" => "No autenticado"]);
    exit;
}

try {
    $db = Database::getInstance()->getPdo();

    $isMaestra = ($role === 'maestra');
    $sedeCondition = '';
    $sedeParams = [];

    if (!$isMaestra) {
        $stmt = $db->prepare("SELECT asignacion FROM docentes WHERE identificacion = ? LIMIT 1");
        $stmt->execute([$identificacion]);
        $docente = $stmt->fetch(PDO::FETCH_ASSOC);
        $sede = $docente['asignacion'] ?? '';
        if ($sede) {
            $sedeCondition = 'AND e.asignacion = ?';
            $sedeParams[] = $sede;
        }
    }

    $params = [$year];
    $estudiantesSql = "SELECT COUNT(DISTINCT e.estudiante) FROM estugrupos e WHERE e.anio = ? AND e.activo = 'S' $sedeCondition";
    $stmt = $db->prepare($estudiantesSql);
    $stmt->execute(array_merge($params, $sedeParams));
    $totalEstudiantes = (int) $stmt->fetchColumn();

    $asignaturasSql = "SELECT COUNT(DISTINCT n.asignatura) FROM notas n WHERE n.year = ? AND n.asignatura <> 'x' $sedeCondition";
    if ($sedeCondition) {
        $asignaturasSql = str_replace('$sedeCondition', 'AND EXISTS (SELECT 1 FROM estugrupos e WHERE e.estudiante = n.estudiante AND e.asignacion = ? AND e.anio = ? AND e.activo = \'S\')', '');
    }
    if ($sedeCondition) {
        $stmt = $db->prepare("SELECT COUNT(DISTINCT n.asignatura) FROM notas n INNER JOIN estugrupos e ON n.estudiante = e.estudiante WHERE n.year = ? AND n.asignatura <> 'x' AND e.asignacion = ? AND e.anio = ? AND e.activo = 'S'");
        $stmt->execute([$year, $sede, $year]);
    } else {
        $stmt = $db->prepare("SELECT COUNT(DISTINCT asignatura) FROM notas WHERE year = ? AND asignatura <> 'x'");
        $stmt->execute([$year]);
    }
    $totalAsignaturas = (int) $stmt->fetchColumn();

    $maxEsperado = $totalEstudiantes * $totalAsignaturas;

    $periodoStmt = $db->prepare("SELECT nombre FROM periodos WHERE CURDATE() BETWEEN fechainicial AND fechafinal AND nombre <> 'MINIMAS' LIMIT 1");
    $periodoStmt->execute();
    $periodoActual = $periodoStmt->fetchColumn() ?: 'UNO';

    if ($sedeCondition) {
        $stmt = $db->prepare("SELECT COUNT(*) FROM notas n INNER JOIN estugrupos e ON n.estudiante = e.estudiante WHERE n.periodo = ? AND n.year = ? AND e.asignacion = ? AND e.anio = ? AND e.activo = 'S' AND n.valoracion IS NOT NULL");
        $stmt->execute([$periodoActual, $year, $sede, $year]);
    } else {
        $stmt = $db->prepare("SELECT COUNT(*) FROM notas WHERE periodo = ? AND year = ? AND valoracion IS NOT NULL");
        $stmt->execute([$periodoActual, $year]);
    }
    $totalValoraciones = (int) $stmt->fetchColumn();

    $porcentaje = $maxEsperado > 0 ? round(($totalValoraciones / $maxEsperado) * 100, 1) : 0;

    echo json_encode([
        "total_estudiantes" => $totalEstudiantes,
        "total_asignaturas" => $totalAsignaturas,
        "total_valoraciones" => $totalValoraciones,
        "max_esperado" => $maxEsperado,
        "porcentaje_valoraciones" => $porcentaje,
        "periodo_actual" => $periodoActual,
        "year" => $year,
    ], JSON_UNESCAPED_UNICODE);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["error" => $e->getMessage()]);
}
