<?php
	require_once("headers.php");
    require_once("datos_conexion.php");
    $mysqli=new mysqli($host,$user,$pass,$database);
	
	$dataString = file_get_contents('php://input');
	$data = json_decode($dataString);
	
    // Safely access property using the null coalescing operator
	$identificacion = $data->identificacion ?? '';
	
    
	$sql="Select estudiante from estugrupos";
	$sql.=" where estudiante='$identificacion'";
	$sql.=" and year=year(curdate())";
//	 echo json_encode(array("sql"=>$sql)); exit(0);  
	$result=$mysqli->query($sql);
	$fila=$result->fetch_assoc();    
	$datos=[];
	if ($result->num_rows==1)
		$datos=array("verificado"=>true);
		else
	   $datos=array("verificado"=>false);
	  echo json_encode($datos);
	$result->free_result();
	$mysqli->close();	
?>