<?php

header("Access-Control-Allow-Origin: *");
require_once "datos_conexion.php";
$mysqli = new mysqli($host, $user, $pass, $database);
$datos = (object) json_decode(file_get_contents("php://input"));
if (isset($datos->asignacion)) 
$asignacion = $datos->asignacion;
else
$asignacion = $datos->Asignacion;
$nivel = $datos->nivel;
$numero = $datos->numero;
$asignatura = $datos->asignatura;
$docente = $datos->docente;
if (isset($datos->PERIODO))
$periodo = $datos->PERIODO;
else
$periodo = $datos->periodo;
$mysqli->query("SET NAMES utf8");
$mysqli->set_charset('utf8');

$sql = "select notas.estudiante as asignatura,if(avg(notas.valoracion) is not null,avg(notas.valoracion),0) as valoracion,nombres from notas";
$sql .= " inner join estugrupos on notas.estudiante=estugrupos.estudiante";
$sql .= " where asignatura='$asignatura'";
$sql .= " and docente='$docente'";
$sql .= " and nivel='$nivel'";
$sql .= " and numero='$numero'";
$sql .= " and periodo='$periodo'";
$sql .= " and notas.year=year(curdate())";
$sql .= " and estugrupos.year=year(curdate())";
//$sql.=" and valoracion is not null";
$sql .= " group by notas.asignatura,nivel,numero,notas.estudiante,valoracion";
$sql.=" order by valoracion";
//echo json_encode(array("sql" => $sql));exit(0);
$result = $mysqli->query($sql);
$datos = $result->fetch_all(MYSQLI_ASSOC);

echo json_encode($datos);
$result->free();
$mysqli->close();
