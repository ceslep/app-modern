<?php
require_once("headers.php");
require_once("datosConexion.php");

/* $datos->identificacion="1011098505";
    $datos->pass="1011098505"; */
if(!isset($datos->year)) $year=Date("Y"); else $year=$datos->year;


$identificacion=$datos->identificacion??"";
$pass=$datos->pass??"";
$periodo = getPeriodoActual($mysqli);
$sql = sprintf("select estugrupos.*,'%s' as periodo from estugrupos", $periodo);
$sql .= " where estudiante='$identificacion'";
$sql .= " and pass='$pass'";
$sql .= " and year='$year'";
 //SQIO($mysqli,$sql);
//esql($sql);
$result = $mysqli->query($sql);
if ($result->num_rows > 0) {
    $login = $result->fetch_ALL(MYSQLI_ASSOC);
    $sql = "
        Select docentes.nombres as nombresDocente,notas.* from notas 
        inner join docentes on notas.docente=docentes.identificacion
        inner join orden_asignaturas on notas.asignatura=orden_asignaturas.asignatura
        where estudiante='$datos->identificacion' and year='$year'
            order by FIELD(periodo,'UNO','DOS','TRES','CUATRO'),orden
        ";
    //SQIO($mysqli,$sql);
    $result = $mysqli->query($sql);
    $data = $result->fetch_ALL(MYSQLI_ASSOC);
    $data = array("acceso" => "si", "periodo" => $periodo, "nombres" => $login[0]['nombres'], "grado" => $login[0]['nivel'] . '-' . $login[0]['numero'], "estudiante" => $login[0]['estudiante'], "asignacion" => $login[0]['asignacion'], "dataNotas" => $data);
} else{
    $sql = "
     Select identificacion,nombres,pass,maestra,asignacion,codigoTemporal,idn from docentes
	 where ((identificacion='{$identificacion}' and pass='{$pass}' ) 
     or (identificacion='{$identificacion}' 
     and maestra='{$pass}' )) ";
     $result = $mysqli->query($sql);
     //echo json_encode(array("sql"=>$sql));exit(0);
     if ($result->num_rows > 0) {
        $datos_docente=$result->fetch_assoc();
        $data=array("docente"=>"true","asignacion"=>$datos_docente['asignacion'],"nombres"=>$datos_docente['nombres'],"periodo"=>$periodo);
     }
     else
    $data = array("acceso" => "denegado");
}
echo json_encode($data);
$result->free();
$mysqli->close();
