<?php
require_once("headers.php");
require_once("datosConexion.php");
$mysqli->set_charset("utf8");



$sql = "select * from preguntas where Nombre_del_Docente='$datos->docente'";
if ($datos->NucleoComun!="")
$sql.=" and NucleoComun='$datos->NucleoComun'";
if ($datos->Nivel!="")
$sql.=" and Nivel='$datos->Nivel'";
if ($datos->periodo!="")
$sql .= "and periodo='$datos->periodo'";
//ESQL($sql);
$datos=[];
$result = $mysqli->query($sql);
echo json_encode($result->fetch_All(MYSQLI_ASSOC));
$mysqli->close();
?>