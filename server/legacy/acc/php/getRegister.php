<?php
    require_once("headers.php");
    require_once("datos_conexion.php");
    
	
	$dataString = file_get_contents('php://input');
	$data = json_decode($dataString);	
	
    // Safely access property using the null coalescing operator
	$identificacion = $data->identificacion ?? '';
	
	
	$sql="Select * from usuarios";
	$sql.=" where identificacion='$identificacion'";

   
	$datos=$mysqli->query($sql)->fetch_all(MYSQLI_ASSOC);
	echo json_encode($datos);
	
	$mysqli->close();
?>