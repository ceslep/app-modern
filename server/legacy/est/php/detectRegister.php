<?php
    require_once("headers.php");
    require_once("datosConexion.php");
    $sql="select * from registrar";
    $identificacion=$datos->identificacion??"";
    $sql.=" where identificacion='$identificacion'";
    
    $result=$mysqli->query($sql);
    if($result->num_rows>0)
    
        $data=array("encontrado"=>"si");
    
    else
    
    $data=array("encontrado"=>"no");

    echo json_encode($data);
    $result->free();
    $mysqli->close();

    

    