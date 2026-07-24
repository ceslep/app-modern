<?php
header("Access-Control-Allow-Origin: *");
require_once("datos_conexion.php");
$mysqli = new mysqli($host, $user, $pass, $database);
$mysqli->query("SET NAMES utf8");
$mysqli->set_charset('utf8');
$datos = json_decode(file_get_contents("php://input"));


$sql = "update estugrupos2 set edad = floor((to_days(curdate())-to_days(fecnac))/365.242199) where 1=1";
$mysqli->query($sql);

if(isset($datos->ind))
$sql="Select *,sede,estugrupos2.ind as ind from estugrupos2
      left join sedes on estugrupos2.asignacion=sedes.ind 
      where estugrupos2.ind=$datos->ind 
      order by year desc,asignacion,nivel,numero,nombres limit 1
      ";  
else
$sql = "Select *,sede,estugrupos2.ind as ind from estugrupos
      left join sedes on estugrupos2.asignacion=sedes.ind 
	  where year=$datos->year
      order by asignacion,nivel,numero,nombres
      ";



//echo $sql;exit(0);
$result = $mysqli->query($sql);
echo json_encode($result->fetch_all(MYSQLI_ASSOC));
$result->free();
$mysqli->close();
