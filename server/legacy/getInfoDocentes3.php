<?php
require_once "headers.php";
require_once "datos_conexion.php";
$mysqli = new mysqli($host, $user, $pass, $database);
$datos = (Object) json_decode(file_get_contents("php://input"));
$mysqli->query("SET NAMES utf8");
$mysqli->set_charset('utf8');
$sql = "SELECT identificacion,nombres,sedes.sede,asignacion from docentes
  inner join sedes on docentes.asignacion=sedes.ind
 where nombres not like '%COORD%'
  order by asignacion,nombres";
//echo json_encode(array("sql"=>$sql));exit(0);
$docentes = $mysqli->query($sql);
echo json_encode($docentes->fetch_all(MYSQLI_ASSOC));
$docentes->free_result();
$mysqli->close();
