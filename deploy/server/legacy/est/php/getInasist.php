<?php
    require_once("headers.php");
    require_once("datosConexion.php");
    //$datos->estudiante="1054922378";
    $sql="Select * from inasistencia
        where estudiante='$datos->estudiante' and year=year(curdate()) 
        order by fecha desc
    ";
    //echo json_encode(array("sql"=>$sql));exit(0);
    $result=$mysqli->query($sql);
    $data=$result->fetch_ALL(MYSQLI_ASSOC);
    echo json_encode($data);
    $result->free();
    $mysqli->close();
    
