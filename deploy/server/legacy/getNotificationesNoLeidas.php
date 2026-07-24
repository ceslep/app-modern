<?php

header("Access-Control-Allow-Origin: *");
require_once "datos_conexion.php";
$mysqli = new mysqli($host, $user, $pass, $database);
$body = json_decode(file_get_contents('php://input') ?: '{}') ?: new stdClass();
$docente = $body->docente ?? $_GET['docente'] ?? null;
$mysqli->query("SET NAMES utf8");
$mysqli->set_charset('utf8');

if (empty($docente)) {
    echo json_encode(['count' => 0]);
    $mysqli->close();
    exit;
}

$docente = $mysqli->real_escape_string((string) $docente);
$sql="select notifyind from notificacionesLeidas";
$sql.=" where docente='$docente'";
$result=$mysqli->query($sql);
$inds=$result->fetch_all();
//echo json_encode($inds);exit(0);
$winds="";
$i=0;
foreach($inds as $ind){
    if($i<count($inds)-1)
        $winds.=sprintf("'%s',",$ind[0]);
    else
    $winds.=sprintf("'%s'",$ind[0]);
    $i++;
}
//echo json_encode(sprintf("(%s)",$winds));exit(0);
$sql = "select * from notificaciones";
if ($winds!=="")
$sql.=sprintf(" where ind not in (%s)",$winds);
$sql.=" order by fecha desc,hora desc";
//echo json_encode($sql); exit(0);
$result = $mysqli->query($sql);


$datos = $result->fetch_all(MYSQLI_ASSOC);

echo json_encode(['count' => count($datos)]);

$mysqli->close();
