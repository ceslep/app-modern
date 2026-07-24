<?php

header("Access-Control-Allow-Origin: *");
require_once("datos_conexion.php");
$mysqli = new mysqli($host, $user, $pass, $database);
$datos = (object)json_decode(file_get_contents("php://input"));
$mysqli->query("SET NAMES utf8");
$mysqli->set_charset('utf8');
//$nivel = $datos->nivel + 0;



$datos = (object)json_decode(file_get_contents("php://input"));
$sql = "
    select estugrupos.estudiante,estugrupos.nombres,sedes.sede,notas.grado,notas.asignatura,notas.valoracion,notas.periodo from notas
inner join estugrupos on notas.estudiante=estugrupos.estudiante and notas.year=estugrupos.year
inner join sedes on estugrupos.asignacion=sedes.ind
where 1=1
and notas.year=year(curdate())
and notas.valoracion in (NULL,'',null)
and estugrupos.activo='S' and 1=-1
    ";
$result = $mysqli->query($sql);
$datos = $result->fetch_ALL(MYSQLI_ASSOC);

echo json_encode($datos);
$result->free();
$mysqli->close();
