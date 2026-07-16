<?php

header("Access-Control-Allow-Origin: *");
require_once("datos_conexion.php");
$mysqli = new mysqli($host, $user, $pass, $database);
$datos = (object)json_decode(file_get_contents("php://input"));
$mysqli->query("SET NAMES utf8");
$sql = "
   
    delete from notas_historico_docente where
    docente='$datos->identificacionH' and
    asignatura='$datos->asignatura' and
    grado='$datos->grado' and
    periodo='$datos->periodo' and
    year='$datos->year'
";
$mysqli->query($sql);
$sql = "
        insert into notas_historico_docente
        select * from notas where
        docente='$datos->identificacionH' and
        asignatura='$datos->asignatura' and
        grado='$datos->grado' and
        periodo='$datos->periodo' and
        year='$datos->year'
    ";
//    echo json_encode(array("sql"=>$sql));exit(0);
if ($mysqli->query($sql)) echo json_encode(array("mensaje" => "ok"));
else echo json_encode(array("mensaje" => "error"));

$mysqli->close();
