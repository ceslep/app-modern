<?php
    require_once("headers.php");
    require_once("datosConexion.php");
    $sql="select * from registrar";
    $estudiante=$datos->estudiante??"";
    $sql.=" where identificacion='$estudiante' and identificacion<>''"; 
    $result=$mysqli->query($sql);
    $data=$result->fetch_ALL(MYSQLI_ASSOC);
    echo json_encode($data);
    $result->free();
    $mysqli->close();
