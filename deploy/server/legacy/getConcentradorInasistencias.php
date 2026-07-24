<?php
/**
 * getConcentradorInasistencias.php — Builds the concentrador HTML table for
 * the inasistencias module (students × subjects).
 *
 * POST JSON body:
 *   {
 *     "Asignacion": "1",
 *     "nivel":      "6",
 *     "numero":     "1",
 *     "periodo":    "TRES",
 *     "year":       "2026",
 *     "tipo":       "inasistencia"
 *   }
 *
 * Returns: { "success": true, "html": "<table>...</table>" }
 *
 * Modernized: PDO + prepared statements, input validation, htmlspecialchars()
 * on every dynamic value, sticky first column + header, responsive table.
 */
declare(strict_types=1);

header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/../config/app.php';
require_once __DIR__ . '/../config/database.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

try {
    $raw = file_get_contents('php://input');
    $input = json_decode($raw);
    if (!is_object($input)) {
        throw new RuntimeException('Cuerpo JSON inválido o vacío');
    }

    $asignacion = (string) ($input->Asignacion ?? '');
    $nivel      = (int)    ($input->nivel ?? -1);
    $numero     = (int)    ($input->numero ?? -1);
    $periodo    = (string) ($input->periodo ?? 'TODOS');
    $year       = (int)    ($input->year ?? (int) date('Y'));
    $tipo       = (string) ($input->tipo ?? 'inasistencia');

    if ($asignacion === '' || $nivel < 0 || $numero < 0) {
        throw new RuntimeException('Faltan campos obligatorios (Asignacion, nivel, numero)');
    }

    // Whitelist tipo so it can be safely interpolated into class/id.
    if (!preg_match('/^[a-zA-Z0-9_-]{1,32}$/', $tipo)) {
        $tipo = 'inasistencia';
    }
    $tipoEsc = htmlspecialchars($tipo, ENT_QUOTES, 'UTF-8');

    $db = Database::getInstance()->getPdo();

    // ── Asignaturas (columns) ─────────────────────────────────────
    $stmtAsig = $db->prepare("
        SELECT asignacion_asignaturas.asignatura,
               asignacion_asignaturas.abreviatura,
               asignacion_asignaturas.docente,
               asignacion_asignaturas.materia,
               COALESCE(parametros_informe.orden, 200) AS ordenar
        FROM asignacion_asignaturas
        LEFT JOIN parametros_informe
               ON asignacion_asignaturas.asignatura = parametros_informe.codigo_materia
              AND parametros_informe.year = ?
        INNER JOIN docentes
               ON asignacion_asignaturas.docente = docentes.identificacion
        WHERE asignacion_asignaturas.nivel   = ?
          AND asignacion_asignaturas.numero  = ?
          AND asignacion_asignaturas.visible = 'S'
          AND asignacion                    = ?
          AND asignacion_asignaturas.year    = ?
        ORDER BY ordenar
    ");
    $stmtAsig->execute([$year, $nivel, $numero, $asignacion, $year]);
    $asignaturasList = $stmtAsig->fetchAll(PDO::FETCH_ASSOC);

    // ── Estudiantes (rows) ────────────────────────────────────────
    if ($periodo !== 'CINCO') {
        $sqlEst = "
            SELECT estudiante, nombres, nombres AS nombres2
            FROM estugrupos
            WHERE nivel = ? AND numero = ? AND activo = 'S'
              AND asignacion = ? AND year = ?
            ORDER BY nombres2
        ";
    } else {
        $sqlEst = "
            SELECT estudiante,
                   CONCAT_WS(':', ind, nombres) AS nombres,
                   nombres AS nombres2
            FROM estugrupos
            WHERE nivel = ? AND numero = ? AND activo = 'S'
              AND asignacion = ? AND year = ?
            ORDER BY nombres2
        ";
    }
    $stmtEst = $db->prepare($sqlEst);
    $stmtEst->execute([$nivel, $numero, $asignacion, $year]);
    $estudiantes = $stmtEst->fetchAll(PDO::FETCH_ASSOC);

    // ── Build HTML ────────────────────────────────────────────────
    $h = fn($v) => htmlspecialchars((string) $v, ENT_QUOTES, 'UTF-8');

    $totalCols = count($asignaturasList);

    // Topbar: search input
    $html  = '<div class="conc-topbar">';
    $html .=   '<i class="bi bi-search"></i>';
    $html .=   '<input type="search" id="searchConcentrador" placeholder="Buscar estudiante…" '
           .    'autocomplete="off" oninput="window.__filterConcentrador && window.__filterConcentrador(this.value)">';
    $html .=   '<span class="conc-hint"><i class="bi bi-arrows-expand-vertical"></i> Desliza para ver más</span>';
    $html .= '</div>';

    // Scrollable table wrapper
    $html .= '<div class="conc-scroll">';
    $html .=   '<table class="conc-table" id="tableconcentrador' . $tipoEsc . '">';
    $html .=     '<thead><tr>';
    $html .=       '<th class="conc-th-name">Estudiantes</th>';

    foreach ($asignaturasList as $a) {
        $asig = $h($a['asignatura']);
        $abrev = $h($a['abreviatura'] ?? $a['asignatura']);
        $docente = $h($a['docente']);
        $asigAsign = $h($a['asignatura']);
        $asigAsig2 = $h($a['asignatura']);
        $asigCode = $h($a['asignatura']);

        $html .= '<th class="conc-th-subj" title="' . $asig . ' &rarr; ' . $docente . '">';
        $html .=   '<div class="conc-th-subj-inner">';
        $html .=     '<span class="conc-th-abrev" data-docente="' . $docente . '" '
               .      'data-asignacion="' . $h($asignacion) . '">' . $abrev . '</span>';
        $html .=   '</div>';
        $html .= '</th>';
    }
    $html .=     '</tr></thead>';

    // Body
    $html .=     '<tbody>';
    foreach ($estudiantes as $e) {
        $estudiante = $h($e['estudiante']);
        $nombres = $h($e['nombres']);
        $nombres2 = $h($e['nombres2']);
        $periodoH = $h($periodo);

        $html .= '<tr>';
        $html .=   '<td class="conc-td-name" title="' . $nombres . '">';
        $html .=     '<span class="conc-name-text">' . $nombres . '</span>';
        $html .=   '</td>';

        foreach ($asignaturasList as $a) {
            $asig = $h($a['asignatura']);
            $mat = $h($a['materia']);
            $doc = $h($a['docente']);
            $estRaw = $h($e['estudiante']);

            // IMPORTANT: id pattern iestudiante_{estudiante}_{materia} is
            // consumed by the client to inject attendance count badges.
            $html .= '<td class="conc-td-count" '
                   . 'data-estudiante="' . $estRaw . '" '
                   . 'data-asignatura="' . $asig . '" '
                   . 'data-periodo="' . $periodoH . '" '
                   . 'data-docente="' . $doc . '" '
                   . 'data-nombres="' . $nombres . '" '
                   . 'id="concentrador_' . $estRaw . '_' . $asig . '" '
                   . 'title="' . $nombres2 . ' · ' . $asig . '">';
            $html .=   '<div class="conc-count" id="iestudiante_' . $estRaw . '_' . $mat . '">';
            $html .=     '<span class="conc-count-placeholder">·</span>';
            $html .=   '</div>';
            $html .= '</td>';
        }
        $html .= '</tr>';
    }
    $html .=     '</tbody>';
    $html .=   '</table>';
    $html .= '</div>';

    // Footnote with totals
    $html .= '<div class="conc-footnote">';
    $html .=   '<span><strong>' . count($estudiantes) . '</strong> estudiante(s) · <strong>' . $totalCols . '</strong> materia(s)</span>';
    $html .=   '<span class="conc-legend">';
    $html .=     '<span class="conc-legend-item"><i class="dot dot-sky"></i> 1-2</span>';
    $html .=     '<span class="conc-legend-item"><i class="dot dot-amber"></i> 3-5</span>';
    $html .=     '<span class="conc-legend-item"><i class="dot dot-red"></i> ≥6</span>';
    $html .=   '</span>';
    $html .= '</div>';

    // Scoped styles — kept here so the endpoint stays self-contained.
    $css = <<<'CSS'
<style>
.conc-topbar{display:flex;align-items:center;gap:.5rem;padding:.5rem .75rem;background:#fafafa;border:1px solid #e5e7eb;border-bottom:none;border-top-left-radius:.75rem;border-top-right-radius:.75rem}
.conc-topbar>i.bi-search{color:#9ca3af;font-size:.875rem;flex-shrink:0}
.conc-topbar>input[type=search]{flex:1;min-width:0;padding:.375rem .5rem;border:1px solid #e5e7eb;border-radius:.5rem;font-size:.75rem;background:#fff;outline:none;transition:border-color .15s,box-shadow .15s}
.conc-topbar>input[type=search]:focus{border-color:#543391;box-shadow:0 0 0 2px rgba(84,51,145,.15)}
.conc-hint{display:inline-flex;align-items:center;gap:.25rem;font-size:.6875rem;color:#9ca3af;white-space:nowrap;padding:.25rem .5rem;background:#f3f4f6;border-radius:.375rem}
@media (max-width: 480px){.conc-hint{display:none}}
.conc-scroll{overflow:auto;max-height:75vh;min-height:200px;border:1px solid #e5e7eb;border-top:none;background:#fff;-webkit-overflow-scrolling:touch}
.conc-scroll::-webkit-scrollbar{height:8px;width:8px}
.conc-scroll::-webkit-scrollbar-track{background:#f3f4f6}
.conc-scroll::-webkit-scrollbar-thumb{background:#d1d5db;border-radius:4px}
.conc-scroll::-webkit-scrollbar-thumb:hover{background:#9ca3af}
.conc-table{border-collapse:separate;border-spacing:0;width:max-content;min-width:100%;font-size:.75rem;table-layout:auto}
.conc-table thead th{position:sticky;top:0;z-index:5;background:#f9fafb;color:#374151;font-weight:600;text-transform:uppercase;letter-spacing:.025em;font-size:.6875rem;padding:0;border-bottom:1px solid #e5e7eb;box-shadow:inset 0 -1px 0 #e5e7eb}
.conc-th-name{text-align:left!important;left:0;z-index:6!important;min-width:200px;max-width:240px;padding:.5rem .75rem!important;position:sticky}
@media (max-width: 640px){.conc-th-name{min-width:160px;max-width:180px}}
.conc-th-subj{min-width:64px;width:64px;text-align:center!important;vertical-align:bottom}
@media (max-width: 640px){.conc-th-subj{min-width:56px;width:56px}}
.conc-th-subj-inner{padding:.5rem .25rem;min-height:60px;display:flex;align-items:flex-end;justify-content:center}
.conc-th-abrev{writing-mode:vertical-rl;transform:rotate(180deg);text-orientation:mixed;white-space:nowrap;padding:.25rem 0;font-weight:600;color:#4b5563;letter-spacing:.025em;font-size:.6875rem;cursor:help;transition:color .15s}
.conc-th-abrev:hover{color:#543391}
.conc-table tbody tr{border-bottom:1px solid #f3f4f6;transition:background-color .12s}
.conc-table tbody tr:nth-child(even){background:#fafafa}
.conc-table tbody tr:hover{background:rgba(84,51,145,.04)}
.conc-td-name{position:sticky;left:0;z-index:3;background:inherit;min-width:200px;max-width:240px;padding:.5rem .75rem!important;font-weight:500;color:#1f2937;border-right:1px solid #e5e7eb;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.conc-table tbody tr:nth-child(even) .conc-td-name{background:#fafafa}
.conc-table tbody tr:hover .conc-td-name{background:rgba(84,51,145,.04)}
@media (max-width: 640px){.conc-td-name{min-width:160px;max-width:180px;font-size:.6875rem;padding:.375rem .5rem!important}}
.conc-td-count{text-align:center;padding:.25rem!important;vertical-align:middle}
.conc-count{display:inline-flex;align-items:center;justify-content:center;min-width:28px;min-height:24px;padding:0 .375rem;border-radius:.375rem;font-size:.6875rem;font-weight:600;background:#f3f4f6;color:#9ca3af;transition:transform .12s}
.conc-count:hover{transform:scale(1.05)}
.conc-count.has-0{background:#f9fafb;color:#d1d5db}
.conc-count.has-low{background:#e0f2fe;color:#0369a1}
.conc-count.has-mid{background:#fef3c7;color:#b45309}
.conc-count.has-high{background:#fee2e2;color:#b91c1c}
.conc-count-placeholder{opacity:.5}
.conc-footnote{display:flex;align-items:center;justify-content:space-between;gap:.5rem;flex-wrap:wrap;padding:.5rem .75rem;background:#fafafa;border:1px solid #e5e7eb;border-top:none;border-bottom-left-radius:.75rem;border-bottom-right-radius:.75rem;font-size:.6875rem;color:#6b7280}
.conc-legend{display:inline-flex;align-items:center;gap:.75rem}
.conc-legend-item{display:inline-flex;align-items:center;gap:.25rem}
.conc-legend .dot{display:inline-block;width:.5rem;height:.5rem;border-radius:50%}
.conc-legend .dot-sky{background:#38bdf8}
.conc-legend .dot-amber{background:#f59e0b}
.conc-legend .dot-red{background:#ef4444}
@media (max-width: 480px){.conc-footnote{font-size:.625rem;padding:.375rem .5rem}.conc-legend{gap:.5rem}}
</style>
CSS;
    $html = $css . $html;

    echo json_encode(['success' => true, 'html' => $html], JSON_UNESCAPED_UNICODE);
} catch (Throwable $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error'   => $e->getMessage(),
    ], JSON_UNESCAPED_UNICODE);
}
