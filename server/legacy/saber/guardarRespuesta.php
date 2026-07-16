<?php
require_once("headers.php");
require_once("datosConexion.php");
$mysqli->set_charset("utf8");
$respuesta = json_encode($datos->respuesta);


$sql = "replace into respuestas (inicio,fin,estudiante,periodo,prueba,respuesta) values (";
$sql .= "'$datos->inicio','$datos->fin','$datos->estudiante','$datos->periodo','$datos->prueba','$respuesta'";
$sql .= ")";
//esql($sql);
if ($mysqli->query($sql))
    echo json_encode(array("guardado" => true));
else
    json_encode(array("guardado" => false));

$sql = "delete from respuestas where periodo=0";
$mysqli->query($sql);
$sql = "select respuesta from respuestas where estudiante='$datos->estudiante' and prueba='$datos->prueba'";
$mysqli->close();
?>