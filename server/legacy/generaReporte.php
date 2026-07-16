<?php
/**
 * generaReporte.php — Generate academic report cards (Excel + PDF).
 *
 * Modernized from the legacy version: uses PDO via Database class,
 * prepared statements everywhere, and preserves all features from
 * the parent (director, puestos, promedio, PDF, datoss).
 *
 * POST params (JSON body):
 *   estudiante, nombres, codigo, nivel, numero, asignacion, year,
 *   periodo, establecimiento (sede name),
 *   createFolder ("S"), puesto_ie, puesto_grupo, promedio
 */

// Suppress PHP 8.2 deprecation warnings from legacy PhpSpreadsheet
// (the library uses ${var} syntax in Xlsx.php:337). The router's
// set_exception_handler converts those into HTTP 500; this filter
// keeps the warnings as warnings, not exceptions.
error_reporting(E_ALL & ~E_DEPRECATED & ~E_USER_DEPRECATED);

require_once __DIR__ . '/../config/app.php';
require_once __DIR__ . '/../config/database.php';

// PhpSpreadsheet
$autoloadPaths = [
    __DIR__ . '/../../vendor/autoload.php',
    __DIR__ . '/vendor/autoload.php',
    __DIR__ . '/../vendor/autoload.php',
];
$loaded = false;
foreach ($autoloadPaths as $p) {
    if (file_exists($p)) { require $p; $loaded = true; break; }
}
if (!$loaded) {
    http_response_code(500);
    echo json_encode(['estado' => 'error', 'mensaje' => 'PhpSpreadsheet autoload not found']);
    exit;
}

header('Content-Type: application/json; charset=utf-8');

// ── Helper Functions ──────────────────────────────────────────────────

function get_valoracion($v, PDO $db, string $year): string {
    if (empty($v)) return '';
    $stmt = $db->prepare('SELECT valoracion FROM escalas_1290 WHERE ? BETWEEN inicio AND fin AND year = ? LIMIT 1');
    $stmt->execute([(float)$v, $year]);
    return (string)($stmt->fetchColumn() ?: '');
}

function get_descripcion(string $HED, string $grado, string $asignatura, string $periodo, string $desempeno, PDO $db, string $year): string {
    $col = ($HED === 'S') ? 'descripcionEspecial' : 'descripcion';
    $sql = "SELECT {$col} FROM desempenos WHERE grado = ? AND asignatura = ? AND periodo = ? AND desempeno = ? AND year = ?";
    if ($HED === 'S') $sql .= ' AND descripcionEspecial != \'\'';
    $sql .= ' LIMIT 1';
    $stmt = $db->prepare($sql);
    $stmt->execute([$grado, $asignatura, $periodo, $desempeno, $year]);
    $res = $stmt->fetchColumn();
    return trim($res ?: 'DOCENTE NO REPORTA INFORMACION :(');
}

function get_porcentaje(string $nivel, string $asignatura, PDO $db, string $year, string $asignacion): string {
    $table = ($asignacion === '5') ? 'porcentajes_area_colegio_5' : 'porcentajes_area_colegio';
    $stmt = $db->prepare("SELECT porcentaje FROM {$table} WHERE nivel = ? AND asignatura = ? AND year = ?");
    $stmt->execute([$nivel, $asignatura, $year]);
    return (string)($stmt->fetchColumn() ?: '');
}

function get_inasistencia(string $estudiante, string $asignatura, PDO $db, string $year): string {
    $stmt = $db->prepare('SELECT COALESCE(SUM(horas),0) FROM inasistencia WHERE estudiante = ? AND materia = ? AND year = ?');
    $stmt->execute([$estudiante, $asignatura, $year]);
    return (string)$stmt->fetchColumn();
}

// ── Input ─────────────────────────────────────────────────────────────

try {
    $datos = json_decode(file_get_contents('php://input'));
    if (!$datos) throw new RuntimeException('JSON inválido');

    $nivel          = (int)($datos->nivel ?? 0);
    $estudiante     = trim($datos->estudiante ?? '');
    $year_input     = trim($datos->year ?? date('Y'));
    $periodo_input  = trim($datos->periodo ?? '');
    $asignacion     = trim($datos->asignacion ?? '');
    $nombres        = trim($datos->nombres ?? '');
    $codigo         = trim($datos->codigo ?? '');
    $numero         = trim($datos->numero ?? '');
    $establecimiento = trim($datos->establecimiento ?? '');
    $puesto_ie      = $datos->puesto_ie ?? '';
    $puesto_grupo   = $datos->puesto_grupo ?? '';
    $promedio       = $datos->promedio ?? '';
    $createFolder   = trim($datos->createFolder ?? '');

    if (!$estudiante) throw new RuntimeException('Falta el ID del estudiante');

    $db = Database::getInstance()->getPdo();

    // Determinar si es período final (CINCO) — se usa en varias queries
    $is_final = ($periodo_input === 'CINCO');

    // Resolver el nombre de la sede a partir del ID de asignación.
    // Si falla, caemos al $establecimiento del payload.
    $sedeFolder = $establecimiento;
    if ($asignacion !== '') {
        try {
            $stmtSede = $db->prepare('SELECT sede FROM sedes WHERE ind = ? LIMIT 1');
            $stmtSede->execute([$asignacion]);
            $sedeName = (string)$stmtSede->fetchColumn();
            if ($sedeName !== '') $sedeFolder = $sedeName;
        } catch (Exception $e) {
            // Silencioso: usa $establecimiento como fallback
        }
    }

    // ── Template Selection ───────────────────────────────────────────
    // Las plantillas canónicas viven en __DIR__/plantillasXLSX/. Si no se
    // encuentran ahí, caemos a la raíz de legacy o al project root como
    // fallback.
    $plantillasDir = __DIR__ . '/plantillasXLSX';
    if ($nivel === 0) {
        $excelFile = $plantillasDir . '/informe-preescolar.xlsx';
    } elseif ($nivel >= 1 && $nivel < 6) {
        $excelFile = $plantillasDir . '/in2-primaria' . ($asignacion === '5' ? '-5' : '') . '.xlsx';
    } elseif ($nivel >= 6 && $nivel < 10) {
        $excelFile = $plantillasDir . '/in2.xlsx';
    } else {
        $excelFile = $plantillasDir . '/in2-media.xlsx';
    }

    // Fallback: si no están en plantilasXLSX/, probar la raíz de legacy
    // y luego la raíz del proyecto (compatibilidad con despliegues viejos).
    if (!file_exists($excelFile)) {
        $fallback = __DIR__ . '/' . basename($excelFile);
        if (file_exists($fallback)) {
            $excelFile = $fallback;
        } else {
            $fallback2 = __DIR__ . '/../../' . basename($excelFile);
            if (file_exists($fallback2)) {
                $excelFile = $fallback2;
            } else {
                throw new RuntimeException("Plantilla no encontrada en: $excelFile, $fallback ni $fallback2");
            }
        }
    }

    $reader    = \PhpOffice\PhpSpreadsheet\IOFactory::createReader('Xlsx');
    $spreadsheet = $reader->load($excelFile);
    $sheet     = $spreadsheet->getActiveSheet();

    // ── Static Data ──────────────────────────────────────────────────
    $periodLabel = ($periodo_input === 'CINCO') ? 'FINAL' : $periodo_input;
    $sheet->setCellValue('M11', $periodLabel);
    $sheet->setCellValue('A11', 'INFORME');
    $sheet->setCellValue('year', $year_input);
    $sheet->setCellValue('M9', "{$nombres} - {$estudiante} COD. {$codigo}");
    $sheet->setCellValue('AA11', "{$nivel}-{$numero}");
    $sheet->setCellValue('AL11', $establecimiento);

    // ── Director ────────────────────────────────────────────────────
    // La tabla `asignacion_asignaturas` no tiene la columna `asignacion`.
    // Para mantener la sede correcta, hacemos JOIN con `estugrupos` (que
    // SÍ tiene `asignacion` por estudiante) usando estudiante + nivel +
    // numero + year como claves de cruce.
    $stmtDir = $db->prepare('
        SELECT d.nombres
        FROM docentes d
        INNER JOIN asignacion_asignaturas aa ON d.identificacion = aa.docente
        INNER JOIN estugrupos eg
            ON  aa.nivel   = eg.nivel
            AND aa.numero  = eg.numero
            AND aa.year    = eg.year
            AND eg.estudiante = ?
        WHERE aa.asignatura = ?
          AND aa.year = ?
          AND aa.nivel = ?
          AND aa.numero = ?
          AND eg.asignacion = ?
        LIMIT 1
    ');
    $stmtDir->execute([$estudiante, 'COMP.SOC', $year_input, (string)$nivel, (string)$numero, $asignacion]);
    $director = (string)$stmtDir->fetchColumn();
    $sheet->setCellValue('director', $director);

    // ── HED ─────────────────────────────────────────────────────────
    $stmtHED = $db->prepare('SELECT HED FROM estugrupos WHERE estudiante = ? AND year = ?');
    $stmtHED->execute([$estudiante, $year_input]);
    $HED = (string)$stmtHED->fetchColumn();

    // ── Promedio del estudiante (promedio de todas sus notas en el período) ─
    if ($promedio === '' || $promedio === null) {
        $sqlProm = "SELECT AVG(n.valoracion) as promedio
                     FROM notas n
                     INNER JOIN estugrupos eg ON n.estudiante = eg.estudiante
                     WHERE n.estudiante = ? AND n.year = ? AND eg.year = ?";
        $paramsProm = [$estudiante, $year_input, $year_input];
        $typesProm = "sis";
        if ($is_final) {
            $sqlProm .= " AND n.periodo <> 'CINCO'";
        } else {
            $sqlProm .= " AND n.periodo = ?";
            $paramsProm[] = $periodo_input;
            $typesProm .= "s";
        }
        $stmtProm = $db->prepare($sqlProm);
        $stmtProm->execute($paramsProm);
        $promCalc = (float)$stmtProm->fetchColumn();
        $promedio = $promCalc > 0 ? number_format($promCalc, 2, '.', '') : '';
    }

    // ── Puestos (ranking por promedio, con empates) ────────────────
    if ($nivel > 5 && ($puesto_ie === '' || $puesto_grupo === '')) {
        // Puesto en la institución (toda la sede, mismo año+período)
        $sqlPuestos = "
            SELECT n.estudiante, AVG(n.valoracion) as promedio
            FROM notas n
            INNER JOIN estugrupos eg ON n.estudiante = eg.estudiante
            WHERE eg.activo = 'S'
              AND eg.asignacion = ?
              AND eg.year = ?
              AND n.year = ?
              " . ($is_final ? "AND n.periodo <> 'CINCO'" : "AND n.periodo = ?") . "
            GROUP BY n.estudiante
            ORDER BY promedio DESC
        ";
        $paramsP = [$asignacion, $year_input, $year_input];
        $typesP = "sis";
        if (!$is_final) { $paramsP[] = $periodo_input; $typesP .= "s"; }
        $stmtPuestos = $db->prepare($sqlPuestos);
        $stmtPuestos->execute($paramsP);
        $rowsPuestos = $stmtPuestos->fetchAll(PDO::FETCH_ASSOC);
        // Ranking con empates: rank = posición cuando cambia el promedio
        $rank = 0;
        $pos = 0;
        $prevProm = null;
        foreach ($rowsPuestos as $rp) {
            $pos++;
            $prom = (float)$rp['promedio'];
            if ($prevProm === null || $prom !== $prevProm) {
                $rank = $pos;
            }
            $prevProm = $prom;
            if ((int)$rp['estudiante'] === (int)$estudiante) {
                $puesto_ie = (string)$rank;
                break;
            }
        }

        // Puesto en el grupo (mismo nivel + numero + asignacion + año + período)
        $stmtPGrupo = $db->prepare("
            SELECT t.estudiante, t.promedio
            FROM (
                SELECT n.estudiante, eg.nivel, eg.numero, AVG(n.valoracion) as promedio
                FROM notas n
                INNER JOIN estugrupos eg ON n.estudiante = eg.estudiante
                WHERE eg.asignacion = ? AND eg.year = ? AND n.year = ?
                  " . ($is_final ? "AND n.periodo <> 'CINCO'" : "AND n.periodo = ?") . "
                GROUP BY n.estudiante, eg.nivel, eg.numero
            ) t
            WHERE t.nivel = ? AND t.numero = ?
            ORDER BY t.promedio DESC
        ");
        $paramsPG = [$asignacion, $year_input, $year_input];
        $typesPG = "sis";
        if (!$is_final) { $paramsPG[] = $periodo_input; $typesPG .= "s"; }
        $paramsPG[] = (string)$nivel;
        $paramsPG[] = (string)$numero;
        $typesPG .= "ii";
        $stmtPGrupo->execute($paramsPG);
        $rowsPGrupo = $stmtPGrupo->fetchAll(PDO::FETCH_ASSOC);
        $rankG = 0;
        $posG = 0;
        $prevPromG = null;
        foreach ($rowsPGrupo as $rpg) {
            $posG++;
            $promG = (float)$rpg['promedio'];
            if ($prevPromG === null || $promG !== $prevPromG) {
                $rankG = $posG;
            }
            $prevPromG = $promG;
            if ((int)$rpg['estudiante'] === (int)$estudiante) {
                $puesto_grupo = (string)$rankG;
                break;
            }
        }
    }

    // ── Puestos / Promedio (escribir en Excel) ────────────────────
    if ($nivel > 5) {
        $sheet->setCellValue('pie',    $puesto_ie);
        $sheet->setCellValue('pgrupo', $puesto_grupo);
    }
    if ($promedio !== '') {
        $sheet->setCellValue('promedio', (float)$promedio);
    }

    // ── Grade query ─────────────────────────────────────────────────
    $valoracion_sql = $is_final ? 'AVG(n.valoracion)' : 'n.valoracion';

    $sql = "SELECT n.asignatura, REPLACE({$valoracion_sql}, ',', '.') as valoracion, n.docente
            FROM notas n
            INNER JOIN asignacion_asignaturas aa ON n.asignatura = aa.asignatura AND n.year = aa.year
            WHERE n.estudiante = ?
              AND aa.visible = 'S'
              AND n.docente IS NOT NULL
              AND n.valoracion <> 0
              AND n.year = ?";
    $params = [$estudiante, $year_input];

    if (!$is_final) {
        $sql .= ' AND n.periodo = ?';
        $params[] = $periodo_input;
    } else {
        $sql .= " AND n.periodo <> 'CINCO'";
    }

    if ($nivel === 0) {
        $stmtDoc = $db->prepare('SELECT docente FROM notas WHERE estudiante = ? AND year = ? AND docente <> \'\' ORDER BY fechahora DESC LIMIT 1');
        $stmtDoc->execute([$estudiante, $year_input]);
        $docFiltro = $stmtDoc->fetchColumn();
        if ($docFiltro) {
            $sql .= ' AND n.docente = ?';
            $params[] = $docFiltro;
        }
    }
    $sql .= ' GROUP BY n.asignatura';

    $stmtMain = $db->prepare($sql);
    $stmtMain->execute($params);
    $rows = $stmtMain->fetchAll(PDO::FETCH_ASSOC);

    // ── Populate rows ───────────────────────────────────────────────
    if ($nivel === 0) $tabla = 'parametros_informe_preescolar';
    elseif ($nivel >= 1 && $nivel <= 5) $tabla = 'parametros_informe_primaria' . ($asignacion === '5' ? '_5' : '');
    else $tabla = 'parametros_informe';

    $datoss = [];
    foreach ($rows as $row) {
        $stmtFila = $db->prepare("SELECT fila FROM {$tabla} WHERE codigo_materia = ? AND year = ?");
        $stmtFila->execute([$row['asignatura'], $year_input]);
        $fila = (string)$stmtFila->fetchColumn();
        if (empty($fila)) continue;

        $desempeno = get_valoracion($row['valoracion'], $db, $year_input);
        $valoracion = (float)$row['valoracion'];
        $porc = get_porcentaje((string)$nivel, $row['asignatura'], $db, $year_input, $asignacion);

        $sheet->setCellValue("H{$fila}",  get_inasistencia($estudiante, $row['asignatura'], $db, $year_input));
        $sheet->setCellValue("K{$fila}",  get_descripcion($HED, "{$nivel}-{$numero}", $row['asignatura'], $periodo_input, $desempeno, $db, $year_input));
        $sheet->setCellValue("AW{$fila}", $desempeno);
        $sheet->setCellValue("BC{$fila}", $valoracion);
        $sheet->setCellValue("BB{$fila}", $porc);

        $datoss[] = [
            'asig' => $row['asignatura'],
            'des'  => $desempeno,
            'val'  => $valoracion,
            'porc' => $porc,
            'fila' => $fila,
            'nivel'=> $nivel,
            'estudiante' => $estudiante,
        ];
    }

    // ── Protect sheet ───────────────────────────────────────────────
    $sheet->getProtection()->setPassword('CHANGED_PASSWORD');
    $sheet->getProtection()->setSheet(true);
    $sheet->getProtection()->setSort(true);
    $sheet->getProtection()->setInsertRows(true);
    $sheet->getProtection()->setFormatCells(true);
    $sheet->protectCells('A1:BH73', 'CHANGED_PASSWORD');

    // ── Save XLSX ───────────────────────────────────────────────────
    // Estructura: xlsx/{nombre_sede}/{nivel}-{numero}/{nombres}-{estudiante}.xlsx
    $xlsxRoot = __DIR__ . '/xlsx';
    if ($createFolder === 'S') {
        $folder = $xlsxRoot . '/' . $sedeFolder . '/' . $nivel . '-' . $numero;
    } else {
        $folder = $xlsxRoot;
    }
    if (!is_dir($folder)) mkdir($folder, 0755, true);

    $filename = $folder . '/' . $nombres . '-' . $estudiante;
    if (file_exists($filename . '.xlsx')) unlink($filename . '.xlsx');

    $writer = \PhpOffice\PhpSpreadsheet\IOFactory::createWriter($spreadsheet, 'Xlsx');
    $writer->save($filename . '.xlsx');

    // ── Save PDF ────────────────────────────────────────────────────
    // El PDF es opcional. mpdf lanza warnings de tipo "Undefined array
    // key" que el set_error_handler del router (server/routes/api.php:30)
    // convierte en HTTP 500, rompiendo la respuesta aunque el XLSX ya
    // esté en disco. Suprimimos E_WARNING durante este bloque.
    $prevReporting = error_reporting();
    try {
        error_reporting($prevReporting & ~E_WARNING & ~E_NOTICE);
        \PhpOffice\PhpSpreadsheet\IOFactory::registerWriter('Pdf', \PhpOffice\PhpSpreadsheet\Writer\Pdf\Mpdf::class);
        $pdfWriter = \PhpOffice\PhpSpreadsheet\IOFactory::createWriter($spreadsheet, 'Pdf');
        $pdfDir = __DIR__ . '/pdfs';
        if (!is_dir($pdfDir)) mkdir($pdfDir, 0755, true);
        $pdfWriter->save($pdfDir . '/reporte.pdf');
    } catch (Exception $e) {
        // PDF is optional; ignore failures
    } finally {
        error_reporting($prevReporting);
    }

    // ── Response ────────────────────────────────────────────────────
    $relativePath = 'xlsx/' . ($createFolder === 'S' ? $sedeFolder . '/' . $nivel . '-' . $numero . '/' : '') . $nombres . '-' . $estudiante;
    echo json_encode([
        'estado'   => 'ok',
        'href'     => $relativePath . '.xlsx',
        'folder'   => ($createFolder === 'S' ? $sedeFolder . '/' . $nivel . '-' . $numero : ''),
        'filename' => $relativePath,
        'datoss'   => $datoss,
    ], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'estado'  => 'error',
        'mensaje' => $e->getMessage(),
    ], JSON_UNESCAPED_UNICODE);
}