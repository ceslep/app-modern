<?php
	require_once("headers.php");
    require_once("datos_conexion.php");
    $mysqli=new mysqli($host,$user,$pass,$database);
	
	$dataString = file_get_contents('php://input');
	$data = json_decode($dataString);
	
    // Safely access property using the null coalescing operator
	$identificacion = $data->identificacion ?? '';
	
	
	
    $mysqli->query("SET NAMES utf8");
    $mysqli->set_charset('utf8');
	$sql="Select identificacion from registrar where identificacion='$identificacion'";

	// echo json_encode(array("sql"=>$sql)); exit(0);  
	$result=$mysqli->query($sql);
	$fila=$result->fetch_assoc();    
	$datos=array();
	if ($result->num_rows==1)
		
		
		  $datos=array("registrado"=>"ok");
		
		else
		  $datos=array("registrado"=>"no");
	  echo json_encode($datos);
	$result->free_result();
	$mysqli->close();	
?>