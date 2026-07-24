<?php

header("Access-Control-Allow-Origin: *");
require_once("datos_conexion.php");
$mysqli = new mysqli($host, $user, $pass, $database);
$datos = (object)json_decode(file_get_contents("php://input"));
$mysqli->query("SET NAMES utf8");
$mysqli->set_charset('utf8');



$datos = (object)json_decode(file_get_contents("php://input"));
$sql = "
select sede,grado,periodo,count(periodo) as cperiodo from cantidadesNulas
where 1=-1
group by sede,grado,periodo
HAVING cperiodo>1
order by sede,grado, field(
        periodo,
        'UNO',
        'DOS',
        'TRES',
        'CUATRO'
    );
    ";
$result = $mysqli->query($sql);
$datos = $result->fetch_ALL(MYSQLI_ASSOC);

echo json_encode($datos);
$result->free();
$mysqli->close();
