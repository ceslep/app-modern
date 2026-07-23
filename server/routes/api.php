<?php
/**
 * API Router - Single entry point for all API requests
 */
declare(strict_types=1);

// Load configuration
require_once __DIR__ . '/../config/app.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/response.php';
require_once __DIR__ . '/../config/auth.php';
require_once __DIR__ . '/../middleware/cors.php';
require_once __DIR__ . '/../utils/sanitize.php';

// Ensure all PHP errors and uncaught exceptions return JSON
set_exception_handler(function (Throwable $e) {
    if (!headers_sent()) {
        http_response_code(500);
        header('Content-Type: application/json; charset=utf-8');
    }
    error_log('[API uncaught] ' . $e->getMessage() . ' @ ' . $e->getFile() . ':' . $e->getLine());
    $debug = defined('APP_DEBUG') ? APP_DEBUG : (getenv('APP_DEBUG') === 'true');
    $msg = $debug
        ? $e->getMessage() . ' @ ' . $e->getFile() . ':' . $e->getLine()
        : 'Internal server error';
    echo json_encode(['success' => false, 'error' => $msg]);
    exit;
});

set_error_handler(function ($severity, $message, $file, $line) {
    if (!(error_reporting() & $severity)) return false;
    if (!headers_sent()) {
        http_response_code(500);
        header('Content-Type: application/json; charset=utf-8');
    }
    error_log("[API error] $message @ $file:$line");
    $debug = defined('APP_DEBUG') ? APP_DEBUG : (getenv('APP_DEBUG') === 'true');
    $msg = $debug ? "$message @ $file:$line" : 'Internal server error';
    echo json_encode(['success' => false, 'error' => $msg]);
    exit;
});

// Parse request
$method = $_SERVER['REQUEST_METHOD'];
$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

// Extract everything after api.php: /app-modern/api.php/v1/... → /v1/...
if (preg_match('#/api\.php(.*)#', $uri, $m)) {
    $uri = $m[1];
} else {
    // Fallback: remove leading path segments up to 'api'
    $uri = preg_replace('#^.*/api#', '/api', $uri);
}
$uri = '/' . trim($uri, '/');

// Split into segments
$segments = array_values(array_filter(explode('/', $uri)));

// Must start with v1 (after api.php stripping) or api/v1 (direct access)
if (isset($segments[0]) && $segments[0] === 'v1') {
    array_shift($segments); // remove 'v1'
} elseif (isset($segments[0]) && $segments[0] === 'api' && isset($segments[1]) && $segments[1] === 'v1') {
    array_shift($segments);
    array_shift($segments);
} else {
    error('API endpoint not found', 404);
}

// After shifting v1: segments = [resource, id/action, ...]
$resource = $segments[0] ?? '';
$id = $segments[1] ?? null;
$subAction = $segments[2] ?? null;

// Route to controller
switch ($resource) {
    case 'auth':
        require_once __DIR__ . '/../controllers/AuthController.php';
        $controller = new AuthController();

        match ($method) {
            'POST' => match ($id) {
                'login' => $controller->login(),
                'logout' => $controller->logout(),
                'change-password' => $controller->changePassword(),
                'google-login' => $controller->googleLogin(),
                'info-docente' => $controller->infoDocente(),
                default => error('Endpoint not found', 404),
            },
            'GET' => $controller->session(),
            default => error('Method not allowed', 405),
        };
        break;

    case 'students':
        requireAuth();
        require_once __DIR__ . '/../controllers/StudentController.php';
        $controller = new StudentController();

        match ($method) {
            'GET' => match ($subAction) {
                'search' => $controller->search(),
                null => $controller->index(),
                default => $controller->show($subAction),
            },
            'POST' => $controller->create(),
            'PUT' => match ($subAction) {
                'group' => $controller->updateGroup($id),
                default => $controller->update($id ?? ''),
            },
            'DELETE' => $controller->delete($id ?? ''),
            default => error('Method not allowed', 405),
        };
        break;

    case 'grades':
        requireAuth();
        require_once __DIR__ . '/../controllers/GradeController.php';
        $controller = new GradeController();

        match ($method) {
            'GET' => match ($subAction) {
                'student' => $controller->getByStudent(),
                'finals' => $controller->finals(),
                'quantities' => $controller->quantities(),
                'history' => $controller->history(),
                null => $controller->index(),
                default => error('Endpoint not found', 404),
            },
            'POST' => match ($subAction) {
                'close-editing' => $controller->closeEditing(),
                'open-editing' => $controller->openEditing(),
                default => $controller->create(),
            },
            'DELETE' => $controller->delete($id ?? ''),
            default => error('Method not allowed', 405),
        };
        break;

    case 'attendance':
        requireAuth();
        require_once __DIR__ . '/../controllers/AttendanceController.php';
        $controller = new AttendanceController();
        match ($method) {
            'GET' => $controller->index(),
            'POST' => $controller->create(),
            'DELETE' => $controller->delete($id ?? ''),
            default => error('Method not allowed', 405),
        };
        break;

    case 'convivencia':
        requireAuth();
        require_once __DIR__ . '/../controllers/ConvivenciaController.php';
        $controller = new ConvivenciaController();
        match ($method) {
            'GET' => match ($id) {
                'stats' => $controller->stats(),
                'items' => $controller->items(),
                'consolidation' => $controller->consolidation(),
                default => $controller->index(),
            },
            'POST' => $controller->create(),
            default => error('Method not allowed', 405),
        };
        break;

    case 'certificates':
        requireAuth();
        // TODO: Implement CertificateController
        error('Certificates API not yet implemented', 501);
        break;

    case 'teachers':
        requireAuth();
        require_once __DIR__ . '/../controllers/TeacherController.php';
        $controller = new TeacherController();
        match ($method) {
            'GET' => match ($id) {
                'assignments' => $controller->assignments(),
                null => $controller->index(),
                default => $controller->show($id),
            },
            default => error('Method not allowed', 405),
        };
        break;

    case 'candidates':
        requireAuth();
        require_once __DIR__ . '/../controllers/CandidateController.php';
        $controller = new CandidateController();
        match ($method) {
            'GET' => $controller->index(),
            'DELETE' => $controller->delete($id ?? ''),
            default => error('Method not allowed', 405),
        };
        break;

    case 'notifications':
        requireAuth();
        require_once __DIR__ . '/../controllers/NotificationController.php';
        $controller = new NotificationController();

        match ($method) {
            'GET' => match ($id) {
                'unread' => $controller->unread(),
                default => $controller->index(),
            },
            'POST' => match ($id) {
                default => $controller->create(),
            },
            default => error('Method not allowed', 405),
        };
        break;

    case 'reports':
        requireAuth();
        require_once __DIR__ . '/../controllers/ReportController.php';
        $controller = new ReportController();
        match ($method) {
            'GET' => match ($id) {
                'grades' => $controller->grades(),
                'attendance' => $controller->attendance(),
                'convivencia' => $controller->convivencia(),
                'students' => $controller->students(),
                default => error('Report type not specified', 400),
            },
            'POST' => match ($id) {
                default => error('Report action not specified', 400),
            },
            default => error('Method not allowed', 405),
        };
        break;

    case 'matriculaReport':
        requireAuth();
        // Get parameters
        $codigo = getQueryParam('codigo');
        $year = getQueryParam('year') ?? (int)date('Y');

        // Database connection
        $db = Database::getInstance()->getPdo();

        // Fetch student data
        $stmt = $db->prepare("
            SELECT
                e.ind,
                e.estudiante,
                e.nombres,
                '' as apellidos,  -- Assuming apellidos is not stored separately, using empty string
                e.codigo,
                e.genero,
                e.fecnac,
                e.edad,
                e.nivel,
                e.numero,
                e.grado,
                e.acudiente,
                e.telefono1,
                e.telefono2,
                e.direccion,
                e.email_estudiante as correo,
                COALESCE(e.telefono1, e.telefono2) as telefono,
                e.eps,
                e.estado,
                e.establecimiento,
                e.asignacion,
                'S' as etica  -- Placeholder for ética, adjust as needed based on actual data source
            FROM estugrupos e
            WHERE e.codigo = ? AND e.anio = ?
            LIMIT 1
        ");
        $stmt->execute([$codigo, $year]);
        $student = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$student) {
            header('Content-Type: application/json; charset=utf-8');
            http_response_code(404);
            echo json_encode(['error' => 'Student not found']);
            exit;
        }

        // Extract student data
        $estudiante_id = $student['estudiante'];
        $nombres = $student['nombres'];
        $apellidos = $student['apellidos'];
        $codigo = $student['codigo'];
        $nivel = $student['nivel'];
        $numero = $student['numero'];
        $asignacion = $student['asignacion'] ?? '';
        $year = $year; // already set
        $periodo = ''; // Not available in student data, leaving empty
        $establecimiento = $student['establecimiento'] ?? '';
        $createFolder = 'N'; // Not creating folders, outputting directly

        // Helper functions (copied from legacy scripts)
        function get_valoracion($v, PDO $db, string $year): string {
            if (empty($v)) return '';
            $stmt = $db->prepare('SELECT valoracion FROM escalas_1290 WHERE ? BETWEEN inicio AND fin AND year = ? LIMIT 1');
            $stmt->execute([(float)$v, $year]);
            return (string)($stmt->fetchColumn() ?: '');
        }

        function get_descripcion(string $HED, string $grado, string $asignatura, string $periodo, string $desempeno, PDO $db, string $year): string {
            if (empty($desempeno)) return '';
            $stmt = $db->prepare("
                SELECT descripcion FROM KonzernHED WHERE HED = ? AND grado = ? AND asignatura = ? AND periodo = ? AND desempeño = ? AND year = ?
            ");
            $stmt->execute([$HED, $grado, $asignatura, $periodo, $desempeno, $year]);
            $result = $stmt->fetchColumn();
            return $result ?: '';
        }

        function get_porcentaje(string $nivel, string $asignatura, PDO $db, string $year, string $asignacion): string {
            $stmt = $db->prepare("
                SELECT porcentaje FROM parametros_informe WHERE nivel = ? AND codigo_materia = ? AND año = ? AND asignacion = ?
            ");
            $stmt->execute([$nivel, $asignatura, $year, $asignacion]);
            $result = $stmt->fetchColumn();
            return $result ?: '0';
        }

        function get_inasistencia(string $estudiante, string $asignatura, PDO $db, string $year): string {
            $stmt = $db->prepare("
                SELECT COUNT(*) FROM inasistencia WHERE estudiante = ? AND asignatura = ? AND year = ?
            ");
            $stmt->execute([$estudiante, $asignatura, $year]);
            return (string)$stmt->fetchColumn();
        }

        // Function to get icon based on gender (simplified)
        function get_genero_icon($genero) {
            return strtolower($genero) === 'f' ? '♀️' : '♂️';
        }

        // Load PhpSpreadsheet
        $autoloadPaths = [
            __DIR__ . '/../../vendor/autoload.php',
            __DIR__ . '/vendor/autoload.php',
            __DIR__ . '/../vendor/autoload.php',
            __DIR__ . '/../legacy/vendor/autoload.php',
        ];
        $loaded = false;
        foreach ($autoloadPaths as $p) {
            if (file_exists($p)) { require $p; $loaded = true; break; }
        }
        if (!$loaded) {
            http_response_code(500);
            header('Content-Type: application/json; charset=utf-8');
            echo json_encode(['error' => 'PhpSpreadsheet autoload not found']);
            exit;
        }

        // Create new spreadsheet
        $spreadsheet = new \PhpOffice\PhpSpreadsheet\Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();

        // Set document properties
        $spreadsheet->getProperties()->setCreator('Sistema de Gestión Académica')
            ->setLastModifiedBy('Sistema de Gestión Académica')
            ->setTitle('Informe de Matrícula')
            ->setSubject('Informe de Matrícula')
            ->setDescription('Informe de matrícula para estudiante')
            ->setKeywords('matrícula informe')
            ->setCategory('informe');

        // Set up the Excel-like structure for the report (simplified version)
        // We'll create a simple table with student data

        // Header
        $sheet->setCellValue('A1', 'INFORME DE MATRÍCULA');
        $sheet->getStyle('A1')->getFont()->setSize(16)->setBold(true);
        $sheet->mergeCells('A1:D1');

        // Student data
        $sheet->setCellValue('A3', 'Código:');
        $sheet->setCellValue('B3', $codigo);
        $sheet->setCellValue('A4', 'Nombre:');
        $sheet->setCellValue('B4', $nombres . ' ' . $apellidos);
        $sheet->setCellValue('A5', 'Identificación:');
        $sheet->setCellValue('B5', $estudiante_id);
        $sheet->setCellValue('A6', 'Sede:');
        $sheet->setCellValue('B6', $establecimiento);
        $sheet->setCellValue('A7', 'Grado:');
        $sheet->setCellValue('B7', $nivel . '-' . $numero);
        $sheet->setCellValue('A8', 'Correo:');
        $sheet->setCellValue('B8', $correo);
        $sheet->setCellValue('A9', 'Teléfono:');
        $sheet->setCellValue('B9', $telefono);

        // Add QR code placeholder (we'll use an image or just text for now)
        $sheet->setCellValue('A12', 'Código QR:');
        $sheet->setCellValue('B12', '[QR Code for ' . $codigo . ']');

        // Set column widths
        $sheet->getColumnDimension('A')->setWidth(20);
        $sheet->getColumnDimension('B')->setWidth(30);

        // Style headers
        $sheet->getStyle('A3:A9')->getFont()->setBold(true);

        // Output PDF directly
        header('Content-Type: application/pdf');
        header('Content-Disposition: inline; filename="reporte_' . $codigo . '.pdf"');

        $writer = \PhpOffice\PhpSpreadsheet\IOFactory::createWriter($spreadsheet, 'Pdf');
        $writer->save('php://output');
        exit;

    case 'periods':
        $periods = Database::getInstance()->fetchAll(
            "SELECT nombre AS value, nombre AS label,
                    IF(CURDATE() BETWEEN fechainicial AND fechafinal, 1, 0) AS current
             FROM periodos
             WHERE nombre <> 'MINIMAS'
             ORDER BY ind"
        );
        success($periods);
        break;

    case 'years':
        $currentYear = (int) date('Y');
        $years = array_map(fn($y) => ['value' => (string) $y, 'label' => (string) $y], range($currentYear, $currentYear - 3));
        success($years);
        break;

    case 'config':
        require_once __DIR__ . '/../controllers/ConfigPorcentajesController.php';
        (new ConfigPorcentajesController())->handle($id, $method);
        break;

    case 'dev':
        if (!APP_DEBUG) {
            error('Dev endpoints disabled in production', 403);
        }
        match ($id) {
            'status' => success([
                'debug' => true,
                'mode' => Database::getMode(),
                'default_mode' => Database::getModeDefault(),
                'overridden' => Database::isModeOverridden(),
                'host' => DB_HOST,
                'name' => DB_NAME,
            ]),
            'db-mode' => match ($method) {
                'POST' => (function () {
                    $data = getJsonInput();
                    $mode = strtolower((string) ($data->mode ?? ''));
                    if (!in_array($mode, ['local', 'cloud', 'default'], true)) {
                        error('Modo inválido. Use: local, cloud o default', 400);
                    }
                    if ($mode === 'default') {
                        setcookie('db_mode_override', '', [
                            'expires' => time() - 3600,
                            'path' => '/',
                            'httponly' => false,
                            'samesite' => 'Lax',
                        ]);
                    } else {
                        setcookie('db_mode_override', $mode, [
                            'expires' => time() + 86400 * 30,
                            'path' => '/',
                            'httponly' => false,
                            'samesite' => 'Lax',
                        ]);
                    }
                    Database::reset();
                    success([
                        'mode' => $mode === 'default' ? Database::getModeDefault() : $mode,
                        'default_mode' => Database::getModeDefault(),
                        'overridden' => $mode !== 'default' && $mode !== Database::getModeDefault(),
                    ], 'Modo actualizado. Recargue la página para aplicar.');
                })(),
                default => error('Método no permitido', 405),
            },
            default => error('Dev endpoint no encontrado', 404),
        };
        break;

    case 'sedes':
        requireAuth();
        require_once __DIR__ . '/../controllers/FilterController.php';
        (new FilterController())->sedes();
        break;

    case 'grupos':
        requireAuth();
        require_once __DIR__ . '/../controllers/FilterController.php';
        (new FilterController())->grupos();
        break;

    case 'niveles':
        requireAuth();
        require_once __DIR__ . '/../controllers/FilterController.php';
        match ($id) {
            'nombres' => (new FilterController())->nombresNiveles(),
            default => (new FilterController())->niveles(),
        };
        break;

    case 'asignaturas':
        requireAuth();
        require_once __DIR__ . '/../controllers/FilterController.php';
        (new FilterController())->asignaturas();
        break;

    default:
        error('Resource not found', 404);
}
