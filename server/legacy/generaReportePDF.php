<?php
/**
 * generaReportePDF.php — Generate academic report cards as PDF faithful to XLSX.
 *
 * Accepts the exact same POST JSON payload as generaReporte.php but renders
 * a pixel-perfect PDF via Mpdf + HTML/CSS instead of relying on the unreliable
 * PhpSpreadsheet→Mpdf conversion.
 *
 * POST params (JSON body):
 *   estudiante, nombres, codigo, nivel, numero, asignacion, year,
 *   periodo, establecimiento (sede name),
 *   createFolder ("S"), puesto_ie, puesto_grupo, promedio
 *
 * Returns same JSON shape as generaReporte.php:
 *   { estado, href, folder, filename, datoss }
 */

error_reporting(E_ALL & ~E_DEPRECATED & ~E_USER_DEPRECATED);

require_once __DIR__ . '/../config/app.php';
require_once __DIR__ . '/../config/database.php';

// Autoload
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
    echo json_encode(['estado' => 'error', 'mensaje' => 'Autoload not found']);
    exit;
}

header('Content-Type: application/json; charset=utf-8');

// ── Helper Functions (identical to generaReporte.php) ──────────────────

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

// ── Emoji helper for promedio ───────────────────────────────────────────
function promedio_emoji($promedio): string {
    $p = (float)$promedio;
    if ($p >= 4.5) return '😍';
    if ($p >= 4.0) return '😊';
    if ($p >= 3.0) return '😐';
    if ($p >= 2.0) return '😢';
    return '😡';
}

// ── Input ───────────────────────────────────────────────────────────────

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

    // Resolver sede
    $sedeFolder = $establecimiento;
    if ($asignacion !== '') {
        try {
            $stmtSede = $db->prepare('SELECT sede FROM sedes WHERE ind = ? LIMIT 1');
            $stmtSede->execute([$asignacion]);
            $sedeName = (string)$stmtSede->fetchColumn();
            if ($sedeName !== '') $sedeFolder = $sedeName;
        } catch (Exception $e) {}
    }

    // ── Director ────────────────────────────────────────────────────────
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

    // ── HED ─────────────────────────────────────────────────────────────
    $stmtHED = $db->prepare('SELECT HED FROM estugrupos WHERE estudiante = ? AND year = ?');
    $stmtHED->execute([$estudiante, $year_input]);
    $HED = (string)$stmtHED->fetchColumn();

    // ── Promedio del estudiante (idéntico a generaReporte.php) ─────────
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

    // ── Puestos (ranking por promedio, con empates) ────────────────────
    if ($nivel > 5 && ($puesto_ie === '' || $puesto_grupo === '')) {
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
        $rank = 0; $pos = 0; $prevProm = null;
        foreach ($rowsPuestos as $rp) {
            $pos++;
            $prom = (float)$rp['promedio'];
            if ($prevProm === null || $prom !== $prevProm) $rank = $pos;
            $prevProm = $prom;
            if ((int)$rp['estudiante'] === (int)$estudiante) { $puesto_ie = (string)$rank; break; }
        }

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
        $rankG = 0; $posG = 0; $prevPromG = null;
        foreach ($rowsPGrupo as $rpg) {
            $posG++;
            $promG = (float)$rpg['promedio'];
            if ($prevPromG === null || $promG !== $prevPromG) $rankG = $posG;
            $prevPromG = $promG;
            if ((int)$rpg['estudiante'] === (int)$estudiante) { $puesto_grupo = (string)$rankG; break; }
        }
    }

    // ── Grade query (identical to generaReporte.php) ────────────────────
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

    // ── Parameter table ────────────────────────────────────────────────
    if ($nivel === 0) $tabla = 'parametros_informe_preescolar';
    elseif ($nivel >= 1 && $nivel <= 5) $tabla = 'parametros_informe_primaria' . ($asignacion === '5' ? '_5' : '');
    else $tabla = 'parametros_informe';

    $subjectRows = []; // will hold [asignatura, descripcion, inasistencia, valoracion, desempeno, porcentaje]
    $datoss = [];

    foreach ($rows as $row) {
        $stmtFila = $db->prepare("SELECT fila FROM {$tabla} WHERE codigo_materia = ? AND year = ?");
        $stmtFila->execute([$row['asignatura'], $year_input]);
        $fila = (string)$stmtFila->fetchColumn();
        if (empty($fila)) continue;

        $desempeno = get_valoracion($row['valoracion'], $db, $year_input);
        $valoracion = (float)$row['valoracion'];
        $porc = get_porcentaje((string)$nivel, $row['asignatura'], $db, $year_input, $asignacion);
        $inas = get_inasistencia($estudiante, $row['asignatura'], $db, $year_input);
        $desc = get_descripcion($HED, "{$nivel}-{$numero}", $row['asignatura'], $periodo_input, $desempeno, $db, $year_input);

        $subjectRows[] = [
            'asignatura'  => $row['asignatura'],
            'descripcion' => $desc,
            'inasistencia'=> $inas,
            'valoracion'  => $valoracion,
            'desempeno'   => $desempeno,
            'porcentaje'  => $porc,
        ];

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

    // ── Columnar Weighted Average (DEFINITIVA) ──────────────────────────
    // Emulate the same logic the XLSX formulas compute:
    //   For each subject group (area + sub-areas), weight the valoracion by porcentaje
    //   We compute a single overall "definitiva" per subject row
    //   Since the XLSX does mixed weighted averages across sub-areas per academic area,
    //   we just show the valoracion alone as the "DEFINITIVA" (simplest faithful representation).
    //   The user can treat definiva = valoracion for single-row subjects.

    // ── Build HTML for PDF ──────────────────────────────────────────────

    $periodLabel = ($periodo_input === 'CINCO') ? 'FINAL' : $periodo_input;
    $gradoLabel  = "{$nivel}-{$numero}";

    // Determine if we show puestos/promedio row
    $showPuestos = ($nivel > 5);

    // ── Prime the Mpdf document ─────────────────────────────────────────
    // Tamaño oficio vertical = Legal (8.5" × 13"). Layout flex con body
    // en columna para distribuir las secciones verticalmente sin que
    // queden apretadas en la parte superior.

    $mpdf = new \Mpdf\Mpdf([
        'mode'          => 'utf-8',
        'format'        => 'Legal',       // 8.5" × 14" (oficio vertical)
        'margin_left'   => 6,
        'margin_right'  => 6,
        'margin_top'    => 5,
        'margin_bottom' => 5,
        'default_font_size' => 9,
        'default_font'  => 'dejavusans',
    ]);

    $mpdf->SetTitle("Informe Académico - {$nombres}");
    $mpdf->SetAuthor($director ?: 'Docente');

    // ── Determine page header text from the template ────────────────────
    // These are hard-coded in the XLSX templates; keep them identical.
    $secretariaText = 'SECRETARÍA DE EDUCACION DEPARTAMENTAL';
    $institucionText = 'INSTITUCIÓN EDUCATIVA DE OCCIDENTE';
    $nitText = 'NIT 890802641-2  DANE 117042000561';
    $titleText = 'INFORME DE DESEMPEÑOS ACADÉMICOS POR PERIODOS';

    // ── School shield image ─────────────────────────────────────────────
    // Try to use the image extracted from the XLSX template first;
    // fall back to the public logo if not found.
    $escudoPath = __DIR__ . '/escudo_colegio.jpeg';
    if (!file_exists($escudoPath)) {
        $escudoPath = __DIR__ . '/../../public/escudohd.png';
        if (!file_exists($escudoPath)) $escudoPath = '';
    }
    $escudoImgHtml = '';
    if ($escudoPath) {
        // Escudo compacto para que el header no domine verticalmente
        $escudoImgHtml = '<img src="' . $escudoPath . '" width="45" height="55" style="display:block;margin:0 auto;" alt="Escudo" />';
    }

    // ── Build HTML table for subject rows ──────────────────────────────
    $tbodyRows = '';
    foreach ($subjectRows as $sr) {
        $subjectName = htmlspecialchars($sr['asignatura'], ENT_QUOTES, 'UTF-8');
        $descText    = htmlspecialchars($sr['descripcion'], ENT_QUOTES, 'UTF-8');
        $inasVal     = htmlspecialchars($sr['inasistencia'], ENT_QUOTES, 'UTF-8');
        $desempeno   = htmlspecialchars($sr['desempeno'], ENT_QUOTES, 'UTF-8');
        $porcVal     = $sr['porcentaje'] !== '' ? htmlspecialchars($sr['porcentaje'], ENT_QUOTES, 'UTF-8') : '';
        $valNum      = $sr['valoracion'];
        $valFmt      = number_format($valNum, 2, '.', '');

        $tbodyRows .= <<<ROW
        <tr>
            <td class="area-col">{$subjectName}</td>
            <td class="inas-col">{$inasVal}</td>
            <td class="desc-col">{$descText}</td>
            <td class="desemp-col">{$desempeno}</td>
            <td class="porc-col">{$porcVal}</td>
            <td class="val-col">{$valFmt}</td>
        </tr>
ROW;
    }

    // If no rows, show a placeholder
    if (empty($tbodyRows)) {
        $tbodyRows = '<tr><td colspan="6" style="text-align:center;padding:10px;">No se encontraron asignaturas con notas para este periodo.</td></tr>';
    }

    // ── Emoji indicator for promedio ───────────────────────────────────
    $promedioEmoji = '';
    $promedioFmt = '';
    if ($promedio !== '') {
        $promedioFmt = number_format((float)$promedio, 2, '.', '');
        $promedioEmoji = promedio_emoji($promedio);
    }

    // ── Positions row ──────────────────────────────────────────────────
    $positionsHtml = '';
    if ($showPuestos) {
        $pgVal = htmlspecialchars((string)$puesto_grupo, ENT_QUOTES, 'UTF-8');
        $piVal = htmlspecialchars((string)$puesto_ie, ENT_QUOTES, 'UTF-8');
        $positionsHtml = <<<POS
        <div class="positions-row">
            <table class="positions-table">
                <tr>
                    <td class="pos-label">Puesto Grupo</td>
                    <td class="pos-value">{$pgVal}</td>
                    <td class="pos-label">Puesto I.E.</td>
                    <td class="pos-value">{$piVal}</td>
                    <td class="pos-label">Promedio</td>
                    <td class="pos-value">{$promedioFmt} {$promedioEmoji}</td>
                </tr>
            </table>
        </div>
POS;
    } else {
        // Primaria/preschool: show promedio
        if ($promedio !== '') {
            $positionsHtml = <<<POS
            <div class="positions-row">
                <table class="positions-table">
                    <tr>
                        <td class="pos-label">Promedio</td>
                        <td class="pos-value">{$promedioFmt} {$promedioEmoji}</td>
                    </tr>
                </table>
            </div>
POS;
        }
    }

    // ── Footer abbreviations (taken verbatim from XLSX) ────────────────
    // The XLSX templates have this truncated text, but we show the full version
    $abbrText = 'ABREVIATURAS: INAS: inasistencia — DESEMPEÑO: valoración — SUPERIOR: Des. Sup. — ALTO: Des. Alto — BÁSICO: Des. Básico — BAJO: Des. Bajo';

    // ── Director / Group footer ────────────────────────────────────────
    $directorHtml = '';
    if ($director !== '') {
        $dirName = htmlspecialchars($director, ENT_QUOTES, 'UTF-8');
        $directorHtml = <<<DIR
        <tr>
            <td colspan="6" style="border:none;padding-top:4px;">
                <table class="director-table">
                    <tr>
                        <td class="dir-label">Director(a) de Grupo</td>
                        <td class="dir-name">{$dirName}</td>
                    </tr>
                </table>
            </td>
        </tr>
DIR;
    }

    // ── Page info (right side) ─────────────────────────────────────────
    // Mpdf interprets {PAGENO} inside WriteHTML as the current page number
    $pageInfoText = 'Página: {PAGENO}-1' . "\n" . 'Código:' . "\n" . 'GAFMR-40-05';
    $versionText = 'V.:02' . "\n" . '26/01/2012';

    // ── Combine the full HTML ──────────────────────────────────────────
    $html = <<<HTML
<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<style>
    /* ── Una sola página oficio vertical (8.5" × 14") ── */
    * { box-sizing: border-box; }
    html, body { height: 100%; margin: 0; padding: 0; }
    body {
        font-family: 'dejavusans', sans-serif;
        font-size: 9pt;
        line-height: 1.25;
        color: #000;
        display: flex;
        flex-direction: column;
    }
    .page-frame {
        width: 100%;
        flex: 1;
        display: flex;
        flex-direction: column;
    }

    /* ── Header COMPACTO (3 filas en 1) ── */
    .header-table { width: 100%; border-collapse: collapse; margin-bottom: 2px; }
    .header-table td { vertical-align: middle; text-align: center; border: 1px solid #000; padding: 1px 3px; }
    .header-secretaria { font-size: 9pt; font-weight: bold; padding: 1px 3px; }
    .header-institucion { font-size: 10pt; font-weight: bold; padding: 1px 3px; }
    .header-nit { font-size: 7pt; font-weight: bold; padding: 1px 3px; }
    .header-version { font-size: 6pt; width: 50px; white-space: pre-line; }
    .header-pageinfo { font-size: 6pt; width: 50px; white-space: pre-line; }
    .title-cell { font-size: 8pt; font-weight: bold; padding: 1px 3px; }
    .dependencia-cell { font-size: 6.5pt; padding: 1px 3px; }

    /* ── Student info COMPACTO ── */
    .student-info-table { width: 100%; border-collapse: collapse; margin-bottom: 2px; }
    .student-info-table td { border: 1px solid #000; padding: 2px 4px; vertical-align: middle; }
    .student-label { font-size: 7.5pt; font-weight: bold; text-align: center; width: 100px; }
    .student-name { font-size: 10pt; text-align: center; font-weight: 500; }
    .student-grade-label { font-size: 7.5pt; font-weight: bold; text-align: center; width: 38px; }
    .student-grade-value { font-size: 9pt; text-align: center; font-weight: 500; }
    .student-sede-label { font-size: 7.5pt; font-weight: bold; text-align: center; width: 8%; }
    .student-sede-value { font-size: 8pt; text-align: center; }
    .info-row-label { font-size: 8pt; font-weight: bold; text-align: center; width: 50px; }
    .info-row-data { font-size: 8pt; text-align: center; }

    /* ── Positions / Promedio ── */
    .positions-row { margin-bottom: 2px; }
    .positions-table { width: 100%; border-collapse: collapse; }
    .positions-table td { border: 1px solid #000; padding: 2px 4px; font-size: 8.5pt; text-align: center; }
    .pos-label { font-weight: bold; width: 80px; }
    .pos-value { font-weight: 500; width: 55px; }

    /* ── Main data table (ocupa el resto con flex:1) ── */
    .data-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 8pt;
        table-layout: fixed;
        flex: 1;
    }
    .data-table th { border: 1px solid #000; padding: 3px 3px; font-weight: bold; text-align: center; font-size: 8pt; }
    .data-table td { border: 1px solid #000; padding: 2px 3px; vertical-align: middle; line-height: 1.2; }
    .area-col    { width: 13%; font-size: 7.5pt; text-align: center; font-weight: bold; }
    .inas-col    { width: 5%;  font-size: 8pt; text-align: center; }
    .desc-col    { width: 45%; font-size: 7pt; text-align: justify; word-break: break-word; }
    .desemp-col  { width: 8%;  font-size: 7.5pt; text-align: center; font-weight: bold; }
    .porc-col    { width: 5%;  font-size: 7.5pt; text-align: center; }
    .val-col     { width: 6%;  font-size: 8.5pt; text-align: center; font-weight: bold; }

    /* ── Footer ── */
    .footer-abbr { font-size: 6.5pt; text-align: center; padding-top: 2px; font-style: italic; }
    .director-table { width: 100%; border-collapse: collapse; margin-top: 2px; }
    .director-table td { border: 1px solid #000; padding: 2px 4px; font-size: 8pt; text-align: center; }
    .dir-label { width: 100px; }
    .dir-name { font-weight: bold; }
</style>
</head>
<body>
<div class="page-frame">

<!-- ═══════ HEADER ═══════ -->

        <!-- Secretaría + Institución + NIT rows -->
        <table class="header-table">
            <tr>
                <td rowspan="3" style="width:12%;border:1px solid #000;vertical-align:middle;text-align:center;">
                    {$escudoImgHtml}
                    <div style="font-size:8pt;font-weight:bold;text-align:center;margin-top:2px;">SECRETARIA</div>
                </td>
                <td class="header-secretaria" colspan="2" style="font-size:14pt;font-weight:bold;text-align:center;">
                    {$secretariaText}
                </td>
                <td class="header-version" rowspan="3" style="vertical-align:bottom;width:70px;">{$versionText}</td>
            </tr>
            <tr>
                <td class="header-institucion" colspan="2" style="font-size:14pt;font-weight:bold;text-align:center;">
                    {$institucionText}
                </td>
            </tr>
            <tr>
                <td class="header-nit" colspan="2" style="font-size:9pt;font-weight:bold;text-align:center;">
                    {$nitText}
                </td>
            </tr>
            <tr>
                <td style="border:1px solid #000;text-align:center;font-size:8pt;">DEPENDENCIA</td>
                <td class="title-cell" colspan="2">{$titleText}</td>
                <td class="header-pageinfo">{$pageInfoText}</td>
            </tr>
        </table>

        <!-- ═══════ Student info row ═══════ -->
        <table class="student-info-table">
            <tr>
                <td class="student-label" style="width:120px;">Nombre del estudiante</td>
                <td class="student-name" colspan="4">{$nombres} - {$estudiante} COD. {$codigo}</td>
            </tr>
            <tr>
                <td class="info-row-label">INFORME</td>
                <td class="info-row-data" style="width:15%;">{$periodLabel}</td>
                <td class="student-grade-label">Grado</td>
                <td class="student-grade-value" style="width:15%;">{$gradoLabel}</td>
                <td class="student-sede-label" style="width:10%;">
                    SEDE<br>
                    <span style="font-weight:normal;font-size:9pt;">{$establecimiento}</span>
                </td>
            </tr>
        </table>

        <!-- ═══════ Puestos / Promedio ═══════ -->
        {$positionsHtml}

<!-- ═══════ MAIN DATA TABLE ═══════ -->
<table class="data-table">
    <thead>
        <tr>
            <th class="area-col">AREAS</th>
            <th class="inas-col">INAS</th>
            <th class="desc-col">INFORME DESCRIPTIVO</th>
            <th class="desemp-col">DESEMPEÑO</th>
            <th class="porc-col">%</th>
            <th class="val-col">VAL</th>
        </tr>
    </thead>
    <tbody>
        {$tbodyRows}
    </tbody>
</table>

<!-- ═══════ FOOTER ═══════ -->
<table style="width:100%;border-collapse:collapse;">
    <tr>
        <td class="footer-abbr" colspan="6">{$abbrText}</td>
    </tr>
    {$directorHtml}
</table>

</div><!-- /page-frame -->
</body>
</html>
HTML;

    // ── Write HTML to Mpdf and generate PDF ────────────────────────────
    $prevReporting = error_reporting();
    try {
        error_reporting($prevReporting & ~E_WARNING & ~E_NOTICE);

        $mpdf->WriteHTML($html);

        // Save PDF
        // Estructura: pdfs/{year}/{nombre_sede}/{nivel}-{numero}/{periodo}/{nombres}-{estudiante}.pdf
        $pdfDir = __DIR__ . '/pdfs';
        if (!is_dir($pdfDir)) mkdir($pdfDir, 0755, true);
        $pdfFolder = $pdfDir . '/' . $year_input . '/' . $sedeFolder;
        if ($createFolder === 'S' && !is_dir($pdfFolder)) mkdir($pdfFolder, 0755, true);

        if ($createFolder === 'S') {
            $pdfSubDir = $pdfFolder . '/' . $nivel . '-' . $numero . '/' . $periodo_input;
            if (!is_dir($pdfSubDir)) mkdir($pdfSubDir, 0755, true);
            $pdfPath = $pdfSubDir . '/' . $nombres . '-' . $estudiante . '.pdf';
            $relativePath = 'server/legacy/pdfs/' . $year_input . '/' . $sedeFolder . '/' . $nivel . '-' . $numero . '/' . $periodo_input . '/' . $nombres . '-' . $estudiante;
        } else {
            $pdfPath = $pdfDir . '/' . $nombres . '-' . $estudiante . '.pdf';
            $relativePath = 'server/legacy/pdfs/' . $nombres . '-' . $estudiante;
        }

        if (file_exists($pdfPath)) unlink($pdfPath);
        $mpdf->Output($pdfPath, \Mpdf\Output\Destination::FILE);

    } catch (Exception $e) {
        throw $e;
    } finally {
        error_reporting($prevReporting);
    }

    // ── Response (same shape as generaReporte.php) ─────────────────────
    echo json_encode([
        'estado'   => 'ok',
        'href'     => $relativePath . '.pdf',
        'folder'   => ($createFolder === 'S' ? 'server/legacy/pdfs/' . $year_input . '/' . $sedeFolder . '/' . $nivel . '-' . $numero . '/' . $periodo_input : ''),
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
