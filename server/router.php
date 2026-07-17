<?php
require_once __DIR__ . '/bootstrap.php';

// ── Route map: modern RESTful API path → legacy PHP file ──
$routeMap = [
  // Auth
  'auth/login'              => 'login.php',
  'auth/logout'             => 'cerrar_sesion.php',
  'auth/change-password'    => 'cambiapass.php',
  'auth/info-docente'       => 'getInfoDocentes.php',

  // Students
  'students'                => 'getEstudiantes.php',
  'students/search'         => 'buscarEstudiante.php',
  'students/control-search' => 'buscarEstudianteControl.php',
  'students/control-stats'  => 'controlStats.php',
  'students/guardian'       => 'getDataAcudiente.php',
  'students/group'          => 'getEstugrupos.php',
  'students/group-history'  => 'getHistorial.php',
  'students/group-targets'  => 'getNN.php',
  'students/update'         => 'setEstugrupos.php',
  'students/change-group'   => 'cambia_grado.php',
  'students/grades-summary' => 'getNotas.php',
  'students/attendance-summary' => 'getInasistencias.php',
  'students/convivencia'    => 'getConvivencia.php',

  // Grades
  'grades'                  => 'getNotas.php',
  'grades/student'          => 'getNotasEstudiante.php',
  'grades/student-quantities' => 'consultarCantidades.php',
  'grades/batch'            => 'guardar_notas2.php',
  'grades/history'          => 'getNotasHistory.php',
  'grades/finals'           => 'getNotasFull.php',
  'grades/lost-finals'      => 'perdidasFinales.php',
  'grades/quantities'       => 'consultarCantidades.php',
  'grades/open-editing'     => 'getPeriodosNotas.php',
  'grades/close-editing'    => 'cerrarNotas.php',
  'grades/concentration'    => 'getConcentrador.php',
  'grades/individual'       => 'getNotasIndividual.php',

  // Attendance
  'attendance'              => 'getInasistencias.php',
  'attendance/batch'        => 'guardarInasistenciasBatch.php',
  'students/list'           => 'getEstudiantesGrado.php',
  'attendance/detail'       => 'inasistenciasDetallado.php',
  'attendance/group'        => 'getInasistencias.php',
  'attendance/concentration' => 'getConcentradorInasistencias.php',
  'attendance/full'         => 'getDataInasistenciasFull.php',
  'attendance/excuses'      => 'getExcusas.php',
  'attendance/stats'        => 'getInasistencias.php',
  'attendance/consolidation' => 'consolidadoInasistencias.php',

  // Convivencia
  'convivencia'             => 'getConvivencia.php',
  'convivencia/group'       => 'getConvivencia.php',
  'convivencia/stats'       => 'estadisticasConvivencia.php',
  'convivencia/items'       => 'getItemsConvivencia.php',
  'convivencia/consolidation' => 'consolidadoConvivencia.php',
  'convivencia/recent'      => 'getConvivencia.php',

  // Filters / metadata
  'sedes'                   => 'getasignacion.php',
  'grupos'                  => 'getNiveles.php',
  'niveles'                 => 'getNiveles.php',
  'numeros'                 => 'getNumeros.php',
  'niveles/nombres'         => 'getNiveles.php',
  'asignaturas'             => 'getMateriasH.php',
  'periods'                 => 'getPeriodos.php',
  'years'                   => 'getYearsData.php',

  // Teachers
  'teachers'                => 'getDocentes.php',
  'teachers/all'            => 'getDocentesAll.php',
  'teachers/assignments'    => 'getInfoDocentes.php',

  // Candidates
  'candidates'              => 'getCandidatos.php',
  'candidates/codes'        => 'getCodigos.php',
  'candidates/next-code'    => 'getUltimoCodigo.php',
  'candidates/check'        => 'detectarCandidato.php',

  // Notifications
  'notifications'           => 'getNotificaciones.php',
  'notifications/unread'    => 'getNotificationesNoLeidas.php',
  'notifications/send-message' => 'guardaMensaje.php',

  // Descripciones
  'descriptions'            => 'getDescripciones.php',
  'descriptions/save'       => 'setDescripcion.php',

  // File explorer
  'files/list'              => 'listFiles.php',

  // Positions (puestos)
  'puestos/institution'     => 'generaPuestos.php',
  'puestos/group'           => 'generaPuestosGrupo.php',
  'puestos/institution2'    => 'generaPuestos2.php',
  'puestos/group-student'   => 'generaPuestosGrupo2.php',

  // Reports
  'reports/grades'          => 'generaReporte.php',
  'reports/report-card'     => 'generaReporte.php',
  'reports/report-pdf'     => 'generaReportePDF.php',
  'reports/attendance'      => 'generaLista.php',
  'reports/convivencia'     => 'consolidadoConvivencia.php',
  'reports/students'        => 'getEstudiantes.php',
  'reports/positions'       => 'getPuestos.php',
  'reports/stats/full'      => 'getDataGraphFull.php',
  'reports/concentration'   => 'getDataGraphAsignatura.php',
  'reports/descriptions'    => 'getDescInforme.php',
  'reports/areas-performance' => 'getValoracionesAreas.php',
  'reports/nap'             => 'getOtrosLogros.php',
  'reports/export/excel'    => 'generaReporte.php',
  'reports/pdf'             => 'genCertificados.php',

  // Certificates
  'certificates/generate'   => 'genCertificados.php',
  'certificates/constancia' => 'genConstancias.php',

  // Asignaciones (CRUD para asignacion_asignaturas)
  'asignaciones'            => 'getAsignaciones.php',

  // Config (delega a ConfigPorcentajesController moderno)
  'config/porcentajes'      => 'config_porcentajes.php',
  'config/grant-access'     => 'config_porcentajes.php',

  // Dashboard
  'dashboard/summary'       => 'getDashboardSummary.php',

  // Dev (shims que reusan la lógica moderna — el legacy router no tiene
  // acceso a los controllers de /api.php/v1/dev/*)
  'dev/status'              => 'dev_status.php',
  'dev/db-mode'             => 'dev_db_mode.php',
];

// ── Resolve which legacy file to load ──
$legacyFile = null;

// 1) RESTful API mode: ?__api=resource/sub
$apiPath = $_GET['__api'] ?? '';
if ($apiPath) {
  $apiPath = preg_replace('/[^a-zA-Z0-9_\/\-]/', '', $apiPath);
  $apiPath = ltrim($apiPath, '/');

  // Exact match first
  if (isset($routeMap[$apiPath])) {
    $legacyFile = LEGACY_PATH . '/' . $routeMap[$apiPath];
  } else {
    // Partial match: try parent resource
    $parts = explode('/', $apiPath);
    while (count($parts) > 1) {
      array_pop($parts);
      $parent = implode('/', $parts);
      if (isset($routeMap[$parent])) {
        $legacyFile = LEGACY_PATH . '/' . $routeMap[$parent];
        break;
      }
    }
  }

  if (!$legacyFile) {
    http_response_code(404);
    echo json_encode(['error' => 'API route not mapped to legacy', 'path' => $apiPath]);
    exit;
  }
}

// 2) Direct file mode: ?__file=filename.php (original behavior)
if (!$legacyFile) {
  $requestedFile = $_GET['__file'] ?? '';
  if (!$requestedFile) {
    http_response_code(404);
    echo json_encode(['error' => 'No file or API route specified']);
    exit;
  }

  $cleanPath = preg_replace('/[^a-zA-Z0-9_\/\-\.]/', '', $requestedFile);
  $cleanPath = preg_replace('/\.php$/i', '', $cleanPath);
  $cleanPath = ltrim($cleanPath, '/');

  $legacyFile = LEGACY_PATH . '/' . $cleanPath . '.php';

  if (!file_exists($legacyFile)) {
    http_response_code(404);
    echo json_encode(['error' => 'File not found', 'path' => $legacyFile]);
    exit;
  }
}

if (!file_exists($legacyFile)) {
  http_response_code(404);
  echo json_encode(['error' => 'Legacy file not found', 'path' => $legacyFile]);
  exit;
}

chdir(dirname($legacyFile));
require $legacyFile;