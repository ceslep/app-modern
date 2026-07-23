<?php

header("Access-Control-Allow-Origin: *");
header('Content-Type: application/json; charset=utf-8');
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

function queryCount(PDO $db, string $sql, array $params = []): int
{
    try {
        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        return (int) $stmt->fetchColumn();
    } catch (Throwable) {
        return 0;
    }
}

try {
    $db = Database::getInstance()->getPdo();

    $isMaestra = ($role === 'maestra');
    if (!$isMaestra) {
        $acceso = queryCount($db, "SELECT COUNT(*) FROM docentes WHERE identificacion = ? AND acceso_total = 'S' LIMIT 1", [$identificacion]);
        if ($acceso > 0) $isMaestra = true;
    }

    $periodoStmt = $db->prepare("SELECT nombre, fechainicial, fechafinal FROM periodos WHERE CURDATE() BETWEEN fechainicial AND fechafinal AND nombre <> 'MINIMAS' LIMIT 1");
    $periodoStmt->execute();
    $periodoRow = $periodoStmt->fetch(PDO::FETCH_ASSOC) ?: null;
    $periodoActual = $periodoRow['nombre'] ?? 'UNO';

    // Convivencia data may lag behind the current year. If there are no records
    // for the current year, fall back to the most recent year that has data so
    // the dashboard card is not misleadingly empty.
    $convYear = $year;
    if (queryCount($db, "SELECT COUNT(*) FROM convivencia WHERE year = ?", [$year]) === 0) {
        try {
            $maxConv = $db->query("SELECT MAX(year) FROM convivencia")->fetchColumn();
            if ($maxConv) $convYear = (int) $maxConv;
        } catch (Throwable) { /* keep current year */ }
    }

    // Convivencia has no `periodo` column — only `fecha`. Map the current
    // period's month-day window onto the data year (`convYear`) so the card
    // reflects the current period even when the data lags a year behind.
    $convPeriodStart = null;
    $convPeriodEnd = null;
    if ($periodoRow && !empty($periodoRow['fechainicial']) && !empty($periodoRow['fechafinal'])) {
        $mdStart = date('m-d', strtotime($periodoRow['fechainicial']));
        $mdEnd   = date('m-d', strtotime($periodoRow['fechafinal']));
        $convPeriodStart = "$convYear-$mdStart";
        $convPeriodEnd   = "$convYear-$mdEnd";
    }
    // Build the convivencia WHERE fragment + params for the period window.
    $convPeriodSql = ($convPeriodStart && $convPeriodEnd) ? " AND fecha BETWEEN ? AND ?" : "";
    $convPeriodParams = ($convPeriodStart && $convPeriodEnd) ? [$convPeriodStart, $convPeriodEnd] : [];

    if ($isMaestra) {
        $totalEstudiantes   = queryCount($db, "SELECT COUNT(DISTINCT e.estudiante) FROM estugrupos e WHERE e.anio = ? AND e.activo = 'S'", [$year]);
        $totalAsignaturas   = queryCount($db, "SELECT COUNT(DISTINCT asignatura) FROM notas WHERE year = ? AND asignatura <> 'x'", [$year]);
        $totalValoraciones  = queryCount($db, "SELECT COUNT(*) FROM notas WHERE periodo = ? AND year = ? AND valoracion IS NOT NULL", [$periodoActual, $year]);
        $totalInasistencias = queryCount($db, "SELECT COUNT(*) FROM inasistencia WHERE year = ?", [$year]);
        $totalConvivencia   = queryCount($db, "SELECT COUNT(*) FROM convivencia WHERE year = ?$convPeriodSql", array_merge([$convYear], $convPeriodParams));
        $totalDescripciones = 0;
        foreach (['desempenos','desempenos2','desempenos3'] as $t) {
            $totalDescripciones += queryCount($db,
                "SELECT COUNT(DISTINCT CONCAT_WS('|',grado,asignatura,periodo)) FROM $t WHERE periodo = ? AND year = ?",
                [$periodoActual, $year]);
        }
    } else {
        $totalEstudiantes   = queryCount($db,
            "SELECT COUNT(DISTINCT e.estudiante) FROM estugrupos e
             INNER JOIN asignacion_asignaturas aa ON aa.nivel = e.nivel AND aa.numero = e.numero AND aa.year = e.anio
             WHERE e.anio = ? AND e.activo = 'S' AND aa.docente = ?",
            [$year, $identificacion]);
        if ($totalEstudiantes === 0) {
            $totalEstudiantes = queryCount($db,
                "SELECT COUNT(DISTINCT n.estudiante) FROM notas n WHERE n.docente = ? AND n.year = ?",
                [$identificacion, $year]);
        }
        $totalAsignaturas   = queryCount($db,
            "SELECT COUNT(*) FROM asignacion_asignaturas aa WHERE aa.docente = ? AND aa.year = ?",
            [$identificacion, $year]);
        $totalValoraciones  = queryCount($db,
            "SELECT COUNT(*) FROM notas WHERE docente = ? AND periodo = ? AND year = ? AND valoracion IS NOT NULL",
            [$identificacion, $periodoActual, $year]);
        $totalInasistencias = queryCount($db,
            "SELECT COUNT(*) FROM inasistencia WHERE docente = ? AND year = ?",
            [$identificacion, $year]);
        $totalConvivencia   = queryCount($db,
            "SELECT COUNT(*) FROM convivencia WHERE docente = ? AND year = ?$convPeriodSql",
            array_merge([$identificacion, $convYear], $convPeriodParams));
        $totalDescripciones = 0;
        foreach (['desempenos','desempenos2','desempenos3'] as $t) {
            $totalDescripciones += queryCount($db,
                "SELECT COUNT(DISTINCT CONCAT_WS('|',grado,asignatura,periodo)) FROM $t WHERE periodo = ? AND year = ? AND docente = ?",
                [$periodoActual, $year, $identificacion]);
        }
    }

    $maxEsperado = $totalEstudiantes * $totalAsignaturas;
    $porcentaje = $maxEsperado > 0 ? round(($totalValoraciones / $maxEsperado) * 100, 1) : 0;

    $descMaxEsperado = $totalAsignaturas * 4;
    $porcentajeDescripciones = $descMaxEsperado > 0 ? round(($totalDescripciones / $descMaxEsperado) * 100, 1) : 0;

    echo json_encode([
        "total_estudiantes" => $totalEstudiantes,
        "total_asignaturas" => $totalAsignaturas,
        "total_valoraciones" => $totalValoraciones,
        "max_esperado" => $maxEsperado,
        "porcentaje_valoraciones" => $porcentaje,
        "periodo_actual" => $periodoActual,
        "total_inasistencias" => $totalInasistencias,
        "total_convivencia" => $totalConvivencia,
        "convivencia_year" => $convYear,
        "convivencia_periodo" => $periodoActual,
        "total_descripciones" => $totalDescripciones,
        "porcentaje_descripciones" => $porcentajeDescripciones,
        "year" => $year,
    ], JSON_UNESCAPED_UNICODE);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(["error" => $e->getMessage(), "type" => get_class($e)]);
}
