<?php
require_once("headers.php");
require_once("datosConexion.php");
$mysqli->set_charset("utf8");



$sql = "select respuesta from respuestas where estudiante='$datos->estudiante'";
if (isset($datos->prueba))
$sql.=" and prueba='$datos->prueba'";
$sql .= "and periodo='$datos->periodo'";
//esql($sql);
$datos=[];
$result = $mysqli->query($sql);
echo json_encode($result->fetch_All());
$mysqli->close();
?>