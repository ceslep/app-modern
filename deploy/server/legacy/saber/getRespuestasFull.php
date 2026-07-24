<?php
require_once("headers.php");
require_once("datosConexion.php");
$mysqli->set_charset("utf8");



$sql = "select prueba,respuesta,estudiante,inicio,fin,concat_ws(' ',apellido1,apellido2,nombre1,nombre2) as nombres";
$sql.=" ,Nivel,grupo,round((time_to_sec(fin)-time_to_sec(inicio))/60,2) as tiempo from respuestas";
$sql .= " inner join estudiantes on respuestas.estudiante=estudiantes.identificacion";
$sql .= " where 1=1";
if (!isset($datos->todos))
    $sql .= " and estudiante='$datos->estudiante'";
if (isset($datos->prueba))
    $sql .= " and prueba='$datos->prueba'";
$sql .= " and periodo='$datos->periodo'";
//ESQL($sql);
$datos = [];
$result = $mysqli->query($sql);
while ($dato = $result->fetch_assoc()) {
    $dato['respuesta'] = json_decode($dato['respuesta']);
    $datos[] = $dato;
}
echo json_encode($datos);
$mysqli->close();
?>