<?php



require_once("headers.php");
require_once("datos_conexion.php");
$mysqli = new mysqli($host, $user, $pass, $database);
$datos = (Object)json_decode(file_get_contents("php://input"));
$mysqli->query("SET NAMES utf8");
$mysqli->set_charset('utf8');

$estudiante = $datos->estudiante;
$asignatura = $datos->asignatura;
$periodo = $datos->periodo;
$grado=$datos->grado;
$docente = $datos->docente;
$valoracion = $datos->valoracion;
$year = date("Y");
$sql = "replace into notas (estudiante,docente,asignatura,grado,periodo,valoracion,year,aspecto1,aspecto2,aspecto3,aspecto4,aspecto5,aspecto6,aspecto7,aspecto8,aspecto9,aspecto10,aspecto11,aspecto12) ";
$sql.=" values ('$estudiante','$docente','$asignatura','$grado','$periodo','$valoracion','$year','Desde certificado','Desde certificado','Desde certificado','Desde certificado','Desde certificado','Desde certificado','Desde certificado','Desde certificado','Desde certificado','Desde certificado','Desde certificado','Desde certificado')";
 //echo json_encode(array("sql"=>$sql));exit(0);
$mysqli->query($sql);

if ($mysqli->query($sql)) echo json_encode(array("msg"=>"ok"));
$mysqli->close();

?>