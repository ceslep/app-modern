<?php
    
    header("Access-Control-Allow-Origin: *");
    require_once("datos_conexion.php");
    $mysqli=new mysqli($host,$user,$pass,$database);
	$datos=(object)json_decode(file_get_contents("php://input"));
    $mysqli->query("SET NAMES utf8");
    $mysqli->set_charset('utf8');


    
    
    $datos = (object)json_decode(file_get_contents("php://input"));
	
    $sql = "SELECT MAX(codigo)+1 as codigo FROM estugrupos";
    
    //echo json_encode(array("sql"=>$sql));exit(0);
	$result = $mysqli->query($sql);
    $datos = array();
    $codigo= $result->fetch_assoc()['codigo'];
    
	
    echo $codigo;
	$result->free();
    $mysqli->close();
