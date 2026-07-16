<?php

require __DIR__ . '/vendor/autoload.php';
require("datos_conexion.php");

function translateMonth($month) {
    switch ($month) {
        case '1':
            return 'Enero';
            break;
        case '2':
            return 'Febrero';
            break;
        case '3':
            return 'Marzo';
            break;
        case '4':
            return 'Abril';
            break;
        case '5':
            return 'Mayo';
            break;
        case '6':
            return 'Junio';
            break;
        case '7':
            return 'Julio';
            break;
        case '8':
            return 'Agosto';
            break;
        case '9':
            return 'Septiembre';
            break;
        case '10':
            return 'Octubre';
            break;
        case '11':
            return 'Noviembre';
            break;
        case '12':
            return 'Diciembre';
            break;
    }
}

function valoract($v, $n, $cst,$year)
{
    $resultado = "";
    if ($v != "") {
        $v = $v / $n;
        $sql = 'select valoracion from escalas_1290';
        $sql .= " where $v between inicio and fin";
        $sql.=" and year='$year'";
        $valoracion = $cst->query($sql);
     //   echo json_encode(array("sql"=>$sql));exit(0);
        if ($valoracion->num_rows > 0)
            while ($valorac = $valoracion->fetch_assoc()) $resultado = $valorac['valoracion'];
        else $resultado = "";
        $valoracion->free();
    }
    return $resultado;

 
}

function descripcion($grado,$asignatura,$periodo,$docente,$desempeno,$nivel,$estudiante,$fila,$cst,$year)
{
    $resultado = "";
    
        
        $sql = 'select descripcion from desempenos';
        if ($nivel<=5)
        //$sql .= " where grado='$grado' and asignatura='$asignatura' and periodo='$periodo' and docente='$docente' and desempeno='$desempeno'";
        $sql .= " where grado='$grado' and asignatura='$asignatura' and periodo='$periodo' and desempeno='$desempeno'";
        else
        $sql .= " where grado='$grado' and asignatura='$asignatura' and periodo='$periodo'  and desempeno='$desempeno'";
        $sql.=" and year='$year'  limit 1";
        //echo json_encode(array("sql"=>$sql));exit(0);
        $descripcion = $cst->query($sql);
        if ($descripcion->num_rows > 0)
            while ($desc = $descripcion->fetch_assoc()) $resultado = $desc['descripcion'];
        else $resultado = "";
        $descripcion->free();
        if ($resultado=="") $resultado="DOCENTE NO REPORTA INFORMACION :(";
    
    return $resultado;

 
}

function getPorcentaje($nivel,$asignatura,$cst,$year)
{
   
    $resultado="";
        
        $sql = 'select  porcentaje from porcentajes_area_colegio';
        $sql .= " where nivel='$nivel' and asignatura='$asignatura'";
        $sql.=" and year='$year'";
   
        $porcentaje = $cst->query($sql);
           
        if ($porcentaje->num_rows > 0){
            $porc = $porcentaje->fetch_assoc();
             $resultado = $porc['porcentaje'];
        }
        $porcentaje->free();
    
    return $resultado;


// Función para generar un PDF a partir de un archivo XLSX
function generarPDFdeXLSX($rutaXLSX, $rutaPDF)
{
    // Carga el archivo XLSX existente
    $reader = \PhpOffice\PhpSpreadsheet\IOFactory::createReader("Xlsx");
    $spreadsheet = $reader->load($rutaXLSX);
    // Registrar el writer PDF si no está registrado
    \PhpOffice\PhpSpreadsheet\IOFactory::registerWriter('Pdf', \PhpOffice\PhpSpreadsheet\Writer\Pdf\Mpdf::class);
    $writer = \PhpOffice\PhpSpreadsheet\IOFactory::createWriter($spreadsheet, 'Pdf');
    $writer->save($rutaPDF);
}

 
}

function inasistencia($estudiante,$asignatura,$cst,$year)
{
    $resultado = "0";
    
        
        $sql = 'select sum(inasistencia.horas) as inasistencia from inasistencia';
        $sql .= " where estudiante='$estudiante' and materia='$asignatura'";
        $sql.=" and year='$year'";
        $sql.=" group by estudiante,materia";     
       /* if ($asignatura=="MATEMATI"){
        echo json_encode(array("sql"=>$sql));
        exit(0);
        }*/
        $inasistencia = $cst->query($sql);
        if ($inasistencia->num_rows > 0)
            while ($inas = $inasistencia->fetch_assoc()) $resultado = $inas['inasistencia'];
        else $resultado = "0";
        $inasistencia->free();
    
    return $resultado;

 
}




$datos = (object)json_decode(file_get_contents("php://input"));

// Safely access properties using the null coalescing operator
$nivel = ($datos->nivel ?? 0) + 0;
$year_input = $datos->year ?? date('Y');
$asignacion_input = $datos->asignacion ?? '';
$nombres = $datos->nombres ?? '';
$estudiante = $datos->estudiante ?? '';
$codigo = $datos->codigo ?? '';
$promedio = $datos->promedio ?? null; // Can be null if not always present
$createFolder = $datos->createFolder ?? null; // Can be null if not always present
$establecimiento = $datos->establecimiento ?? '';
$numero = $datos->numero ?? '';


$yearcert=$year_input==="2021"?"":"-".$year_input;
$sedecert=$asignacion_input==="5"?"-sede5":"";

//echo json_encode(array("year"=>$yearcert));exit(0);
    if ($nivel == 0) $excelFile = "informe-preescolar.xlsx";
    else
        if (($nivel >= 1) && ($nivel < 6)) $excelFile = "certificado-primaria$yearcert$sedecert.xlsx";
    else
    	if (($nivel >= 6) && ($nivel < 10)) $excelFile = "certificado-bachillerato$yearcert.xlsx";
    else
    	if ($nivel >= 10) $excelFile = "certificado-media$yearcert.xlsx";

        try {
            $spreadsheet = $reader->load($excelFile);
        } catch (Exception $e) {
            echo json_encode(array("estado"=>"error","mensaje"=>$e->getMessage()));exit(0);
        }
            

$sheet = $spreadsheet->getActiveSheet();




$mysqli = new mysqli($host, $user, $pass, $database);
$xcelda="nombreEstudiante";
$sheet->setCellValue($xcelda, $nombres);
$xcelda="estudiante";;
$sheet->setCellValue($xcelda, $estudiante);
$sql="select ind from estugrupos where estudiante='$estudiante'";
//$codigo=$mysqli->query($sql)->fetch_assoc()['ind'];
$xcelda="codigo";
$sheet->setCellValue($xcelda, $codigo);
$sql="select nombre from nombresNiveles where nivel='$nivel'";
$grado=$mysqli->query($sql)->fetch_assoc()['nombre'];
$xcelda="grado";
$sheet->setCellValue($xcelda, $grado);
//php current date in local time    

$date = date('d')." de ".translateMonth(date('m'))." de ".date('Y');



$xcelda="fecha";
$sheet->setCellValue($xcelda,'Dado en Anserma Caldas, '.$date);

$xcelda="year";
$sheet->setCellValue($xcelda, $year_input);


$asignacion_suffix=$asignacion_input==="5"?"_5":"";

$sql="select porcentajes_area_colegio$asignacion_suffix.area,round(sum(0.01*valoracion*porcentajes_area_colegio$asignacion_suffix.porcentaje)/4,2) as valoracion from notas";
$sql.=" inner join porcentajes_area_colegio$asignacion_suffix on notas.asignatura=porcentajes_area_colegio$asignacion_suffix.asignatura ";
$sql.=" inner join orden_asignaturas on orden_asignaturas.asignatura=notas.asignatura";
$sql.=" where estudiante='$estudiante' and porcentajes_area_colegio$asignacion_suffix.nivel='$nivel' and valoracion!=0";
$sql.=" and notas.year='$year_input'";
$sql.=" and porcentajes_area_colegio$asignacion_suffix.year='$year_input'";

$sql.=" group by estudiante,porcentajes_area_colegio$asignacion_suffix.area";
$sql.=" order by orden_asignaturas.orden";
//echo json_encode(array("sql"=>$sql));exit(0);
$result = $mysqli->query($sql);
$datoss=[];
while ($dato = $result->fetch_assoc()) {
    
   
    $area=$dato['area'];
    $sql = "select fila_certificado from porcentajes_area_colegio$asignacion_suffix";
    $sql .= " where area='$area'";
    $sql.=" and year='$year_input'";
    $sql.=" and nivel='$nivel'";
    $result2 = $mysqli->query($sql);
    
    
    
    if (isset($promedio))
  //  $sheet->setCellValue('promedio', $datos->promedio);
    $fila="";
    if ($result2->num_rows>0)
    $fila = $result2->fetch_assoc()['fila_certificado'];
  
    $desempeno=valoract($dato['valoracion'], 1, $mysqli,$year_input);
    switch($desempeno){
        case "SUPERIOR":
            $xcelda="Z".$fila;
            break;
        case "ALTO":
            $xcelda="AH".$fila;
            break;
        case "BASICO":
            $xcelda="AP".$fila;
            break;
        case "BAJO":
            $xcelda="AX".$fila;
            break;
        } 
    $sheet->setCellValue($xcelda, $dato['valoracion']);
 
    
    $datoss[]=array("asig"=>$asignatura,"des"=>$desempeno,"val"=>$valoracion,"porc"=>$porc,"fila"=>$fila,"nivel"=>$nivel,"estudiante"=>$estudiante);
   

}
/*
$spreadsheet->getActiveSheet()->getProtection()->setPassword('CHANGED_PASSWORD');
$spreadsheet->getActiveSheet()->getProtection()->setSheet(true);
$spreadsheet->getActiveSheet()->getProtection()->setSort(true);
$spreadsheet->getActiveSheet()->getProtection()->setInsertRows(true);
$spreadsheet->getActiveSheet()->getProtection()->setFormatCells(true);
$spreadsheet->getActiveSheet()->protectCells('A1:BH73', 'CHANGED_PASSWORD');
*/

$result->free();
$mysqli->close();

$writer = \PhpOffice\PhpSpreadsheet\IOFactory::createWriter($spreadsheet, "Xlsx");
if (isset($createFolder)) { // Use the safely accessed $createFolder
    $folder = 'xlsx/'.$establecimiento.'/'. $nivel . '-' . $numero; // Use safely accessed variables
    if (!file_exists($folder))
        mkdir($folder, 0755, true);
    $filename = $nombres . '-' . $estudiante; // Use safely accessed variables
    $filename = $folder . "/" . $filename;
    if (file_exists($filename)) unlink($filename);
} else
    $filename = 'xlsx/'.$nombres . '-' . $estudiante.'-'.$year_input; // Use safely accessed variables
  //  echo json_encode(array("filename"=>$filename));exit(0);

$writer->save($filename . '.xlsx');




// Generar PDF a partir del XLSX generado y guardarlo en la misma ubicación
$rutaXLSX = $filename . '.xlsx';
$rutaPDF = preg_replace('/\\.xlsx$/i', '.pdf', $rutaXLSX);
generarPDFdeXLSX($rutaXLSX, $rutaPDF);

// Llamar a la función para generar el PDF en la misma ubicación que el XLSX

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

echo json_encode(array("estado" => "ok", "href" =>  $filename . '.xlsx','folder'=>$asignacion_input."/". $nivel . '-' . $numero ,'filename' => $filename, 'html' => 'html/' . $estudiante . '.htm','datoss'=>$datoss), JSON_UNESCAPED_SLASHES);

?>