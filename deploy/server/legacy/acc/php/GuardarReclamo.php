<?php
    require_once("headers.php");
    require_once("datos_conexion.php");

    $mysqli = new mysqli($host, $user,$pass, $database);

    $datos=json_decode(file_get_contents("php://input"));

    //get all keys of a json
    
    $keys=sprintf("(%s)",implode(",",array_keys((array)$datos)));

    //get all values of a json
    $values=array_values((array)$datos);
    

    $values=array_map(function($value){
        return sprintf("'%s'",$value);
    },(array)$values);
    
    
    $values = sprintf("(%s)",implode(",",array_values((array)$values)));


    $sql = "REPLACE INTO reclamo $keys VALUES $values";  
    
    if ($mysqli->query($sql))
        $datos=array("mensaje"=>"ok","sql"=>$sql);
    else
        $datos=array("mensaje"=>"error","sql"=>$sql);
    
    $mysqli->close();    
    echo json_encode($datos);
    

    

    
