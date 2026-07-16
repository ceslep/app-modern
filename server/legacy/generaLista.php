<?php
require __DIR__ . '/vendor/autoload.php';
require("datos_conexion.php");

use PhpOffice\PhpSpreadsheet\Style\Fill;

$datos = json_decode(file_get_contents("php://input"));
$mysqli = new mysqli($host, $user, $pass, $database);
if ($mysqli->connect_error) {
    echo json_encode(["estado" => "error", "mensaje" => "DB connection failed"]);
    exit();
}
$mysqli->set_charset('utf8');

// --- Input Validation ---
$nivel = $datos->nivel ?? '';
$numero = $datos->numero ?? '';
$asignacion = $datos->Asignacion ?? '';
$year_input = $datos->year ?? date('Y');
$establecimiento = $datos->establecimiento ?? $asignacion;

// --- Load Excel Template ---
try {
    $reader = \PhpOffice\PhpSpreadsheet\IOFactory::createReader("Xlsx");
    $spreadsheet = $reader->load("lista.xlsx");
    $sheet = $spreadsheet->getActiveSheet();
} catch (Exception $e) {
    echo json_encode(["estado" => "error", "mensaje" => "No se pudo cargar la plantilla 'lista.xlsx'."]);
    exit();
}

// --- Fetch Director's Name ---
$sql_director = "
    SELECT d.nombres as director 
    FROM docentes d
    WHERE d.identificacion = (
        SELECT aa.docente 
        FROM asignacion_asignaturas aa
        INNER JOIN docentes doc ON aa.docente = doc.identificacion
        WHERE aa.nivel = ? AND aa.numero = ? AND aa.asignatura = 'COMP.SOC' AND doc.asignacion = ? AND aa.year = ?
        LIMIT 1
    ) AND d.asignacion = ?
";
$stmt_director = $mysqli->prepare($sql_director);
$stmt_director->bind_param("sssss", $nivel, $numero, $asignacion, $year_input, $asignacion);
$stmt_director->execute();
$nombreDirector = $stmt_director->get_result()->fetch_assoc()['director'] ?? '';
$stmt_director->close();

// --- Fetch Student List ---
$sql_students = "
    SELECT codigo, nombres 
    FROM estugrupos
    WHERE nivel = ? AND numero = ? AND asignacion = ? AND year = ?
";
if ($year_input === date('Y')) {
    $sql_students .= " AND activo = 'S'";
}
$sql_students .= " ORDER BY nombres";

$stmt_students = $mysqli->prepare($sql_students);
$stmt_students->bind_param("ssss", $nivel, $numero, $asignacion, $year_input);
$stmt_students->execute();
$result_students = $stmt_students->get_result();

// --- Populate Excel Sheet ---
$sheet->setCellValue("grupo", "$nivel-$numero");
$sheet->setCellValue("H6", "LISTADO DE ESTUDIANTES POR GRADO AÑO. " . $year_input);
$sheet->setCellValue("director", $nombreDirector);

// Clear old data
for ($i = 10; $i <= 54; $i++) {
    $sheet->setCellValue("A$i", "");
    $sheet->setCellValue("C$i", "");
    $sheet->setCellValue("G$i", "");
}

// Add new student data
$fila = 10;
while ($dato = $result_students->fetch_assoc()) {
    $sheet->setCellValue("A$fila", $fila - 9);
    $sheet->setCellValue("C$fila", $dato['codigo']);
    $sheet->setCellValue("G$fila", $dato['nombres']);
    $fila++;
}
$stmt_students->close();
$mysqli->close();

// --- Styling and Protection ---
if ($fila > 10) {
    $last_row = $fila - 1;
    $styles = [
        "AA10:AG$last_row" => 'C6EFCE', // Verde
        "AJ10:AP$last_row" => 'D9E1F2', // Azul
        "AS10:AY$last_row" => 'FFFCE6', // Amarillo
        "BC10:BC$last_row" => 'FCE4D6', // Naranja
        "BF10:BF$last_row" => 'FFD9EC'  // Rosa
    ];
    foreach ($styles as $range => $color) {
        $sheet->getStyle($range)->getFill()->setFillType(Fill::FILL_SOLID)->getStartColor()->setRGB($color);
    }
}
$protection_pass = 'CHANGED_PASSWORD'; // Consider moving to a config file
$sheet->getProtection()->setPassword($protection_pass);
$sheet->getProtection()->setSheet(true);
$sheet->protectCells("A1:BH73", $protection_pass);

// --- File Generation ---
$writer = \PhpOffice\PhpSpreadsheet\IOFactory::createWriter($spreadsheet, "Xlsx");
$folder = 'xlsx/' . $asignacion . '/' . $nivel . '-' . $numero;
if (!file_exists($folder)) {
    mkdir($folder, 0755, true);
}
$filename_base = $folder . "/" . $nivel . '-' . $numero . '-' . $asignacion;
if (file_exists($filename_base . '.xlsx')) {
    unlink($filename_base . '.xlsx');
}
$writer->save($filename_base . '.xlsx');

echo json_encode([
    "estado" => "ok",
    "href" => $filename_base . '.xlsx',
    "folder" => $folder,
    "filename" => $filename_base
], JSON_UNESCAPED_SLASHES);
?>