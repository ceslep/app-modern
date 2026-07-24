<?php
    require("datos_conexion.php");
    $mysqli = new mysqli($host,$user,$pass,$database);
    $datos=(Object)json_decode(file_get_contents("php://input"));
    $sql="select distinct numero from estugrupos";
    $sql.=" where asignacion='$datos->asignacion'";
    $sql.=" and nivel='$datos->nivel'";
    if(!isset($datos->year))
    $sql.=" and year=year(curdate())";
    else
    $sql.=" and year='$datos->year'";
    $sql.=" order by numero";
   // echo json_encode($sql);exit(0);
    $result=$mysqli->query($sql);
    $resultados=$result->fetch_all(MYSQLI_ASSOC);
    echo json_encode($resultados);
   
    $mysqli->close();