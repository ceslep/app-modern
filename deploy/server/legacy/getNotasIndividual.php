<?php
require_once("headers.php");
require("datos_conexion.php");
$mysqli = new mysqli($host, $user, $pass, $database);
$datos = (Object) json_decode(file_get_contents("php://input"));
$sql = "select asignatura,valoracion from notas\n";
$sql .= " where 1=1\n";
$sql .= " and estudiante='$datos->estudiante'\n";
$sql .= " and periodo='$datos->periodo'\n";
if ($datos->asignaturas!=="")
$sql .= " and asignatura in ($datos->asignaturas)\n";
$sql .= " and year=year(curdate())";
// echo json_encode(array("sql"=>$sql));exit(0);
$result = $mysqli->query($sql);
$notas = $result->fetch_all(MYSQLI_ASSOC);
echo json_encode($notas);
$result->free();
$mysqli->close();