<?php

require __DIR__ . '/vendor/autoload.php';
require("datos_conexion.php");

use PhpOffice\PhpSpreadsheet\Style\Fill;

function inasistencia($estudiante){
    $mysqli=$GLOBALS['mysqli'];
    $datos=$GLOBALS['datos']; // This $datos is the global one, which is the decoded JSON.
    
    // Safely access properties from the global $datos object
    $periodo_global = $datos->PERIODO ?? '';
    $year_global = $datos->year ?? date('Y');
    $asignatura_global = $datos->asignatura ?? '';

    $sql="select sum(horas) as total from inasistencia
          where
          estudiante='$estudiante' and periodo='$periodo_global'
          and year='$year_global'
          and materia='$asignatura_global'  
    ";
    $inasistencias=($mysqli->query($sql))->fetch_assoc()['total'];
    return $inasistencias!=="0"?$inasistencias:"";
}

$datos = (object)json_decode(file_get_contents("php://input"));

// Safely access properties using the null coalescing operator
$PERIODO = $datos->PERIODO ?? '';
$year = $datos->year ?? date('Y');
$asignatura = $datos->asignatura ?? '';
$docente = $datos->docente ?? '';
$nivel = $datos->nivel ?? '';
$numero = $datos->numero ?? '';
$createFolder = $datos->createFolder ?? null;


$reader = \PhpOffice\PhpSpreadsheet\IOFactory::createReader("Xlsx");
$excelFile = "planilla.xlsx";

$mysqli = new mysqli($host, $user, $pass, $database);

$sql = "
select nombres  from docentes
 where identificacion ='$docente'
";
//SQIO($mysqli,$sql);
$docente_result = $mysqli->query($sql);
if ($row = $docente_result->fetch_assoc()) {
    $nombreDocente = $row['nombres'];
} else     $nombreDocente = "";


//echo json_encode(array("sql"=>str_replace("\r\n",",",$nombreDocente)));exit(0);



$spreadsheet = $reader->load($excelFile);

$sheet = $spreadsheet->getActiveSheet();


$activo=$year===date('Y')?"and activo='S'":"";
$grado="$nivel-$numero";
$sql = "
            SELECT estugrupos.nombres,notas.* from notas
            inner join estugrupos on notas.estudiante=estugrupos.estudiante
            where 
            asignatura='$asignatura'
            and notas.grado='$grado'
            and docente='$docente'
            $activo 
            and estugrupos.year='$year'
            and notas.year='$year'
            and notas.periodo='$PERIODO'
            order by nombres
    ";
//echo json_encode(array("sql"=>str_replace("\r\n",",",$sql)));exit(0);
$result = $mysqli->query($sql);
$fila = 10;
$sheet->setCellValue("grado", $nivel . "-" . $numero);
$sheet->setCellValue("docente", $nombreDocente);
$sheet->setCellValue("asignatura", $asignatura);
$sheet->setCellValue("periodo", $PERIODO);
$sheet->setCellValue("year", $year);

$letras = array();

for ($i = ord('D'); $i <= ord('P'); $i++) {
    $letras[] = chr($i);
}

while ($fila <= 60) {
    $indcelda = "A" . $fila;
        $sheet->setCellValue($indcelda, "");
        $indcelda = "B" . $fila;
        $sheet->setCellValue($indcelda, "");
    foreach ($letras as $letra) {
        $indcelda = $letra . $fila;
        $sheet->setCellValue($indcelda, "");
    }
    $fila++;
}
$fila = 10;
while ($dato = $result->fetch_assoc()) {

    foreach ($letras as $indice => $letra) {
        $indcelda=$letra.$fila;
        if($indice+1<=12){
        $sheet->setCellValue($indcelda, $dato['nota'.($indice+1)]);
        $aspectocelda="R".(22+$indice);
        $sheet->setCellValue($aspectocelda, $dato['aspecto'.($indice+1)]);
        $fechacelda="T".(9+$indice);
        $sheet->setCellValue($fechacelda, $dato['fecha'.($indice+1)]);
        $porcentajecelda="R".(9+$indice);
        $sheet->setCellValue($porcentajecelda, $dato['porcentaje'.($indice+1)]);
        $inasistenciafila="P". $fila;
        $sheet->setCellValue($inasistenciafila,inasistencia($dato['estudiante']));
        }
    }

    $indcelda = "A" . $fila;
    $sheet->setCellValue($indcelda, ($fila-9));
    $indcelda = "B" . $fila;
    $sheet->setCellValue($indcelda, $dato['nombres']);
    $indcelda = "C" . $fila;
    $sheet->setCellValue($indcelda, $dato['valoracion']);
   
    $fila++;
}


/* $spreadsheet->getActiveSheet()->getProtection()->setPassword('CHANGED_PASSWORD');
$spreadsheet->getActiveSheet()->getProtection()->setSheet(true);
$spreadsheet->getActiveSheet()->getProtection()->setSort(true);
$spreadsheet->getActiveSheet()->getProtection()->setInsertRows(true);
$spreadsheet->getActiveSheet()->getProtection()->setFormatCells(true);
$spreadsheet->getActiveSheet()->protectCells('A1:BH73', 'CHANGED_PASSWORD'); */

$result->free();
$mysqli->close();

$writer = \PhpOffice\PhpSpreadsheet\IOFactory::createWriter($spreadsheet, "Xlsx");
if (isset($createFolder)) {
    $folder = 'xlsx/' . $docente . '/' . $nivel . '-' . $numero;
    if (!file_exists($folder))
        mkdir($folder, 0755, true);
    $filename = $nivel . '-' . $numero . '-' . $asignatura;
    $filename = $folder . "/" . $filename;
    if (file_exists($filename)) unlink($filename);
} else
    $filename = $nivel . '-' . $numero . '-' . $asignatura.'-periodo-'.$PERIODO;
//  echo json_encode(array("filename"=>$filename));exit(0);

$writer->save($filename . '.xlsx');



\PhpOffice\PhpSpreadsheet\IOFactory::registerWriter('Pdf', \PhpOffice\PhpSpreadsheet\Writer\Pdf\Mpdf::class);

/* Redirect output to a client’s web browser (PDF)
header('Content-Type: application/pdf');
header('Content-Disposition: attachment;filename="in2.pdf"');
header('Cache-Control: max-age=0');*/

$writer = \PhpOffice\PhpSpreadsheet\IOFactory::createWriter($spreadsheet, 'Pdf');
//$writer->save('php://output');
$writer->save('pdfs/reporte.pdf');

//$writer = new \PhpOffice\PhpSpreadsheet\Writer\Html($spreadsheet);
//$writer->save('html/' . $datos->estudiante . '.htm');

echo json_encode(array("estado" => "ok", "href" =>  $filename . '.xlsx', 'folder' => $docente . "/" . $nivel . '-' . $numero, 'filename' => $filename, 'html' => 'html/' . $docente . '.htm'), JSON_UNESCAPED_SLASHES);