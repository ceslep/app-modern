<?php



require_once("headers.php");
require_once("datos_conexion.php");

$mysqli = new mysqli($host, $user, $pass, $database);

$mysqli->query("SET NAMES utf8");
$mysqli->set_charset('utf8');


$sql = "Select * from  sedes";
$result = $mysqli->query($sql);
$datos = [];
while ($dato = $result->fetch_assoc()) {
    $ind = $dato['ind'];
    $sql = "
        select distinct nivel,numero from estugrupos
        where asignacion='$ind' and year=year(curdate())
        order by nivel,numero;
        ";
    $grados = ($mysqli->query($sql))->fetch_all(MYSQLI_ASSOC);
    $dato['grados'] = $grados;
    $datos[] = $dato;
}
echo json_encode($datos);
$result->free();
$mysqli->close();
