<?php
require __DIR__ . '/vendor/autoload.php';
require("datos_conexion.php");

// --- Helper Functions (Secure and Refactored) ---

function translateMonth($month) {
    $months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    return $months[$month - 1] ?? '';
}

function getValoracion($valor, $mysqli, $year) {
    if ($valor == 0) return "";
    $stmt = $mysqli->prepare("SELECT valoracion FROM escalas_1290 WHERE ? BETWEEN inicio AND fin AND year = ?");
    $stmt->bind_param("ds", $valor, $year);
    $stmt->execute();
    $result = $stmt->get_result()->fetch_assoc();
    $stmt->close();
    return $result['valoracion'] ?? "";
}

// --- Main Logic ---

$datos = json_decode(file_get_contents("php://input"));
$mysqli = new mysqli($host, $user, $pass, $database);
if ($mysqli->connect_error) {
    echo json_encode(["estado" => "error", "mensaje" => "DB connection failed"]);
    exit();
}
$mysqli->set_charset('utf8');

// --- Input Validation ---
$estudiante_id = $datos->estudiante ?? '';
$current_year = $datos->year ?? date('Y');
$nivel = (int)($datos->nivel ?? -1);
$nombres = $datos->nombres ?? '';
$codigo = $datos->codigo ?? '';
$asignacion = $datos->asignacion ?? '';

// --- Template Selection ---
$yearcert = $current_year === "2021" ? "" : "-" . $current_year;
$sedecert = $asignacion === "5" ? "-sede5" : "";
$excelFile = '';
if ($nivel == 0) $excelFile = "informe-preescolar.xlsx";
elseif ($nivel >= 1 && $nivel < 6) $excelFile = "certificado-primaria{$yearcert}{$sedecert}.xlsx";
elseif ($nivel >= 6 && $nivel < 10) $excelFile = "certificado-bachillerato{$yearcert}.xlsx";
elseif ($nivel >= 10) $excelFile = "certificado-media{$yearcert}.xlsx";

if (empty($excelFile) || !file_exists($excelFile)) {
    echo json_encode(["estado" => "error", "mensaje" => "No se encontró la plantilla de certificado para el nivel proporcionado."]);
    exit();
}

try {
    $reader = \PhpOffice\PhpSpreadsheet\IOFactory::createReader("Xlsx");
    $spreadsheet = $reader->load($excelFile);
    $sheet = $spreadsheet->getActiveSheet();
} catch (Exception $e) {
    echo json_encode(["estado" => "error", "mensaje" => $e->getMessage()]);
    exit();
}

// --- Populate Static Data ---
$sheet->setCellValue("nombreEstudiante", $nombres);
$sheet->setCellValue("estudiante", $estudiante_id);
$sheet->setCellValue("codigo", $codigo);

$stmt_grado = $mysqli->prepare("SELECT nombre FROM nombresNiveles WHERE nivel = ?");
$stmt_grado->bind_param("i", $nivel);
$stmt_grado->execute();
$grado_nombre = $stmt_grado->get_result()->fetch_assoc()['nombre'] ?? '';
$stmt_grado->close();
$sheet->setCellValue("grado", $grado_nombre);

$date = date('d') . " de " . translateMonth(date('m')) . " de " . date('Y');
$sheet->setCellValue('fecha', 'Dado en Anserma Caldas, ' . $date);
$sheet->setCellValue("year", $current_year);

// --- Populate Dynamic Area Data (Optimized) ---
$asignacion_suffix = $asignacion === "5" ? "_5" : "";
$sql_areas = "
    SELECT 
        pca.area,
        pca.fila_certificado,
        ROUND(SUM(0.01 * n.valoracion * pca.porcentaje) / 4, 2) as valoracion_area
    FROM notas n
    INNER JOIN porcentajes_area_colegio{$asignacion_suffix} pca ON n.asignatura = pca.asignatura
    INNER JOIN orden_asignaturas oa ON n.asignatura = oa.asignatura
    WHERE n.estudiante = ? 
      AND pca.nivel = ?
      AND n.valoracion != 0
      AND n.year = ?
      AND pca.year = ?
    GROUP BY n.estudiante, pca.area
    ORDER BY oa.orden
";

$stmt_areas = $mysqli->prepare($sql_areas);
$stmt_areas->bind_param("siss", $estudiante_id, $nivel, $current_year, $current_year);
$stmt_areas->execute();
$result_areas = $stmt_areas->get_result();

while ($area_data = $result_areas->fetch_assoc()) {
    $fila = $area_data['fila_certificado'];
    if (empty($fila)) continue;

    $valoracion_final = $area_data['valoracion_area'];
    $desempeno = getValoracion($valoracion_final, $mysqli, $current_year);
    
    $celda = '';
    switch ($desempeno) {
        case "SUPERIOR": $celda = "Z" . $fila; break;
        case "ALTO": $celda = "AH" . $fila; break;
        case "BASICO": $celda = "AP" . $fila; break;
        case "BAJO": $celda = "AX" . $fila; break;
    }
    if (!empty($celda)) {
        $sheet->setCellValue($celda, $valoracion_final);
    }
}
$stmt_areas->close();
$mysqli->close();

// --- File Generation ---
$writer = \PhpOffice\PhpSpreadsheet\IOFactory::createWriter($spreadsheet, "Xlsx");
$folder = 'xlsx/' . ($datos->establecimiento ?? 'default') . '/' . ($datos->nivel ?? 'N') . '-' . ($datos->numero ?? 'N');
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