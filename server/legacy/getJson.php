<?php



    header("Access-Control-Allow-Origin: *");
    require_once("datos_conexion.php");
    $mysqli=new mysqli($host,$user,$pass,$database);
	
    $mysqli->query("SET NAMES utf8");
    $mysqli->set_charset('utf8');
    

	$sql="Select * from notas limit 1";
	
    $datos=$mysqli->query($sql)->fetch_assoc();
					
    echo json_encode($datos);
	
    $mysqli->close();
