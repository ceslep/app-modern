<?php
require_once("headers.php");
require_once("datos_conexion.php");
$mysqli = new mysqli($host, $user, $pass, $database);
$mysqli->query("SET NAMES utf8");
$mysqli->set_charset('utf8');

$datos = (object) json_decode(file_get_contents("php://input"));

$sql = "select DISTINCT a.docente,a.asignatura,d.nombres from asignacion_asignaturas as a\n";
$sql .= " inner join orden_asignaturas as o on a.asignatura=o.asignatura\n";
$sql .= " inner join docentes as d on a.docente=d.identificacion\n";
$sql .= " where 1=1\n";
$sql .= " and d.asignacion='$datos->sede'\n";
$sql .= " and a.nivel='$datos->nivel'\n";
$sql .= " and a.numero='$datos->numero'\n";
if ($datos->docente!=="")
$sql .= " and d.identificacion='$datos->docente'\n";
$sql .= " and d.activo='S'\n";
$sql .= " and a.year=year(curdate())";
$sql .= " order by o.orden";
//echo json_encode(array("sql" => $sql, "datos" => count($Datos)));exit(0);

$result = $mysqli->query($sql);
$estudiantes = $result->fetch_all(MYSQLI_ASSOC);
echo json_encode($estudiantes);


$result->free();
$mysqli->close();