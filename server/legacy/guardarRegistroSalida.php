<?php
    require_once("headers.php");
    require("datos_conexion.php");
    $datos=json_decode(file_get_contents("php://input"));
    $mysqli = new mysqli($host,$user,$pass,$database);
    $sql="update registroIngresos set horaSalida=curtime() where id='$datos->id'";
    
    $mysqli->query($sql);
    echo json_encode(["msg"=>"exito"]);
    
    $mysqli->close();