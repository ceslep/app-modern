<?php
    require_once("headers.php");
    require_once("datosConexion.php");
    $sql="select identificacion,nombres,photoURL,registerat from registrar";
   
    $result=$mysqli->query($sql);
    $data=$result->fetch_ALL(MYSQLI_ASSOC);
    echo json_encode($data);
    $result->free();
    $mysqli->close();
