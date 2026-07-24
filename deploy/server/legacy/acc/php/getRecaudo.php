<?php
    require_once("headers.php");
    require_once("datos_conexion.php");
    
	
	$dataString = file_get_contents('php://input');
	$data = json_decode($dataString);	
	$identificacion=$data->identificacion;
	
	
	$sql="Select * from recaudo";
	$sql.=" where to_days(fecha_hora)=to_days(curdate())";

  
	$datos=$mysqli->query($sql)->fetch_all(MYSQLI_ASSOC);
	echo json_encode($datos);
	
	$mysqli->close();
?>