<?php
    header('Access-Control-Allow-Origin: *');
    require("datos_conexion.php");
    $mysqli = new mysqli($host,$user,$pass,$database);
    $datos=(Object)json_decode(file_get_contents("php://input"));
    $sql="select * from periodos";
    $result=$mysqli->query($sql);
    $resultados=[];
    while($resultado=$result->fetch_assoc()) $resultados[]=$resultado;
    echo json_encode($resultados);
    $result->free();
    $mysqli->close();