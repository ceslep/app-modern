<?php



header("Access-Control-Allow-Origin: *");
require_once("datos_conexion.php");
$datos = json_decode(file_get_contents("php://input"));
$mysqli = new mysqli($host, $user, $pass, $database);

$mysqli->query("SET NAMES utf8");
$mysqli->set_charset('utf8');


$sql = "
    SELECT grado,sede,periodo,count(periodo) as cantidad_de_periodos FROM `cantidadesNulas`
group by sede,grado,periodo
having cantidad_de_periodos>1
order by sede,grado,field(periodo,'UNO','DOS','TRES','CUATRO');
    ";

$result = $mysqli->query($sql);
$datos = $result->fetch_all(MYSQLI_ASSOC);


echo json_encode($datos);
$result->free();
$mysqli->close();
