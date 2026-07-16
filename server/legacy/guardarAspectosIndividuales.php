<?php



//header("Access-Control-Allow-Origin: *");
require_once("datos_conexion.php");
require("headers.php");
$mysqli = new mysqli($host, $user, $pass, $database);

$mysqli->query("SET NAMES utf8");
$mysqli->set_charset('utf8');
date_default_timezone_set('America/Bogota');

// Obtener la fecha y hora del servidor
$fechahora = date("Y-m-d H:i:s");

$aspectos = json_decode(file_get_contents("php://input"), true);





$query_base = "REPLACE INTO `aspectosIndividuales` (`docente`, `grado`, `periodo`, `asignatura`, `aspecto`, `porcentaje`, `fecha`, `nota`,`year`) VALUES ";

foreach ($aspectos as $aspecto) {
    $docente=$aspecto['docente'];
    $grado=$aspecto['grado'];
    $periodo=$aspecto['periodo'];
    $asignatura=$aspecto['asignatura'];
    $aspectotxt=$aspecto['aspecto'];
    $porcentaje=$aspecto['porcentaje'];
    $fecha=$aspecto['fecha'];
    $nota=$aspecto['nota'];
    $year=$aspecto['year'];
    $subquery="('$docente','$grado','$periodo','$asignatura','$aspectotxt','$porcentaje','$fecha','$nota','$year')";
  
  $query .= $subquery . ",";
}

$query = substr($query, 0, -1);
$query=$query_base." ".$query;


if ($mysqli->query($query)) {
    echo json_encode(array("msg" => "exito","sql"=>$query));
} else
    echo json_encode(array("msg" => "Error", "error" => sprintf("Mensaje: %s", $mysqli->error), "sql" => $sql));
    $query="UPDATE aspectosIndividuales set porcentaje=NULL where porcentaje=0.00 and docente='$docente' and asignatura='$asignatura' and periodo='$periodo' and year=$year";

$mysqli->query($query);

$query="UPDATE aspectosIndividuales set fecha=NULL where fecha='0000-00-00' and docente='$docente' and asignatura='$asignatura' and periodo='$periodo' and year=$year";

$query="DELETE  FROM aspectosIndividuales where (aspecto='' or aspecto is null) and 
docente='$docente' and 
asignatura='$asignatura' and periodo='$periodo' and year=$year";

$mysqli->query($query);
$mysqli->close();
