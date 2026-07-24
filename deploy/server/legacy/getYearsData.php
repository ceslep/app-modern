<?php
header("Access-Control-Allow-Origin: *");
require_once("datos_conexion.php");
$mysqli = new mysqli($host, $user, $pass, $database);
$datos = json_decode(file_get_contents("php://input"));
$mysqli->query("SET NAMES utf8");
$mysqli->set_charset('utf8');

$sql = "select distinct year from estugrupos where year<>0 order by year desc";

$result = $mysqli->query($sql);

$datos=$result->fetch_all(MYSQLI_ASSOC);




echo json_encode($datos);
