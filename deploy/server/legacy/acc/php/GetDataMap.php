<?php
//	header("Access-Control-Allow-Origin: *");
    require_once("headers.php");
    require_once("datos_conexion.php");
    $mysqli=new mysqli($host,$user,$pass,$database);	
	$mysqli->set_charset("utf8");
	$dataString = file_get_contents('php://input');
	$data = json_decode($dataString);	
	$sql="Select distinct coords from log limit 5 ";
	$resultado=$mysqli->query($sql);
	$datos=$resultado->fetch_all(MYSQLI_ASSOC);
	echo json_encode($datos);
	$resultado->free();
	$mysqli->close();
?>