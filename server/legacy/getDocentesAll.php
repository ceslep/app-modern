<?php
// getDocentesAll.php — lista completa de docentes activos para dropdowns.
require_once("headers.php");
require_once("datos_conexion.php");
$mysqli = new mysqli($host, $user, $pass, $database);

$mysqli->query("SET NAMES utf8");
$mysqli->set_charset('utf8');

$sql = "Select distinct identificacion,nombres from docentes where activo='S' order by nombres";
$result = $mysqli->query($sql);
$datos = [];
while ($dato = $result->fetch_assoc())
    $datos[] = $dato;
echo json_encode($datos);
$result->free();
$mysqli->close();
