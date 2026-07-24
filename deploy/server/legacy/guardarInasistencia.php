<?php



header("Access-Control-Allow-Origin: *");
require_once("datos_conexion.php");
$mysqli = new mysqli($host, $user, $pass, $database);
$datos = json_decode(file_get_contents("php://input"));
date_default_timezone_set('America/Bogota');
$mysqli->query("SET time_zone = 'America/Bogota'");
$mysqli->query("SET NAMES utf8");
$mysqli->set_charset('utf8');

$estudiante = $datos->estudiante;
$materia = $datos->materia;
$fecha = $datos->fecha;
$horas = $datos->horas;
$periodo = $datos->periodo;
$docente = $datos->docente;
$textexcusa = $datos->excusa;
$hora_clase = $datos->hora_clase;
$detalle = $datos->detalle;
$nivel = $datos->nivel;
$numero = $datos->numero;
$asignacion = $datos->asignacion;
$device='';
if (isset($datos->device))
$device=$datos->device;
$year = date("Y");
$convivencia="";
date_default_timezone_set('America/Bogota');

// Obtener la fecha y hora del servidor
$fechahora = date("Y-m-d H:i:s");
$sql = "replace into inasistencia values (null,'$estudiante','$nivel','$numero','$asignacion','$materia','$periodo','$fecha','$horas','$textexcusa','$docente','$hora_clase','$convivencia','$fechahora','$detalle','$device','$year')";
// echo json_encode(array("sql"=>$sql));exit(0);
$mysqli->query($sql);
$sql = "update inasistencia set fechahora=date_sub(fechahora,interval 6 hour)";
$sql .= " where estudiante='$estudiante' and materia='$materia' and fecha='$fecha' and periodo='$periodo' and year='$year'";
$mysqli->query($sql);
$sql = "update inasistencia,excusas set inasistencia.excusa=excusas.motivo";
$sql .= " WHERE inasistencia.estudiante=excusas.estudiante and excusas.fecha=inasistencia.fecha";
$sql .= " and inasistencia.estudiante='$estudiante' and inasistencia.estudiante='$estudiante'";
$sql .= " and year(inasistencia.fecha)=year(curdate())";
$mysqli->query($sql);
$sql = "update inasistencia,excusas set inasistencia.excusa=excusas.motivo WHERE inasistencia.estudiante='$estudiante'";
$sql .= " and excusas.estudiante='$estudiante' and inasistencia.estudiante=excusas.estudiante and to_days(excusas.fecha)=to_days(inasistencia.fecha)+1 and year(inasistencia.fecha)=year(curdate())";
$mysqli->query($sql);
echo json_encode(array("msj" => "ok"));
$mysqli->close();
