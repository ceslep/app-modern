<?php
require_once("headers.php");
require_once("datos_conexion.php");
$mysqli = new mysqli($host, $user, $pass, $database);

$mysqli->query("SET NAMES utf8");
$mysqli->set_charset('utf8');

$datos = (object) json_decode(file_get_contents("php://input"));
$sql = "Select distinct identificacion,nombres from  docentes as d";
$sql.=" inner join asignacion_asignaturas as b on d.identificacion=b.docente";
$sql .= " where d.asignacion='$datos->asignacion' and b.nivel='$datos->nivel' and b.numero='$datos->numero'";
$sql .= " and d.activo='S'";
$sql .= " and b.year='$datos->year'";
$sql .= " order by d.nombres";
//echo json_encode(array("sql"=>$sql));exit(0);
$result = $mysqli->query($sql);
$datos = [];
while ($dato = $result->fetch_assoc())
    $datos[] = $dato;
echo json_encode($datos);
$result->free();
$mysqli->close();