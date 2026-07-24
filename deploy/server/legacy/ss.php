<?php

require __DIR__ . '/vendor/autoload.php';
require("datos_conexion.php");

function valoract($v, $n, $cst)
{
    $resultado = "";
    if ($v != "") {
        $v = $v / $n;
        $sql = 'select valoracion from escalas_1290';
        $sql .= " where $v between inicio and fin";
        //echo json_encode(array("sql"=>$sql));
        //exit(0);
        $valoracion = $cst->query($sql);
        if ($valoracion->num_rows > 0)
            while ($valorac = $valoracion->fetch_assoc()) $resultado = $valorac['valoracion'];
        else $resultado = "";
        $valoracion->free();
    }
    return $resultado;

 
}

function descripcion($grado,$asignatura,$periodo,$docente,$desempeno,$estudiante,$fila,$cst)
{
    $resultado = "";
    
        
        $sql = 'select descripcion from desempenos';
        $sql .= " where grado='$grado' and asignatura='$asignatura' and periodo='$periodo' and docente='$docente' and desempeno='$desempeno'";
        if (($asignatura=="TECNOLOG")&&($desempeno=="ALTO")){
        echo json_encode(array("sql"=>$sql,"estudiante"=>$estudiante,"fila"=>$fila));
        exit(0);
        }
        $descripcion = $cst->query($sql);
        if ($descripcion->num_rows > 0)
            while ($desc = $descripcion->fetch_assoc()) $resultado = $desc['descripcion'];
        else $resultado = "";
        $descripcion->free();
    
    return $resultado;

 
}

function getPorcentaje($nivel,$asignatura,$cst)
{
   
    $resultado="";
        
        $sql = 'select  porcentaje from porcentajes_area_colegio';
        $sql .= " where nivel='$nivel' and asignatura='$asignatura'";
       
   
        $porcentaje = $cst->query($sql);
           
        if ($porcentaje->num_rows > 0){
            $porc = $porcentaje->fetch_assoc();
             $resultado = $porc['porcentaje'];
        }
        $porcentaje->free();
     /*     if ($asignatura=="QUIMICA"){
        echo json_encode(array("sql"=>$sql,"porcentaje"=>$resultado));
        exit(0);
        }*/
    return $resultado;

 
}

function inasistencia($estudiante,$asignatura,$cst)
{
    $resultado = "0";
    
        
        $sql = 'select sum(inasistencia.horas) as inasistencia from inasistencia';
        $sql .= " where estudiante='$estudiante' and materia='$asignatura'";
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

$reader = \PhpOffice\PhpSpreadsheet\IOFactory::createReader("Xlsx");
$nivel = $datos->nivel + 0;
    if ($nivel == 0) $excelFile = "informe-preescolar.xlsx";
    else
        if (($nivel >= 1) && ($nivel < 6)) $excelFile = "informe_basica.xlsx";
    else
    	if (($nivel >= 6) && ($nivel < 10)) $excelFile = "in2.xlsx";
    else
    	if ($nivel >= 10) $excelFile = "in2-media.xlsx";
        
$spreadsheet = $reader->load($excelFile);

$sheet = $spreadsheet->getActiveSheet();
//echo json_encode(array("estado"=>"bien"));exit(0);
$sheet->setCellValue('M11', $datos->periodo);
if ($datos->periodo != "CINCO") {
    $sheet->setCellValue('A11', "INFORME");
    $sheet->setCellValue('M11', $datos->periodo);
} else {
    $sheet->setCellValue('M11', "FINAL");
    $sheet->setCellValue('A11', "INFORME");
}
$sheet->setCellValue('M9', $datos->nombres . " - " . $datos->estudiante);
$sheet->setCellValue('AA11', $datos->nivel . "-" . $datos->numero);
$sheet->setCellValue('AL11', $datos->establecimiento);


$mysqli = new mysqli($host, $user, $pass, $database);

if ($datos->periodo != "CINCO")
    $sql = 'select asignatura,sum(replace(valoracion,",",".")) as valoracion,docente from notas';
else
    $sql = 'select asignatura,sum(replace(valoracion,",","."))/4 as valoracion,docente from notas';
$sql .= " where estudiante='$datos->estudiante' and periodo='$datos->periodo'";
$sql .= " group by asignatura";

$result = $mysqli->query($sql);

while ($dato = $result->fetch_assoc()) {
    $nivel = $datos->nivel + 0;
    if ($nivel == 0) $tabla = "parametros_informe_preescolar";
    else
        if (($nivel >= 1) && ($nivel <= 5)) $tabla = "parametros_informe_basica";
    else
    	if (($nivel >= 6) && ($nivel <= 11)) $tabla = "parametros_informe";
    
    $asignatura = $dato['asignatura'];
    $sql = "select fila from " . $tabla;
    $sql .= " where codigo_materia='$asignatura'";
    $result2 = $mysqli->query($sql);
    if ($result2->num_rows>0)
    $fila = $result2->fetch_assoc()['fila'];
    //echo json_encode(array("fila"=>$fila,"sql"=>$sql));exit(0);
    $desempeno=valoract($dato['valoracion'], 1, $mysqli);
    $xcelda = "H" . $fila;
    if ($xcelda == "H") continue;
    $sheet->setCellValue($xcelda,inasistencia($datos->estudiante,$asignatura,$mysqli));
    $xcelda = "K" . $fila;
    if ($xcelda == "K") continue;
    
    $sheet->setCellValue($xcelda, descripcion($datos->nivel."-".$datos->numero,$asignatura,$datos->periodo,$dato['docente'],$desempeno,$datos->estudiante,$fila,$mysqli));
    $xcelda = "AW" . $fila;
    $sheet->setCellValue($xcelda, $desempeno);
    
 /*   if ($asignatura=="QUIMICA"){
        echo json_encode(array("sql"=>$sql,"porcentaje"=>$porc,"fila"=>$fila,"celda"=>$xcelda));
        exit(0);
        }*/
    
    $xcelda = "BC" . $fila;
    $valoracion = $dato['valoracion'] + 0;
    $sheet->setCellValue($xcelda, $valoracion);
    $xcelda = "BB" . $fila;
    $porc = getPorcentaje($datos->nivel,$asignatura,$mysqli);
    $sheet->setCellValue($xcelda, $porc);
    $sheet->setCellValue($xcelda, $porc);
    $sheet->setCellValue($xcelda, $porc);
    /*if ($asignatura=="QUIMICA"){
        echo json_encode(array("porcentaje"=>$porc));
        exit(0);
        }

}*/

$spreadsheet->getActiveSheet()->getProtection()->setPassword('CHANGED_PASSWORD');
$spreadsheet->getActiveSheet()->getProtection()->setSheet(true);
$spreadsheet->getActiveSheet()->getProtection()->setSort(true);
$spreadsheet->getActiveSheet()->getProtection()->setInsertRows(true);
$spreadsheet->getActiveSheet()->getProtection()->setFormatCells(true);
$spreadsheet->getActiveSheet()->protectCells('A1:BH73', 'CHANGED_PASSWORD');

$result->free();
$mysqli->close();
//echo json_encode(array("ok"=>"okk"));exit(0);
$writer = \PhpOffice\PhpSpreadsheet\IOFactory::createWriter($spreadsheet, "Xlsx");
if (isset($datos->createFolder)) {
    $folder = 'xlsx/' . $datos->nivel . '-' . $datos->numero;
    if (!file_exists($folder))
        mkdir($folder, 0755, true);
    $filename = $datos->nombres . '-' . $datos->estudiante;
    $filename = $folder . "/" . $filename;
    if (file_exists($filename)) unlink($filename);
} else
    $filename = 'xlsx/'.$datos->nombres . '-' . $datos->estudiante;
  //  echo json_encode(array("filename"=>$filename));exit(0);

$writer->save($filename . '.xlsx');
/*
\PhpOffice\PhpSpreadsheet\IOFactory::registerWriter('Pdf', \PhpOffice\PhpSpreadsheet\Writer\Pdf\Mpdf::class);

 Redirect output to a client’s web browser (PDF)
/*header('Content-Type: application/pdf');
header('Content-Disposition: attachment;filename="in2.pdf"');
header('Cache-Control: max-age=0');*/
/*
$writer = \PhpOffice\PhpSpreadsheet\IOFactory::createWriter($spreadsheet, 'Pdf');
//$writer->save('php://output');
$writer->save('pdfs/' . $filename . '.pdf');*/

//$writer = new \PhpOffice\PhpSpreadsheet\Writer\Html($spreadsheet);
//$writer->save('html/' . $datos->estudiante . '.htm');

//echo json_encode(array("estado" => "ok", "href" =>  $filename . '.xlsx', 'filename' => $filename, 'html' => 'html/' . $datos->estudiante . '.htm'), JSON_UNESCAPED_SLASHES);
