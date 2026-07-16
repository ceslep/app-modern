<?php

/**
 * reports/stats/full — Estadísticas académicas completas.
 *
 * Fuente única de datos del módulo estadisticas.js. Toda la agregación
 * se basa en la tabla `notas` (unida a `estugrupos` cuando hay filtros
 * de sede/nivel/grupo). Usa prepared statements en todas las consultas.
 *
 * Contrato de salida: ver bloque json_encode al final. Los campos
 * numéricos se normalizan a float/int aquí (PDO los devuelve como string).
 */

header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/../config/database.php';

/**
 * Devuelve un error JSON estructurado sin filtrar detalles internos al
 * cliente, dejando traza en el log del servidor.
 */
function statsError(string $publicMsg, int $httpCode, ?Throwable $e = null): void
{
    if ($e) {
        error_log('[getDataGraphFull] ' . $e->getMessage());
    }
    http_response_code($httpCode);
    echo json_encode(['error' => $publicMsg], JSON_UNESCAPED_UNICODE);
    exit;
}

$input = getJsonInput();

// ── Validación / saneamiento de parámetros de entrada ──
// El servidor es la fuente de verdad del año (evita desfase de timezone
// cliente/servidor). Si el cliente envía year, debe ser un entero plausible.
$year = date('Y');
if (isset($input->year) && $input->year !== '' && $input->year !== null) {
    if (!is_numeric($input->year)) {
        statsError('Parámetro "year" inválido', 400);
    }
    $y = (int) $input->year;
    if ($y < 2000 || $y > 2100) {
        statsError('Parámetro "year" fuera de rango', 400);
    }
    $year = $y;
}

// Filtros opcionales: normalizar a string no vacío o null.
$normFilter = static function ($v): ?string {
    if ($v === null) return null;
    $v = trim((string) $v);
    return $v === '' ? null : $v;
};
$asignacion = $normFilter($input->asignacion ?? null);
$nivel      = $normFilter($input->nivel ?? null);
$numero     = $normFilter($input->numero ?? null);
$asignatura = $normFilter($input->asignatura ?? null);

$needsJoin = $asignacion !== null || $nivel !== null || $numero !== null;
$joins = '';
$conditions = ['n.year = ?'];
$params = [$year];

if ($needsJoin) {
    $joins = 'INNER JOIN estugrupos e ON n.estudiante = e.estudiante';
    $conditions[] = 'e.anio = ?';
    $params[] = $year;
    $conditions[] = "e.activo = 'S'";
    if ($asignacion !== null) {
        $conditions[] = 'e.asignacion = ?';
        $params[] = $asignacion;
    }
    if ($nivel !== null) {
        $conditions[] = 'e.nivel = ?';
        $params[] = $nivel;
    }
    if ($numero !== null) {
        $conditions[] = 'e.numero = ?';
        $params[] = $numero;
    }
}

if ($asignatura !== null) {
    $conditions[] = 'n.asignatura = ?';
    $params[] = $asignatura;
} else {
    $conditions[] = "n.asignatura <> 'x'";
}

$where = implode(' AND ', $conditions);

try {
    $db = Database::getInstance()->getPdo();
} catch (Throwable $e) {
    statsError('Servicio de base de datos no disponible', 503, $e);
}

try {
    // 1. Subject averages
    $stmt = $db->prepare("
        SELECT n.asignatura, ROUND(AVG(n.valoracion), 2) AS valoracion
        FROM notas n $joins
        WHERE $where
        GROUP BY n.asignatura
        ORDER BY n.asignatura
    ");
    $stmt->execute($params);
    $asignaturas = $stmt->fetchAll(PDO::FETCH_ASSOC);
    // Normalizar valoracion a float (PDO devuelve string en DECIMAL).
    foreach ($asignaturas as &$a) {
        $a['valoracion'] = $a['valoracion'] !== null ? (float) $a['valoracion'] : null;
    }
    unset($a);

    // 2. Grade range distribution
    $stmt = $db->prepare("
        SELECT
            CASE
                WHEN n.valoracion >= 1 AND n.valoracion < 3 THEN '1 - 2.9'
                WHEN n.valoracion >= 3 AND n.valoracion < 4 THEN '3 - 3.9'
                WHEN n.valoracion >= 4 AND n.valoracion < 4.5 THEN '4 - 4.4'
                WHEN n.valoracion >= 4.5 AND n.valoracion <= 5 THEN '4.5 - 5'
                ELSE 'Sin nota'
            END AS rango,
            COUNT(*) AS cantidad
        FROM notas n $joins
        WHERE $where AND n.valoracion IS NOT NULL
        GROUP BY rango
        ORDER BY MIN(n.valoracion)
    ");
    $stmt->execute($params);
    $distribucionRangos = array_map(static function ($r) {
        return ['rango' => $r['rango'], 'cantidad' => (int) $r['cantidad']];
    }, $stmt->fetchAll(PDO::FETCH_ASSOC));

    // 3. Gender distribution (siempre requiere estugrupos).
    // NOTA DE INTEGRIDAD: cuando no hay filtros de sede/nivel/grupo, esta
    // consulta añade el JOIN a estugrupos SIN e.activo='S' para mantener el
    // comportamiento histórico. Los estudiantes sin registro en estugrupos
    // del año, o con genero vacío, quedan fuera de este gráfico pero SÍ
    // cuentan en total_valoraciones; por eso la suma por género puede ser
    // menor que total_valoraciones. Es esperado, no un error de cuadre.
    $genderConditions = $conditions;
    $genderParams = $params;
    $genderJoinClause = $joins ?: 'INNER JOIN estugrupos e ON n.estudiante = e.estudiante';
    if ($genderJoinClause !== $joins) {
        $genderConditions[] = 'e.anio = ?';
        $genderParams[] = $year;
    }
    $genderWhere = implode(' AND ', $genderConditions);

    $stmt = $db->prepare("
        SELECT
            CASE
                WHEN e.genero IN ('M','Masculino','masculino') THEN 'Masculino'
                WHEN e.genero IN ('F','Femenino','femenino') THEN 'Femenino'
                ELSE 'Sin determinar'
            END AS genero,
            COUNT(*) AS cantidad,
            ROUND(AVG(n.valoracion), 2) AS promedio
        FROM notas n
        $genderJoinClause
        WHERE $genderWhere AND n.valoracion IS NOT NULL
          AND e.genero IS NOT NULL AND e.genero != ''
        GROUP BY
            CASE
                WHEN e.genero IN ('M','Masculino','masculino') THEN 'Masculino'
                WHEN e.genero IN ('F','Femenino','femenino') THEN 'Femenino'
                ELSE 'Sin determinar'
            END
    ");
    $stmt->execute($genderParams);
    $distribucionGenero = array_map(static function ($g) {
        return [
            'genero'   => $g['genero'],
            'cantidad' => (int) $g['cantidad'],
            'promedio' => $g['promedio'] !== null ? (float) $g['promedio'] : 0.0,
        ];
    }, $stmt->fetchAll(PDO::FETCH_ASSOC));

    // 4. Overall stats
    $stmt = $db->prepare("
        SELECT
            COUNT(*) AS total_valoraciones,
            ROUND(AVG(n.valoracion), 2) AS promedio_general,
            ROUND(MIN(n.valoracion), 2) AS nota_minima,
            ROUND(MAX(n.valoracion), 2) AS nota_maxima
        FROM notas n $joins
        WHERE $where AND n.valoracion IS NOT NULL
    ");
    $stmt->execute($params);
    $generales = $stmt->fetch(PDO::FETCH_ASSOC) ?: [];

    $totalValoraciones = (int) ($generales['total_valoraciones'] ?? 0);
    $promedioGeneral = $generales['promedio_general'] !== null ? (float) $generales['promedio_general'] : 0.0;
    $notaMinima = $generales['nota_minima'] !== null ? (float) $generales['nota_minima'] : 0.0;
    $notaMaxima = $generales['nota_maxima'] !== null ? (float) $generales['nota_maxima'] : 0.0;

    // 5. Per-group average (si hay filtro de nivel activo)
    $promedioGrupos = [];
    if ($nivel !== null) {
        $stmt = $db->prepare("
            SELECT e.numero, ROUND(AVG(n.valoracion), 2) AS promedio, COUNT(*) AS total
            FROM notas n
            INNER JOIN estugrupos e ON n.estudiante = e.estudiante
            WHERE $where AND n.valoracion IS NOT NULL
            GROUP BY e.numero
            ORDER BY e.numero
        ");
        $stmt->execute($params);
        $promedioGrupos = array_map(static function ($g) {
            return [
                'numero'   => $g['numero'],
                'promedio' => $g['promedio'] !== null ? (float) $g['promedio'] : 0.0,
                'total'    => (int) $g['total'],
            ];
        }, $stmt->fetchAll(PDO::FETCH_ASSOC));
    }

    // 6. Descriptive statistics
    $descriptivas = [];

    $stmt = $db->prepare("
        SELECT
            ROUND(AVG(n.valoracion), 4) AS media,
            ROUND(STDDEV_POP(n.valoracion), 4) AS desviacion_estandar,
            ROUND(VAR_POP(n.valoracion), 4) AS varianza
        FROM notas n $joins
        WHERE $where AND n.valoracion IS NOT NULL
    ");
    $stmt->execute($params);
    $desc = $stmt->fetch(PDO::FETCH_ASSOC) ?: [];
    $descriptivas['media'] = round((float) ($desc['media'] ?? 0), 2);
    $descriptivas['desviacion_estandar'] = (float) ($desc['desviacion_estandar'] ?? 0);
    $descriptivas['varianza'] = (float) ($desc['varianza'] ?? 0);

    $avgVal = $promedioGeneral;
    $descriptivas['coeficiente_variacion'] = $avgVal > 0
        ? round($descriptivas['desviacion_estandar'] / $avgVal * 100, 2)
        : 0;
    $descriptivas['rango'] = round($notaMaxima - $notaMinima, 2);

    $stmt = $db->prepare("
        SELECT n.valoracion AS moda, COUNT(*) AS frecuencia
        FROM notas n $joins
        WHERE $where AND n.valoracion IS NOT NULL
        GROUP BY n.valoracion
        ORDER BY COUNT(*) DESC
        LIMIT 1
    ");
    $stmt->execute($params);
    $moda = $stmt->fetch(PDO::FETCH_ASSOC);
    $descriptivas['moda'] = $moda ? (float) $moda['moda'] : null;
    $descriptivas['frecuencia_moda'] = $moda ? (int) $moda['frecuencia'] : 0;

    $stmt = $db->prepare("
        SELECT
            SUM(CASE WHEN n.valoracion >= 3 THEN 1 ELSE 0 END) AS aprobados,
            SUM(CASE WHEN n.valoracion < 3 THEN 1 ELSE 0 END) AS reprobados
        FROM notas n $joins
        WHERE $where AND n.valoracion IS NOT NULL
    ");
    $stmt->execute($params);
    $ap = $stmt->fetch(PDO::FETCH_ASSOC) ?: [];
    $descriptivas['aprobados'] = (int) ($ap['aprobados'] ?? 0);
    $descriptivas['reprobados'] = (int) ($ap['reprobados'] ?? 0);
    $totalApr = $descriptivas['aprobados'] + $descriptivas['reprobados'];
    $descriptivas['tasa_aprobacion'] = $totalApr > 0
        ? round($descriptivas['aprobados'] / $totalApr * 100, 1)
        : 0;

    $stmt = $db->prepare("
        SELECT
            AVG(CASE WHEN rn = FLOOR((cnt+1)/2) OR rn = CEIL((cnt+1)/2) THEN valoracion END) AS mediana,
            AVG(CASE WHEN rn = FLOOR((cnt+1)/4) OR rn = CEIL((cnt+1)/4) THEN valoracion END) AS q1,
            AVG(CASE WHEN rn = FLOOR(3*(cnt+1)/4) OR rn = CEIL(3*(cnt+1)/4) THEN valoracion END) AS q3
        FROM (
            SELECT valoracion,
                   ROW_NUMBER() OVER (ORDER BY valoracion) AS rn,
                   COUNT(*) OVER () AS cnt
            FROM notas n $joins
            WHERE $where AND n.valoracion IS NOT NULL
        ) sub
    ");
    $stmt->execute($params);
    $qt = $stmt->fetch(PDO::FETCH_ASSOC);
    $descriptivas['mediana'] = $qt ? round((float) $qt['mediana'], 2) : 0;
    $descriptivas['q1'] = $qt ? round((float) $qt['q1'], 2) : 0;
    $descriptivas['q3'] = $qt ? round((float) $qt['q3'], 2) : 0;
    $descriptivas['iqr'] = round((float) $descriptivas['q3'] - (float) $descriptivas['q1'], 2);

    $descriptivas['sesgo'] = $descriptivas['desviacion_estandar'] > 0
        ? round(3 * ($avgVal - $descriptivas['mediana']) / $descriptivas['desviacion_estandar'], 4)
        : 0;

    // 7. Top/bottom subjects
    $sorted = $asignaturas;
    usort($sorted, static fn($a, $b) => ($b['valoracion'] ?? 0) <=> ($a['valoracion'] ?? 0));
    $hasSubjects = count($sorted) > 0;

    echo json_encode([
        'asignaturas'         => $asignaturas,
        'promedio_general'    => $promedioGeneral,
        'nota_minima'         => $notaMinima,
        'nota_maxima'         => $notaMaxima,
        'total_valoraciones'  => $totalValoraciones,
        'distribucion_rangos' => $distribucionRangos,
        'distribucion_genero' => $distribucionGenero,
        'promedio_grupos'     => $promedioGrupos,
        'mejor_asignatura'    => $hasSubjects ? $sorted[0]['asignatura'] : null,
        'mejor_promedio'      => $hasSubjects ? $sorted[0]['valoracion'] : null,
        'peor_asignatura'     => $hasSubjects ? $sorted[count($sorted) - 1]['asignatura'] : null,
        'peor_promedio'       => $hasSubjects ? $sorted[count($sorted) - 1]['valoracion'] : null,
        'descriptivas'        => $descriptivas,
    ], JSON_UNESCAPED_UNICODE);
} catch (PDOException $e) {
    statsError('Error al calcular las estadísticas', 500, $e);
} catch (Throwable $e) {
    statsError('Error inesperado', 500, $e);
}
