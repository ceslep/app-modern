<?php
    require_once("headers.php");
    require("datos_conexion.php");
    $datos = (object) json_decode(file_get_contents("php://input"));
    $mysqli = new mysqli($host,$user,$pass,$database);
    $sql="select id,fecha,hora,horaSalida,identificacion,nombres,asunto,tipo_visitante from registroIngresos where 1=1";
    if (!isset($datos->todos))
    $sql.=" and horaSalida='00:00:00'";
    $sql.=" order by fecharegistro desc";
    if(isset($datos->todos)) $sql.=" limit 100";
    $result=$mysqli->query($sql);
    $resultados=[];
    while($resultado=$result->fetch_assoc()) $resultados[]=$resultado;
    echo json_encode($resultados);
    $result->free();
    $mysqli->close();