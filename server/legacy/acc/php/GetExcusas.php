<?php
//	header("Access-Control-Allow-Origin: *");
    require_once("headers.php");
    require_once("datos_conexion.php");
    $mysqli=new mysqli($host,$user,$pass,$database);	
	$mysqli->set_charset("utf8");
	$dataString = file_get_contents('php://input');
	$data = json_decode($dataString);	
	
    // Safely access properties using the null coalescing operator
	$estudiante = $data->estudiante ?? '';
	$periodo = $data->periodo ?? '';

	
	
	$sql="Select count(ind) as total from excusas";
	$sql.=" where estudiante='$estudiante'";
	$sql.=" and periodo='$periodo'";
	$sql.=" and excusas.year=year(curdate())";
	
	$resultado=$mysqli->query($sql);
	$totalExcusas=$resultado->fetch_assoc()['total'];
	$datos=[];
	if ($totalExcusas!=0){
	$sql="Select * from excusas";
	$sql.=" where estudiante='$estudiante'";
	$sql.=" and excusas.year=year(curdate())";
	$sql.=" order by excusas.fechahora desc";
	//echo json_encode($sql);exit(0);
	if($resultadoexcusas=$mysqli->query($sql))
	while($dato=$resultadoexcusas->fetch_assoc()) 
		
		$datos[]=$dato;
	
	else {
		$datos=array("estado"=>"error","mensaje"=>$mysqli->error,"sql"=>$sql);
		exit(0);
	}
	}
	
	$datos=array("total"=>$totalExcusas,"excusas"=>$datos);
	echo json_encode($datos);
	$resultadoexcusas->free();
	$resultado->free();
	$mysqli->close();
?>