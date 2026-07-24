<?php
require_once("datos_conexion.php");
$mysqli = new mysqli($host, $user, $pass, $database);

$mysqli->query("SET NAMES utf8");
$mysqli->set_charset('utf8');

$notas = json_decode(file_get_contents("php://input"), true);

$sql="select estado from estadoNotas";
echo ($mysqli->query($sql))->fetch_assoc()['estado'];exit(0); 