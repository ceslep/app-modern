<?php
require __DIR__ . '/vendor/autoload.php';
require("datos_conexion.php");

function translateMonth($month) {
    $months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    return $months[(int)$month - 1] ?? '';
}

$datos = json_decode(file_get_contents("php://input"));
$mysqli = new mysqli($host, $user, $pass, $database);
if ($mysqli->connect_error) {
    echo json_encode(["estado" => "error", "mensaje" => "DB connection failed"]);
    exit();
}
$mysqli->set_charset('utf8');

// --- Input Validation ---
$nivel = (int)($datos->nivel ?? 0);
$nombres = $datos->nombres ?? '';
$estudiante_id = $datos->estudiante ?? '';
$asignacion = $datos->asignacion ?? '';
$year_input = $datos->year ?? date('Y');
$establecimiento = $datos->establecimiento ?? 'default';
$numero = $datos->numero ?? '';

if (empty($nombres) || empty($estudiante_id)) {
    echo json_encode(["estado" => "error", "mensaje" => "Datos del estudiante incompletos."]);
    exit();
}

// --- Load Excel Template ---
try {
    $reader = \PhpOffice\PhpSpreadsheet\IOFactory::createReader("Xlsx");
    $spreadsheet = $reader->load("constancia.xlsx");
    $sheet = $spreadsheet->getActiveSheet();
} catch (Exception $e) {
    echo json_encode(["estado" => "error", "mensaje" => "No se pudo cargar la plantilla 'constancia.xlsx'."]);
    exit();
}

// --- Fetch Data from DB with Prepared Statements ---

// Get Grado
$stmt_grado = $mysqli->prepare("SELECT CONCAT(LOWER(LEFT(nombre, 1)), LOWER(SUBSTRING(replace(nombre, 'GRADO', 'GRADO (?)'), 2))) as nombre FROM nombresNiveles WHERE nivel = ?");
$stmt_grado->bind_param("si", $nivel, $nivel);
$stmt_grado->execute();
$grado = $stmt_grado->get_result()->fetch_assoc()['nombre'] ?? '';
$stmt_grado->close();

// Get Jornada
$like_nivel = "%" . $nivel . "%";
$like_asignacion = "%" . $asignacion . "%";
$stmt_jornada = $mysqli->prepare("SELECT valor FROM intensidadHoraria WHERE nivel LIKE ? AND asignacion LIKE ?");
$stmt_jornada->bind_param("ss", $like_nivel, $like_asignacion);
$stmt_jornada->execute();
$jornada = $stmt_jornada->get_result()->fetch_assoc()['valor'] ?? '';
$stmt_jornada->close();

// Get Inasistencias
$stmt_inasistencia = $mysqli->prepare("SELECT SUM(horas) as inasistencia FROM inasistencia WHERE (horas NOT IN ('r', 'f', 't')) AND estudiante = ? AND year = ?");
$stmt_inasistencia->bind_param("ss", $estudiante_id, $year_input);
$stmt_inasistencia->execute();
$inasistencia = $stmt_inasistencia->get_result()->fetch_assoc()['inasistencia'] ?? 0;
$stmt_inasistencia->close();

$mysqli->close();

// --- Populate Excel Sheet ---
$constancia_text = "Que el(la) estudiante $nombres identificado(a) con documento de identidad Nº $estudiante_id, se encuentra matriculado(a) en esta institución cursando las asignaturas correspondientes al $grado, $jornada.";
$sheet->setCellValue("constancia", $constancia_text);

$inasistencias_text = "Total de inasistencias en lo corrido del año lectivo $year_input = $inasistencia horas.";
$sheet->setCellValue("inasistencias", $inasistencias_text);

$date = date('d') . " de " . translateMonth(date('m')) . " de " . date('Y');
$sheet->setCellValue('fecha', 'Dado en Anserma Caldas, ' . $date);

// --- File Generation ---
$writer = \PhpOffice\PhpSpreadsheet\IOFactory::createWriter($spreadsheet, "Xlsx");
$folder = 'xlsx/' . $establecimiento . '/' . $nivel . '-' . $numero;
if (!file_exists($folder)) {
    mkdir($folder, 0755, true);
}
$filename_base = $folder . "/" . preg_replace('/[^A-Za-z0-9\-]/ ', '', $nombres) . '-' . $estudiante_id;

$writer->save($filename_base . '.xlsx');

echo json_encode([
    "estado" => "ok",
    "href" => $filename_base . '.xlsx',
    "folder" => $folder,
    "filename" => $filename_base
], JSON_UNESCAPED_SLASHES);
?>